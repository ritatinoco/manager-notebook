import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const FILE = join(process.cwd(), 'data/sprint-comments.json')

function read(): Record<string, string> {
  try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch { return {} }
}

export async function GET() {
  return NextResponse.json(read())
}

export async function POST(req: Request) {
  const { sprint, comment } = await req.json()
  const data = read()
  if (comment) data[sprint] = comment
  else delete data[sprint]
  writeFileSync(FILE, JSON.stringify(data, null, 2))
  return NextResponse.json({ ok: true })
}
