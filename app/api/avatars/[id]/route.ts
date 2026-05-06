import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getActiveTeamId, teamDataDir } from '@/lib/data/teams'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid avatar id' }, { status: 400 })
  }

  const filePath = path.join(teamDataDir(getActiveTeamId()), 'avatars', `${id}.png`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const buf = fs.readFileSync(filePath)
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
