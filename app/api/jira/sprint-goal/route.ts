import { NextResponse } from 'next/server'
import { jiraPut } from '@/lib/jira/client'
import { getJiraCache, saveJiraCache } from '@/lib/data/jira-cache'

export async function PUT(req: Request) {
  if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured' }, { status: 400 })
  }

  try {
    const { sprintId, goal } = await req.json()
    if (!sprintId) return NextResponse.json({ error: 'sprintId required' }, { status: 400 })

    // Jira requires `name` to be present in the PUT body
    const cache = getJiraCache()
    const sprint = cache.sprints.find((s) => s.id === sprintId)
    if (!sprint) return NextResponse.json({ error: 'Sprint not found in cache' }, { status: 404 })

    await jiraPut(`/rest/agile/1.0/sprint/${sprintId}`, {
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate ? `${sprint.startDate}T00:00:00.000Z` : undefined,
      endDate: sprint.endDate ? `${sprint.endDate}T00:00:00.000Z` : undefined,
      goal: goal ?? '',
    })

    // Update local cache so the dashboard reflects the change immediately
    sprint.goal = goal ?? undefined
    saveJiraCache(cache)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
