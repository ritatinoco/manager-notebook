import type { Config, MemberConfig } from '@/lib/data/config'
import type { AbsencesData } from '@/lib/data/absences'
import type { SprintCache } from '@/lib/data/jira-cache'
import { getHolidaysInSprintForCountry } from '@/lib/holidays'
import type { HolidayInfo } from '@/lib/holidays'

export interface MemberSprintCapacity {
  memberName: string
  spPerDay: number
  daysOff: number
  holidayDays: number
  availableDays: number
  capacitySP: number
}

export interface AllocationBreakdown {
  features: number
  discovery: number
  risk: number
  debts: number
  sre: number
  support: number
}

export interface SprintCapacity {
  sprint: SprintCache
  members: MemberSprintCapacity[]
  totalDays: number
  totalSP: number
  allocations: AllocationBreakdown
  suggestedSP: number
  workingDays: number
  holidays: HolidayInfo[]
}

export type { HolidayInfo }

export interface TeamMetrics {
  overCommitPct: number
  underDeliverPct: number
  deliverGteCommitPct: number
  avgVelocity: number
  completedSprints: number
}

export function buildCapacityMatrix(
  sprints: SprintCache[],
  config: Config,
  absences: AbsencesData,
  workingDaysMap: Record<string, number>
): SprintCapacity[] {
  return sprints.map((sprint) => {
    const workingDays = workingDaysMap[sprint.name] ?? 10

    const memberHolidayMap = new Map<string, HolidayInfo[]>()
    const members: MemberSprintCapacity[] = config.team_members.map((m) => {
      const memberHolidays = sprint.startDate && sprint.endDate
        ? getHolidaysInSprintForCountry(
            sprint.startDate,
            sprint.endDate,
            m.country ?? 'PT',
            m.country === 'PT' || !m.country ? (config.local_holidays ?? []) : undefined
          )
        : []
      memberHolidayMap.set(m.name, memberHolidays)
      const daysOff = absences[m.name]?.[sprint.name] ?? 0
      const availableDays = Math.max(0, workingDays - daysOff - memberHolidays.length)
      const spPerDay = m.sp_per_day ?? config.sp_per_day
      return {
        memberName: m.name,
        spPerDay,
        daysOff,
        holidayDays: memberHolidays.length,
        availableDays,
        capacitySP: round(availableDays * spPerDay),
      }
    })

    // Union of all member holidays for display in sprint headers
    const holidayByDate = new Map<string, string>()
    for (const hs of memberHolidayMap.values()) {
      for (const h of hs) holidayByDate.set(h.date, h.name)
    }
    const holidays: HolidayInfo[] = [...holidayByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, name]) => ({ date, name }))

    const totalDays = members.reduce((s, m) => s + m.availableDays, 0)
    const totalSP = round(members.reduce((s, m) => s + m.capacitySP, 0))
    const allocations = getAllocationBreakdown(totalSP, config)
    const suggestedSP = round(allocations.features + allocations.discovery + allocations.debts)

    return { sprint, members, totalDays, totalSP, allocations, suggestedSP, workingDays, holidays }
  })
}

export function getAllocationBreakdown(totalSP: number, config: Config): AllocationBreakdown {
  return {
    features: round(totalSP * config.allocations.features),
    discovery: round(totalSP * config.allocations.discovery),
    risk: round(totalSP * config.allocations.risk),
    debts: round(totalSP * config.allocations.debts),
    sre: round(totalSP * config.allocations.sre),
    support: round(totalSP * config.allocations.support),
  }
}

export function getTeamMetrics(matrix: SprintCapacity[]): TeamMetrics {
  // Commitment metrics: only closed sprints with actual initial commitment
  const completed = matrix.filter((sc) => sc.sprint.state === 'closed' && sc.sprint.initialCommittedSP > 0)

  const overCommit = completed.filter((sc) => sc.sprint.initialCommittedSP > sc.totalSP).length
  const underDeliver = completed.filter((sc) => sc.sprint.deliveredSP < sc.sprint.initialCommittedSP).length
  const deliverGte = completed.filter((sc) => sc.sprint.deliveredSP >= sc.sprint.initialCommittedSP).length

  // Avg velocity: all sprints in the quarter (including future), based on suggested SP
  const avgVelocity = matrix.length > 0
    ? round(matrix.reduce((s, sc) => s + sc.suggestedSP, 0) / matrix.length)
    : 0

  if (completed.length === 0) {
    return { overCommitPct: 0, underDeliverPct: 0, deliverGteCommitPct: 0, avgVelocity, completedSprints: 0 }
  }

  return {
    overCommitPct: round(overCommit / completed.length),
    underDeliverPct: round(underDeliver / completed.length),
    deliverGteCommitPct: round(deliverGte / completed.length),
    avgVelocity: round(avgVelocity),
    completedSprints: completed.length,
  }
}

function round(n: number, decimals = 1): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}
