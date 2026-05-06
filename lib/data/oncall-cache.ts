import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'
import type { OnCallRow } from '@/app/api/oncall/route'

function getCachePath() {
  return path.join(teamDataDir(getActiveTeamId()), 'oncall-cache.json')
}

export interface OnCallCache {
  fetchedAt: string
  month: string
  year: number
  rows: OnCallRow[]
}

export function getOnCallCache(): OnCallCache | null {
  const cachePath = getCachePath()
  if (!fs.existsSync(cachePath)) return null
  return JSON.parse(fs.readFileSync(cachePath, 'utf8')) as OnCallCache
}

export function saveOnCallCache(cache: OnCallCache): void {
  const cachePath = getCachePath()
  const dir = path.dirname(cachePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
}
