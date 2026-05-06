import { NextResponse } from 'next/server'
import { getPriorityOrder, savePriorityOrder } from '@/lib/data/roadmap-priority'

export async function GET() {
  return NextResponse.json({ order: getPriorityOrder() })
}

export async function POST(req: Request) {
  const { order } = (await req.json()) as { order: string[] }
  savePriorityOrder(order ?? [])
  return NextResponse.json({ ok: true })
}
