import { NextResponse } from 'next/server'
import { getVMPriorityOrder, saveVMPriorityOrder } from '@/lib/data/roadmap-vm-priority'

export async function GET() {
  return NextResponse.json({ order: getVMPriorityOrder() })
}

export async function POST(req: Request) {
  const { order } = (await req.json()) as { order: string[] }
  saveVMPriorityOrder(order ?? [])
  return NextResponse.json({ ok: true })
}
