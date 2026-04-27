import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getPath() {
  return path.join(teamDataDir(getActiveTeamId()), 'roadmap-vm-priority.json')
}

export function getVMPriorityOrder(): string[] {
  const p = getPath()
  if (!fs.existsSync(p)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { order?: string[] }
    return raw.order ?? []
  } catch {
    return []
  }
}

export function saveVMPriorityOrder(order: string[]): void {
  const p = getPath()
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify({ order }, null, 2))
}
