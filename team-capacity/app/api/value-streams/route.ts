import { NextResponse } from 'next/server'
import { getValueStreamConfig, saveValueStreamConfig } from '@/lib/data/value-streams'
import type { ValueStreamConfig } from '@/lib/data/value-streams'

export async function GET() {
  return NextResponse.json(getValueStreamConfig())
}

export async function POST(req: Request) {
  const body = (await req.json()) as ValueStreamConfig
  saveValueStreamConfig({
    streams: body.streams ?? [],
    assignments: body.assignments ?? {},
  })
  return NextResponse.json({ ok: true })
}
