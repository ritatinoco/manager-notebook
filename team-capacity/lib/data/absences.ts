import path from 'path'
import fs from 'fs'

const ABSENCES_PATH = path.join(process.cwd(), 'data', 'absences.json')

// Shape: { [memberName]: { [sprintName]: daysOff } }
export type AbsencesData = Record<string, Record<string, number>>

function ensureDataDir() {
  const dir = path.dirname(ABSENCES_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getAbsences(): AbsencesData {
  ensureDataDir()
  if (!fs.existsSync(ABSENCES_PATH)) return {}
  return JSON.parse(fs.readFileSync(ABSENCES_PATH, 'utf8')) as AbsencesData
}

export function setAbsence(memberName: string, sprintName: string, daysOff: number): void {
  ensureDataDir()
  const data = getAbsences()
  if (!data[memberName]) data[memberName] = {}
  if (daysOff === 0) {
    delete data[memberName][sprintName]
  } else {
    data[memberName][sprintName] = daysOff
  }
  fs.writeFileSync(ABSENCES_PATH, JSON.stringify(data, null, 2))
}

export function getDaysOff(memberName: string, sprintName: string, absences: AbsencesData): number {
  return absences[memberName]?.[sprintName] ?? 0
}
