import { NextRequest, NextResponse } from 'next/server'
import { createTeam, getTeams, saveTeams } from '@/lib/data/teams'

export async function GET() {
  return NextResponse.json(getTeams())
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const team = createTeam(name.trim())
  return NextResponse.json(team)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const teams = getTeams().filter((t) => t.id !== id)
  if (teams.length === 0) return NextResponse.json({ error: 'Cannot delete the only team' }, { status: 400 })
  saveTeams(teams)
  return NextResponse.json({ ok: true })
}
