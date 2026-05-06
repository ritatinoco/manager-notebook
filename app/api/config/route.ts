import { NextRequest, NextResponse } from 'next/server'
import { getConfig, saveConfig } from '@/lib/data/config'

export async function GET() {
  return NextResponse.json(getConfig())
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const config = getConfig()

  if (body.sp_per_day !== undefined) config.sp_per_day = body.sp_per_day
  if (body.allocations) {
    const allocs = body.allocations
    const keys = ['features', 'discovery', 'risk', 'debts', 'sre', 'support'] as const
    const sum = keys.reduce((s, k) => s + (allocs[k] ?? 0), 0)
    if (Math.abs(sum - 1.0) > 0.001) {
      return NextResponse.json({ error: 'Allocations must sum to 100%' }, { status: 400 })
    }
    config.allocations = allocs
  }
  if (body.team_members) config.team_members = body.team_members
  if (body.local_holidays !== undefined) config.local_holidays = body.local_holidays
  if (body.bootstrapped !== undefined) config.bootstrapped = body.bootstrapped
  if (body.team_avg_velocity !== undefined) config.team_avg_velocity = body.team_avg_velocity
  if (body.manager_profile !== undefined) config.manager_profile = { ...config.manager_profile, ...body.manager_profile }

  saveConfig(config)
  return NextResponse.json(config)
}
