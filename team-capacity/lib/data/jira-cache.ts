import path from 'path'
import fs from 'fs'

const CACHE_PATH = path.join(process.cwd(), 'data', 'jira-cache.json')

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
}

export interface JiraCache {
  syncedAt: string | null
  boardId: number | null
  sprints: SprintCache[]
}

const EMPTY: JiraCache = { syncedAt: null, boardId: null, sprints: [] }

function ensureDataDir() {
  const dir = path.dirname(CACHE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getJiraCache(): JiraCache {
  ensureDataDir()
  if (!fs.existsSync(CACHE_PATH)) return EMPTY
  return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as JiraCache
}

export function saveJiraCache(cache: JiraCache): void {
  ensureDataDir()
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
}
