import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/data/config'
import { getOnCallShifts } from '@/lib/oncall/rootly'
import { isBusinessDay } from '@/lib/holidays'
import { saveOnCallCache } from '@/lib/data/oncall-cache'

const COUNTRY_NAMES: Record<string, string> = {
  PT: 'Portugal',
  UK: 'United Kingdom',
  US: 'United States',
  ES: 'Spain',
}

export interface OnCallRow {
  employeeNumber: number | string
  firstName: string
  lastName: string
  department: string
  country: string
  month: string
  weekdayDays: number
  weekendDays: number
  supervisor: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const now = new Date()
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))

  const token = process.env.ROOTLY_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'ROOTLY_TOKEN is not set. Add it to .env.local.' },
      { status: 500 }
    )
  }

  const config = getConfig()
  if (!config.oncall_schedule_id) {
    return NextResponse.json(
      { error: 'oncall_schedule_id is not configured. Add it to your team config.json.' },
      { status: 400 }
    )
  }

  // Use UTC to avoid timezone-offset errors when converting to ISO date strings
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 1)) // exclusive — first day of next month
  const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEndStr = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) // last day inclusive

  try {
    const data = await getOnCallShifts(token, config.oncall_schedule_id, monthStart, monthEnd)

    // Build user id → name map
    const userIdToName = new Map<string, string>()
    for (const u of data.included) {
      if (u.type === 'users') userIdToName.set(u.id, u.attributes.name)
    }

    // Count days on-call per member
    const memberDays: Record<string, { weekdays: number; weekends: number }> = {}

    for (const shift of data.data) {
      const userName = userIdToName.get(shift.relationships.user.data.id)
      if (!userName) continue

      const member = config.team_members.find((m) => m.name === userName)
      if (!member) continue

      const startStr = new Date(shift.attributes.starts_at).toISOString().slice(0, 10)
      const endStr = new Date(shift.attributes.ends_at).toISOString().slice(0, 10)

      // Skip zero-duration shifts
      if (startStr === endStr) continue

      if (!memberDays[member.name]) memberDays[member.name] = { weekdays: 0, weekends: 0 }

      const country = member.country ?? 'PT'
      let cursor = startStr
      while (cursor < endStr) {
        if (cursor >= monthStartStr && cursor <= monthEndStr) {
          if (isBusinessDay(cursor, country)) {
            memberDays[member.name].weekdays++
          } else {
            memberDays[member.name].weekends++
          }
        }
        // advance cursor by one day
        const d = new Date(cursor + 'T12:00:00Z')
        d.setUTCDate(d.getUTCDate() + 1)
        cursor = d.toISOString().slice(0, 10)
      }
    }

    const monthName = monthStart.toLocaleString('en-US', { month: 'long' })
    const department = config.oncall_department ?? ''

    const rows: OnCallRow[] = config.team_members
      .filter((m) => memberDays[m.name])
      .map((m) => {
        const parts = m.name.split(' ')
        const days = memberDays[m.name]
        return {
          employeeNumber: m.employee_number ?? '',
          firstName: parts[0],
          lastName: parts[parts.length - 1],
          department,
          country: COUNTRY_NAMES[m.country ?? 'PT'] ?? m.country ?? '',
          month: monthName,
          weekdayDays: days.weekdays,
          weekendDays: days.weekends,
          supervisor: m.supervisor ?? config.oncall_supervisor ?? '',
        }
      })

    const fetchedAt = new Date().toISOString()
    saveOnCallCache({ fetchedAt, month: monthName, year, rows })

    return NextResponse.json({ rows, month: monthName, year, fetchedAt })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
