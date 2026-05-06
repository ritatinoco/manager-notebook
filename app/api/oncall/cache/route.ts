import { NextResponse } from 'next/server'
import { getOnCallCache } from '@/lib/data/oncall-cache'

export async function GET() {
  const cache = getOnCallCache()
  if (!cache) return NextResponse.json(null)
  return NextResponse.json(cache)
}
