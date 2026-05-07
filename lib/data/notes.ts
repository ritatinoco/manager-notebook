import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getNotesPath() {
  return path.join(teamDataDir(getActiveTeamId()), 'notes.json')
}

export interface ActionItem {
  id: string
  text: string
  done: boolean
  createdAt: string
}

export interface NoteBlock {
  id: string
  title: string
  content: string
  createdAt: string
}

export interface NotesData {
  actionItems: ActionItem[]
  notes: NoteBlock[]
}

const DEFAULT_NOTES: NotesData = {
  actionItems: [],
  notes: [],
}

export function getNotes(): NotesData {
  const notesPath = getNotesPath()
  if (!fs.existsSync(notesPath)) return DEFAULT_NOTES
  return JSON.parse(fs.readFileSync(notesPath, 'utf8')) as NotesData
}

export function saveNotes(data: NotesData): void {
  const notesPath = getNotesPath()
  const dir = path.dirname(notesPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(notesPath, JSON.stringify(data, null, 2))
}
