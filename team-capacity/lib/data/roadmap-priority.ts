import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getPriorityPath() {
  return path.join(teamDataDir(getActiveTeamId()), 'roadmap-priority.json')
}

export function getPriorityOrder(): string[] {
  const p = getPriorityPath()
  if (!fs.existsSync(p)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { order?: string[] }
    return raw.order ?? []
  } catch {
    return []
  }
}

export function savePriorityOrder(order: string[]): void {
  const p = getPriorityPath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify({ order }, null, 2))
}
