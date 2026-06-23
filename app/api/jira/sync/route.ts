import { NextResponse } from 'next/server'
import { getRARBoardId, getBoardSprints } from '@/lib/jira/sprints'
import { getSprintVelocity, getBoardVelocity } from '@/lib/jira/velocity'
import { getJiraCache, saveJiraCache } from '@/lib/data/jira-cache'
import type { SprintCache } from '@/lib/data/jira-cache'

function extractQ(name: string): string | null {
  return name.match(/(\d{2}\.Q\d)/)?.[1] ?? null
}

export async function POST() {
  if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
    return NextResponse.json(
      { error: 'Jira not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.local' },
      { status: 400 }
    )
  }

  try {
    const boardId = await getRARBoardId()
    const [allSprints, boardVelocity] = await Promise.all([
      getBoardSprints(boardId),
      getBoardVelocity(boardId),
    ])

    // Keep last 10 closed/active sprints + all future sprints
    const futureSprints = allSprints.filter((s) => s.state === 'future')
    const pastSprints = allSprints.filter((s) => s.state !== 'future').slice(-10)
    const jiraSprints = [...pastSprints, ...futureSprints]

    // Load existing cache to skip re-fetching closed sprints that are already populated
    const existing = getJiraCache()
    const existingById = new Map(existing.sprints.map((s) => [s.id, s]))

    const syncedSprints: SprintCache[] = []

    for (const js of jiraSprints) {
      if (!js.startDate || !js.endDate) continue

      // Reuse cached data for closed sprints that already have SP data + the newer doneSP split
      const cached = existingById.get(js.id)
      if (js.state === 'closed' && cached?.syncedAsClosed && (cached.committedSP > 0 || cached.deliveredSP > 0)) {
        syncedSprints.push(cached)
        continue
      }

      let initialCommittedSP = 0
      let committedSP = 0
      let deliveredSP = 0
      let workloadByName: Record<string, number> = {}

      let doneSP = 0
      let waitingForReleaseSP = 0
      if (js.state !== 'future') {
        const velocity = await getSprintVelocity(js.id, boardId, boardVelocity.get(js.id))
        initialCommittedSP = velocity.initialCommittedSP
        committedSP = velocity.committedSP
        deliveredSP = velocity.deliveredSP
        doneSP = velocity.doneSP
        waitingForReleaseSP = velocity.waitingForReleaseSP
        workloadByName = velocity.workloadByName
      }

      syncedSprints.push({
        id: js.id,
        name: js.name,
        state: js.state,
        startDate: js.startDate.slice(0, 10),
        endDate: js.endDate.slice(0, 10),
        goal: js.goal ?? undefined,
        initialCommittedSP,
        committedSP,
        deliveredSP,
        doneSP,
        waitingForReleaseSP,
        workloadByName,
        ...(js.state === 'closed' && { syncedAsClosed: true }),
      })
    }

    // Keep bootstrapped sprints for quarters not yet covered by real Jira data
    const realQuarters = new Set(syncedSprints.map((s) => extractQ(s.name)).filter(Boolean))
    const bootstrappedToKeep = existing.sprints
      .filter((s) => s.bootstrapped)
      .filter((s) => { const q = extractQ(s.name); return q && !realQuarters.has(q) })

    const syncedAt = new Date().toISOString()
    saveJiraCache({ syncedAt, boardId, sprints: [...syncedSprints, ...bootstrappedToKeep] })

    const closedWithDelivery = syncedSprints.filter((s) => s.state === 'closed' && s.deliveredSP > 0)
    const avgDeliveredSP = closedWithDelivery.length > 0
      ? Math.round(closedWithDelivery.reduce((s, sp) => s + sp.deliveredSP, 0) / closedWithDelivery.length)
      : 0

    return NextResponse.json({
      ok: true,
      boardId,
      sprintCount: syncedSprints.length,
      syncedAt,
      avgDeliveredSP,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
