import { NextResponse } from 'next/server'
import { getRARBoardId, getBoardSprints } from '@/lib/jira/sprints'
import { getSprintVelocity, getBoardVelocity } from '@/lib/jira/velocity'
import { getJiraCache, saveJiraCache } from '@/lib/data/jira-cache'
import type { SprintCache } from '@/lib/data/jira-cache'

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

      // Reuse cached data for closed sprints that already have SP data
      const cached = existingById.get(js.id)
      if (js.state === 'closed' && cached && (cached.committedSP > 0 || cached.deliveredSP > 0)) {
        syncedSprints.push({ ...cached, state: js.state })
        continue
      }

      let initialCommittedSP = 0
      let committedSP = 0
      let deliveredSP = 0
      let workloadByName: Record<string, number> = {}

      if (js.state !== 'future') {
        const velocity = await getSprintVelocity(js.id, boardId, boardVelocity.get(js.id))
        initialCommittedSP = velocity.initialCommittedSP
        committedSP = velocity.committedSP
        deliveredSP = velocity.deliveredSP
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
        workloadByName,
      })
    }

    const syncedAt = new Date().toISOString()
    saveJiraCache({ syncedAt, boardId, sprints: syncedSprints })

    return NextResponse.json({
      ok: true,
      boardId,
      sprintCount: syncedSprints.length,
      syncedAt,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
