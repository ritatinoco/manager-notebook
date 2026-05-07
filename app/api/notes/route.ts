import { NextResponse } from 'next/server'
import { getNotes, saveNotes } from '@/lib/data/notes'

export async function GET() {
  return NextResponse.json(getNotes())
}

export async function PUT(req: Request) {
  const body = await req.json()
  saveNotes(body)
  return NextResponse.json({ ok: true })
}
