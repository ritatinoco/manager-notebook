import { NextRequest, NextResponse } from 'next/server'
import { getTeams, getActiveTeamId, setActiveTeamId, renameTeam } from '@/lib/data/teams'

export async function GET() {
  return NextResponse.json({
    activeTeamId: getActiveTeamId(),
    teams: getTeams(),
  })
}

export async function POST(req: NextRequest) {
  const { teamId } = await req.json()
  const teams = getTeams()
  if (!teams.find((t) => t.id === teamId)) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }
  setActiveTeamId(teamId)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { id, name } = await req.json()
  if (!id || !name?.trim()) return NextResponse.json({ error: 'id and name required' }, { status: 400 })
  const teams = getTeams()
  if (!teams.find((t) => t.id === id)) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  renameTeam(id, name.trim())
  return NextResponse.json({ ok: true })
}
