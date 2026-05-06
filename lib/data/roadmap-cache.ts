import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getCachePath() {
  return path.join(teamDataDir(getActiveTeamId()), 'roadmap-cache.json')
}

export interface EpicCache {
  key: string
  summary: string
  status: string
  targetStart: string | null
  targetEnd: string | null
  resolvedAt: string | null
}

export interface VMCache {
  key: string
  summary: string
  status: string
  targetStart: string | null
  targetEnd: string | null
  recentUpdate: string | null
  resolvedAt: string | null
  epics: EpicCache[]
}

export interface InitiativeCache {
  key: string
  summary: string
  status: string
  targetStart: string | null
  targetEnd: string | null
  resolvedAt: string | null
  valueStream: string | null
  vms: VMCache[]
}

export interface RoadmapCache {
  syncedAt: string | null
  initiatives: InitiativeCache[]
  orphanVMs: VMCache[]
}

const EMPTY: RoadmapCache = { syncedAt: null, initiatives: [], orphanVMs: [] }

export function getRoadmapCache(): RoadmapCache {
  const cachePath = getCachePath()
  const dir = path.dirname(cachePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(cachePath)) return EMPTY
  const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as Partial<RoadmapCache>
  // Handle old cache shape (had `vms` top-level)
  if (!raw.initiatives && !raw.orphanVMs) return EMPTY
  return { syncedAt: raw.syncedAt ?? null, initiatives: raw.initiatives ?? [], orphanVMs: raw.orphanVMs ?? [] }
}

export function saveRoadmapCache(cache: RoadmapCache): void {
  const cachePath = getCachePath()
  const dir = path.dirname(cachePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
}
