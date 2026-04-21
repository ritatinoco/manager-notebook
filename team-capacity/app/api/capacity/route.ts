import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/data/config'
import { getAbsences } from '@/lib/data/absences'
import { getJiraCache } from '@/lib/data/jira-cache'
import { buildCapacityMatrix, getTeamMetrics } from '@/lib/capacity/calculations'

// Working days per sprint (can be overridden in config.json)
const DEFAULT_WORKING_DAYS: Record<string, number> = {}

export async function GET() {
  const config = getConfig()
  const absences = getAbsences()
  const jiraCache = getJiraCache()

  const workingDaysMap: Record<string, number> = {
    ...DEFAULT_WORKING_DAYS,
    ...(config as unknown as { workingDaysMap?: Record<string, number> }).workingDaysMap,
  }

  const matrix = buildCapacityMatrix(jiraCache.sprints, config, absences, workingDaysMap)
  const teamMetrics = getTeamMetrics(matrix)

  return NextResponse.json({
    matrix,
    teamMetrics,
    config,
    syncedAt: jiraCache.syncedAt,
    hasSprints: jiraCache.sprints.length > 0,
  })
}
