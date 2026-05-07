import { NextResponse } from 'next/server'
import { fetchTeamEpics, fetchVMsByKeys, fetchInitiativesByKeys, fetchDevelopmentStartDate, fetchValueStreamFieldId, fetchDetailedStatusFieldId } from '@/lib/jira/roadmap'
import { saveRoadmapCache } from '@/lib/data/roadmap-cache'
import { getActiveTeam } from '@/lib/data/teams'

export async function POST() {
  if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured. Set JIRA_BASE_URL and JIRA_API_TOKEN in .env.local' }, { status: 400 })
  }
  if (!process.env.JIRA_PM_PROJECT_KEY) {
    return NextResponse.json({ error: 'JIRA_PM_PROJECT_KEY is not set in .env.local' }, { status: 400 })
  }

  try {
    const team = getActiveTeam()
    if (!team?.name) {
      return NextResponse.json({ error: 'Active team not found' }, { status: 400 })
    }

    // 1. Fetch epics assigned to this team
    const epics = await fetchTeamEpics(team.name)

    // 2. Fetch VMs by parent keys from epics (discover Detailed Status field in parallel)
    const vmKeys = [...new Set(epics.map((e) => e.parentKey).filter(Boolean) as string[])]
    const [vmsRaw] = await Promise.all([
      fetchDetailedStatusFieldId().then((dsFieldId) => fetchVMsByKeys(vmKeys, dsFieldId)),
    ])

    // 3. Filtering helpers
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    const RESOLVED_STATUSES = new Set(['Done', 'GA'])

    function resolvedTime(resolvedAt: string | null, targetEnd: string | null): number | null {
      const date = resolvedAt ?? targetEnd
      return date ? new Date(date).getTime() : null
    }

    function isVisible(status: string, resolvedAt: string | null, targetEnd: string | null): boolean {
      if (status.toLowerCase() === 'cancelled') return false
      if (RESOLVED_STATUSES.has(status)) {
        const t = resolvedTime(resolvedAt, targetEnd)
        return t !== null && t >= cutoff
      }
      return true
    }

    // 4. Group epics under VMs
    const epicsByVM = new Map<string, typeof epics>()
    for (const epic of epics) {
      const pk = epic.parentKey ?? '__none__'
      if (!epicsByVM.has(pk)) epicsByVM.set(pk, [])
      epicsByVM.get(pk)!.push(epic)
    }

    const PAUSED_KEYWORDS = ['paused', 'on hold']

    const vmsWithEpics = vmsRaw
      .filter((vm) => isVisible(vm.status, vm.resolvedAt, vm.targetEnd))
      .map((vm) => ({
        key: vm.key,
        summary: vm.summary,
        status: vm.status,
        targetStart: vm.targetStart,
        targetEnd: vm.targetEnd,
        recentUpdate: vm.recentUpdate,
        detailedStatus: vm.detailedStatus ?? null,
        resolvedAt: vm.resolvedAt,
        assignee: vm.assignee ?? null,
        parentKey: vm.parentKey,
        epics: (epicsByVM.get(vm.key) ?? [])
          .filter((e) => isVisible(e.status, e.resolvedAt, e.targetEnd) && e.status.toLowerCase() !== 'cancelled')
          .map(({ parentKey: _pk, ...rest }) => rest),
      }))
      // Drop VMs whose only team epics were all cancelled/filtered out
      .filter((vm) => vm.epics.length > 0)

    // 5. Orphan epics (no VM parent) — split by paused
    const orphanEpicsAll = (epicsByVM.get('__none__') ?? []).filter((e) =>
      isVisible(e.status, e.resolvedAt, e.targetEnd) && e.status.toLowerCase() !== 'cancelled'
    )
    const orphanEpicsActive = orphanEpicsAll.filter((e) => !PAUSED_KEYWORDS.some((k) => e.status.toLowerCase().includes(k)))
    const orphanEpicsPaused = orphanEpicsAll.filter((e) => PAUSED_KEYWORDS.some((k) => e.status.toLowerCase().includes(k)))

    // 5b. For VMs missing targetStart, check Development transition date
    await Promise.all(
      vmsWithEpics
        .filter((vm) => !vm.targetStart && vm.key)
        .map(async (vm) => {
          const devDate = await fetchDevelopmentStartDate(vm.key)
          if (devDate) vm.targetStart = devDate
        })
    )

    // 6. Fetch initiatives by parent keys from VMs (with value stream field)
    const initiativeKeys = [...new Set(vmsWithEpics.map((v) => v.parentKey).filter(Boolean) as string[])]
    const vsFieldId = await fetchValueStreamFieldId()
    const initiativesRaw = await fetchInitiativesByKeys(initiativeKeys, vsFieldId)

    // 7. Group VMs under initiatives
    const vmsByInitiative = new Map<string, typeof vmsWithEpics>()
    for (const vm of vmsWithEpics) {
      const pk = vm.parentKey ?? '__none__'
      if (!vmsByInitiative.has(pk)) vmsByInitiative.set(pk, [])
      vmsByInitiative.get(pk)!.push(vm)
    }

    const initiatives = initiativesRaw
      .filter((ini) => isVisible(ini.status, ini.resolvedAt, ini.targetEnd))
      .map((ini) => ({
        key: ini.key,
        summary: ini.summary,
        status: ini.status,
        targetStart: ini.targetStart,
        targetEnd: ini.targetEnd,
        resolvedAt: ini.resolvedAt,
        valueStream: ini.valueStream,
        vms: (vmsByInitiative.get(ini.key) ?? []).map(({ parentKey: _pk, ...rest }) => rest),
      }))

    // 8. Orphan VMs (no initiative parent)
    const orphanVMsRaw = (vmsByInitiative.get('__none__') ?? []).map(({ parentKey: _pk, ...rest }) => rest)

    // Add synthetic VM for orphan epics
    if (orphanEpicsActive.length > 0) {
      orphanVMsRaw.push({
        key: '', summary: 'No Value Milestone', status: '',
        targetStart: null, targetEnd: null, recentUpdate: null, detailedStatus: null, resolvedAt: null, assignee: null,
        epics: orphanEpicsActive.map(({ parentKey: _pk, ...rest }) => rest),
      })
    }
    if (orphanEpicsPaused.length > 0) {
      orphanVMsRaw.push({
        key: '', summary: 'No Value Milestone', status: 'Paused',
        targetStart: null, targetEnd: null, recentUpdate: null, resolvedAt: null,
        epics: orphanEpicsPaused.map(({ parentKey: _pk, ...rest }) => rest),
      })
    }

    const syncedAt = new Date().toISOString()
    saveRoadmapCache({ syncedAt, initiatives, orphanVMs: orphanVMsRaw })

    return NextResponse.json({
      ok: true,
      initiativeCount: initiatives.length,
      vmCount: vmsWithEpics.length,
      epicCount: epics.length,
      syncedAt,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
