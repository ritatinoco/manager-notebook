import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getAbsencesPath() {
  return path.join(teamDataDir(getActiveTeamId()), 'absences.json')
}

// Shape: { [memberName]: { [sprintName]: daysOff } }
export type AbsencesData = Record<string, Record<string, number>>

export function getAbsences(): AbsencesData {
  const absencesPath = getAbsencesPath()
  const dir = path.dirname(absencesPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(absencesPath)) return {}
  return JSON.parse(fs.readFileSync(absencesPath, 'utf8')) as AbsencesData
}

export function setAbsence(memberName: string, sprintName: string, daysOff: number): void {
  const absencesPath = getAbsencesPath()
  const dir = path.dirname(absencesPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const data = getAbsences()
  if (!data[memberName]) data[memberName] = {}
  if (daysOff === 0) {
    delete data[memberName][sprintName]
  } else {
    data[memberName][sprintName] = daysOff
  }
  fs.writeFileSync(absencesPath, JSON.stringify(data, null, 2))
}

export function getDaysOff(memberName: string, sprintName: string, absences: AbsencesData): number {
  return absences[memberName]?.[sprintName] ?? 0
}
