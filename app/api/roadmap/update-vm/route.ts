import { NextRequest, NextResponse } from 'next/server'
import { jiraPut } from '@/lib/jira/client'
import { getRoadmapCache, saveRoadmapCache } from '@/lib/data/roadmap-cache'

const RECENT_UPDATE_FIELD = 'customfield_15727'

export async function POST(req: NextRequest) {
  try {
    const { key, recentUpdate } = await req.json() as { key: string; recentUpdate: string }
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    await jiraPut(`/rest/api/3/issue/${key}`, {
      fields: { [RECENT_UPDATE_FIELD]: recentUpdate },
    })

    // Update local cache (searches VMs and epics)
    const cache = getRoadmapCache()
    for (const ini of cache.initiatives) {
      for (const vm of ini.vms) {
        if (vm.key === key) { vm.recentUpdate = recentUpdate || null; continue }
        for (const epic of vm.epics) {
          if (epic.key === key) epic.recentUpdate = recentUpdate || null
        }
      }
    }
    for (const vm of cache.orphanVMs) {
      if (vm.key === key) { vm.recentUpdate = recentUpdate || null; continue }
      for (const epic of vm.epics) {
        if (epic.key === key) epic.recentUpdate = recentUpdate || null
      }
    }
    saveRoadmapCache(cache)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
