import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getCachePath() {
  return path.join(teamDataDir(getActiveTeamId()), 'jira-cache.json')
}

export interface SprintCache {
  id: number
  name: string
  state: 'active' | 'closed' | 'future'
  startDate: string
  endDate: string
  goal?: string
  initialCommittedSP: number
  committedSP: number
  deliveredSP: number
  workloadByName: Record<string, number>
  bootstrapped?: boolean
}

export interface JiraCache {
  syncedAt: string | null
  boardId: number | null
  sprints: SprintCache[]
}

const EMPTY: JiraCache = { syncedAt: null, boardId: null, sprints: [] }

export function getJiraCache(): JiraCache {
  const cachePath = getCachePath()
  const dir = path.dirname(cachePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(cachePath)) return EMPTY
  return JSON.parse(fs.readFileSync(cachePath, 'utf8')) as JiraCache
}

export function saveJiraCache(cache: JiraCache): void {
  const cachePath = getCachePath()
  const dir = path.dirname(cachePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
}
