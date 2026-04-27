import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/data/config'
import { getJiraCache, saveJiraCache } from '@/lib/data/jira-cache'

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function extractQ(name: string): string | null {
  return name.match(/(\d{2}\.Q\d)/)?.[1] ?? null
}

export async function GET() {
  const config = getConfig()
  return NextResponse.json({
    namePrefix: config.jira_project_key ?? '',
    sprintCount: 6,
    sprintDuration: 14,
  })
}

export async function POST(req: NextRequest) {
  const { quarter, startDate, sprintCount = 6, sprintDuration = 14, namePrefix } = await req.json()

  if (!quarter || !startDate || !namePrefix) {
    return NextResponse.json({ error: 'quarter, startDate and namePrefix are required' }, { status: 400 })
  }

  const cache = getJiraCache()

  // Remove any existing bootstrapped sprints for this quarter
  const kept = cache.sprints.filter((s) => !(s.bootstrapped && extractQ(s.name) === quarter))

  const now = Date.now()
  const newSprints = Array.from({ length: sprintCount }, (_, i) => ({
    id: -(now + i),
    name: `${namePrefix} ${quarter}.${i + 1}`,
    state: 'future' as const,
    startDate: addDays(startDate, i * sprintDuration),
    endDate: addDays(startDate, (i + 1) * sprintDuration),
    initialCommittedSP: 0,
    committedSP: 0,
    deliveredSP: 0,
    workloadByName: {},
    bootstrapped: true,
  }))

  saveJiraCache({ ...cache, sprints: [...kept, ...newSprints] })

  return NextResponse.json({ ok: true, sprints: newSprints.map((s) => s.name) })
}
