import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { getActiveTeamId, teamDataDir } from '@/lib/data/teams'

function getFile() {
  return join(teamDataDir(getActiveTeamId()), 'sprint-comments.json')
}

function read(): Record<string, string> {
  const file = getFile()
  const dir = dirname(file)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return {} }
}

export async function GET() {
  return NextResponse.json(read())
}

export async function POST(req: Request) {
  const { sprint, comment } = await req.json()
  const data = read()
  if (comment) data[sprint] = comment
  else delete data[sprint]
  writeFileSync(getFile(), JSON.stringify(data, null, 2))
  return NextResponse.json({ ok: true })
}
