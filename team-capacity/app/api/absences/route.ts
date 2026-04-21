import { NextRequest, NextResponse } from 'next/server'
import { getAbsences, setAbsence } from '@/lib/data/absences'

export async function GET() {
  return NextResponse.json(getAbsences())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { member, sprint, days } = body
  if (!member || !sprint || days === undefined) {
    return NextResponse.json({ error: 'member, sprint, days required' }, { status: 400 })
  }
  setAbsence(member, sprint, Number(days))
  return NextResponse.json({ ok: true })
}
