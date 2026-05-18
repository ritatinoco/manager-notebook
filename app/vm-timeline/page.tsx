'use client'

import { useEffect, useRef, useState } from 'react'
import type { InitiativeCache, VMCache } from '@/lib/data/roadmap-cache'
import type { ValueStreamConfig } from '@/lib/data/value-streams'
import { ArrowsClockwise, Diamond, Rocket } from '@phosphor-icons/react'

const RELEASES: { name: string; date: Date }[] = [
  { name: 'ONE conf', date: new Date(new Date().getFullYear(), 5, 2) }, // June 2
]

const DAY_PX = 4
const VM_H = 38
const EPIC_H = 30
const YEAR_H = 22
const QTR_H = 32
const DEFAULT_LEFT_W = 530

const STATUS_BG: Record<string, string> = {
  'In Progress':           '#60a5fa',
  'Development':           '#60a5fa',
  'Done':                  '#4ade80',
  'GA':                    '#4ade80',
  'Releasing':             '#4ade80',
  'Blocked':               '#f87171',
  'Solution Design':       '#c084fc',
  'Planning Preparation':  '#c084fc',
  'Ready for Planning':    '#c084fc',
  'Ready for Development': '#c084fc',
  'In Design':             '#c084fc',
  'Paused':                '#d1d5db',
  'To Do':                 '#d1d5db',
  'Backlog':               '#d1d5db',
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  'In Progress':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Development':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Done':                  { bg: '#dcfce7', color: '#15803d' },
  'GA':                    { bg: '#dcfce7', color: '#15803d' },
  'Releasing':             { bg: '#dcfce7', color: '#15803d' },
  'Blocked':               { bg: '#fee2e2', color: '#b91c1c' },
  'Solution Design':       { bg: '#f3e8ff', color: '#7e22ce' },
  'Planning Preparation':  { bg: '#f3e8ff', color: '#7e22ce' },
  'Ready for Planning':    { bg: '#f3e8ff', color: '#7e22ce' },
  'Ready for Development': { bg: '#f3e8ff', color: '#7e22ce' },
  'In Design':             { bg: '#f3e8ff', color: '#7e22ce' },
  'Paused':                { bg: '#f3f4f6', color: '#6b7280' },
  'To Do':                 { bg: '#f3f4f6', color: '#6b7280' },
  'Backlog':               { bg: '#f3f4f6', color: '#6b7280' },
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6']

const QUARTER_MONTHS = [
  { q: 'Q1', months: [0, 1, 2], label: 'Q1 Jan–Mar' },
  { q: 'Q2', months: [3, 4, 5], label: 'Q2 Apr–Jun' },
  { q: 'Q3', months: [6, 7, 8], label: 'Q3 Jul–Sep' },
  { q: 'Q4', months: [9, 10, 11], label: 'Q4 Oct–Dec' },
]

interface Quarter { year: number; q: number; label: string; left: number; width: number; shaded: boolean }
interface YearBand { year: number; left: number; width: number }

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function buildQuarters(rangeStart: Date, rangeEnd: Date): Quarter[] {
  const result: Quarter[] = []
  let shadeToggle = false
  for (let year = rangeStart.getFullYear(); year <= rangeEnd.getFullYear(); year++) {
    for (let qi = 0; qi < 4; qi++) {
      const qDef = QUARTER_MONTHS[qi]
      const qStart = new Date(year, qDef.months[0], 1)
      const qEnd = new Date(year, qDef.months[2] + 1, 0)
      if (qEnd < rangeStart || qStart > rangeEnd) continue
      const clampedStart = qStart < rangeStart ? rangeStart : qStart
      const clampedEnd = qEnd > rangeEnd ? rangeEnd : qEnd
      const left = daysBetween(rangeStart, clampedStart) * DAY_PX
      const width = Math.max(1, daysBetween(clampedStart, clampedEnd) + 1) * DAY_PX
      result.push({ year, q: qi + 1, label: qDef.label, left, width, shaded: shadeToggle })
      shadeToggle = !shadeToggle
    }
  }
  return result
}

function buildYears(quarters: Quarter[]): YearBand[] {
  const map = new Map<number, { left: number; right: number }>()
  for (const q of quarters) {
    const cur = map.get(q.year)
    if (!cur) map.set(q.year, { left: q.left, right: q.left + q.width })
    else map.set(q.year, { left: Math.min(cur.left, q.left), right: Math.max(cur.right, q.left + q.width) })
  }
  return Array.from(map.entries()).map(([year, { left, right }]) => ({ year, left, width: right - left }))
}

// A VM entry with its parent initiative context
interface VMEntry {
  vm: VMCache
  initiativeKey: string
  initiativeSummary: string
  valueStream: string | null
}

export default function VMTimelinePage() {
  const [initiatives, setInitiatives] = useState<InitiativeCache[]>([])
  const [orphanVMs, setOrphanVMs] = useState<VMCache[]>([])
  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [vsConfig, setVsConfig] = useState<ValueStreamConfig>({ streams: [], assignments: {} })
  const [hideDone, setHideDone] = useState(true)
  const [showPaused, setShowPaused] = useState(false)
  type SortBy = 'targetStart' | 'targetEnd' | 'manual'
  const [sortBy, setSortBy] = useState<SortBy>('manual')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [priorityOrder, setPriorityOrder] = useState<string[]>([])
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [leftW, setLeftW] = useState(DEFAULT_LEFT_W)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(DEFAULT_LEFT_W)
  const dragKeyRef = useRef<string | null>(null)

  function toggle(key: string) { setCollapsed((c) => ({ ...c, [key]: !c[key] })) }
  function isOpen(key: string) { return !collapsed[key] }

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    resizingRef.current = true
    resizeStartX.current = e.clientX
    resizeStartW.current = leftW
    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return
      setLeftW(Math.max(180, resizeStartW.current + ev.clientX - resizeStartX.current))
    }
    function onUp() {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function load() {
    Promise.all([
      fetch('/api/roadmap').then(r => r.json()),
      fetch('/api/value-streams').then(r => r.json()),
      fetch('/api/roadmap-vm-priority').then(r => r.json()),
    ]).then(([roadmap, vs, priority]) => {
      setInitiatives(roadmap.initiatives ?? [])
      setOrphanVMs(roadmap.orphanVMs ?? [])
      setSyncedAt(roadmap.syncedAt)
      setJiraBaseUrl(roadmap.jiraBaseUrl ?? '')
      setVsConfig(vs)
      setPriorityOrder(priority.order ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!loading && containerRef.current) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const rangeStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      const todayLeft = daysBetween(rangeStart, today) * DAY_PX
      containerRef.current.scrollLeft = Math.max(0, todayLeft - 200)
    }
  }, [loading])

  async function refresh() {
    setSyncing(true)
    setSyncError('')
    const res = await fetch('/api/roadmap/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) load()
    else setSyncError(json.error ?? 'Sync failed')
    setSyncing(false)
  }

  // Build flat VM list with initiative context
  const allVMEntries: VMEntry[] = [
    ...initiatives.flatMap((ini) =>
      ini.vms.map((vm) => ({
        vm,
        initiativeKey: ini.key,
        initiativeSummary: ini.summary,
        valueStream: ini.valueStream ?? null,
      }))
    ),
    ...orphanVMs.map((vm) => ({
      vm,
      initiativeKey: '',
      initiativeSummary: 'No Initiative',
      valueStream: null,
    })),
  ]

  const detectedStreams = [...new Set(
    initiatives.map((i) => i.valueStream).filter(Boolean) as string[]
  )]

  function vsColor(valueStream: string | null | undefined): string | null {
    if (!valueStream) return null
    const idx = detectedStreams.indexOf(valueStream)
    return vsConfig.streams.find((s) => s.name === valueStream)?.color
      ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
  }

  // Date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)

  const allDates: Date[] = [new Date(today.getFullYear(), today.getMonth() + 4, 0)]
  for (const { vm } of allVMEntries) {
    if (vm.targetEnd) allDates.push(new Date(vm.targetEnd + 'T00:00:00'))
    for (const e of vm.epics) {
      if (e.targetEnd) allDates.push(new Date(e.targetEnd + 'T00:00:00'))
    }
  }
  const rangeEnd = new Date(Math.max(...allDates.map(d => d.getTime())))
  rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  rangeEnd.setDate(0)

  const totalDays = daysBetween(rangeStart, rangeEnd)
  const totalWidth = totalDays * DAY_PX
  const todayLeft = daysBetween(rangeStart, today) * DAY_PX

  const quarters = buildQuarters(rangeStart, rangeEnd)
  const years = buildYears(quarters)

  const oneConferenceDate = new Date(today.getFullYear(), 5, 2) // June 2
  const oneConferenceLeft = daysBetween(rangeStart, oneConferenceDate) * DAY_PX

  const nextRelease = RELEASES.filter((r) => r.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null
  const daysToRelease = nextRelease ? daysBetween(today, nextRelease.date) : null

  function barProps(targetStart: string | null, targetEnd: string | null) {
    const start = targetStart ? new Date(targetStart + 'T00:00:00') : null
    const end = targetEnd ? new Date(targetEnd + 'T00:00:00') : null
    if (!start && !end) return null
    const from = start ?? end!
    const to = end ?? start!
    if (from > rangeEnd || to < rangeStart) return null
    const clampedFrom = from < rangeStart ? rangeStart : from
    const clampedTo = to > rangeEnd ? rangeEnd : to
    return {
      left: daysBetween(rangeStart, clampedFrom) * DAY_PX,
      width: Math.max(DAY_PX * 2, (daysBetween(clampedFrom, clampedTo) + 1) * DAY_PX),
      startsBeforeRange: from < rangeStart,
    }
  }

  function jiraHref(key: string) {
    return jiraBaseUrl && key ? `${jiraBaseUrl}/browse/${key}` : null
  }

  // Filters
  const DONE_STATUSES = new Set(['Done', 'GA'])
  function isPaused(status: string) {
    const s = status.toLowerCase()
    return s.includes('paused') || s.includes('on hold')
  }
  function shouldShow(status: string) {
    if (hideDone && DONE_STATUSES.has(status)) return false
    if (!showPaused && isPaused(status)) return false
    return true
  }

  const filteredVMEntries = allVMEntries
    .filter(({ vm }) => shouldShow(vm.status))
    .map(({ vm, ...rest }) => ({
      ...rest,
      vm: { ...vm, epics: vm.epics.filter((e) => shouldShow(e.status)) },
    }))
    .filter(({ vm }) => vm.epics.length > 0)

  const hasData = allVMEntries.length > 0

  function sortVMEntries(list: typeof filteredVMEntries) {
    if (sortBy === 'manual') {
      return [...list].sort((a, b) => {
        const ai = priorityOrder.indexOf(a.vm.key)
        const bi = priorityOrder.indexOf(b.vm.key)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    }
    const field = sortBy === 'targetStart' ? 'targetStart' : 'targetEnd'
    return [...list].sort((a, b) => {
      const av = a.vm[field]
      const bv = b.vm[field]
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const sortedVMEntries = sortVMEntries(filteredVMEntries)

  async function savePriority(order: string[]) {
    setPriorityOrder(order)
    await fetch('/api/roadmap-vm-priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    })
  }

  function onDragStart(key: string) { dragKeyRef.current = key }

  function onDrop(targetKey: string) {
    const fromKey = dragKeyRef.current
    if (!fromKey || fromKey === targetKey) return
    const keys = sortedVMEntries.map(({ vm }) => vm.key)
    const from = keys.indexOf(fromKey)
    const to = keys.indexOf(targetKey)
    if (from === -1 || to === -1) return
    keys.splice(from, 1)
    keys.splice(to, 0, fromKey)
    savePriority(keys)
    dragKeyRef.current = null
  }

  function QuarterBg() {
    return (
      <>
        {quarters.map((q, i) =>
          q.shaded ? (
            <div key={i} className="absolute top-0 bottom-0 pointer-events-none"
              style={{ left: q.left, width: q.width, background: 'rgba(0,0,0,0.025)' }} />
          ) : null
        )}
        {quarters.map((q, i) => (
          <div key={`l${i}`} className="absolute top-0 bottom-0 border-r border-gray-100 pointer-events-none"
            style={{ left: q.left + q.width - 1 }} />
        ))}
        <div className="absolute top-0 bottom-0 pointer-events-none z-10"
          style={{ left: todayLeft, width: 1, background: '#818cf8' }} />
        <div className="absolute top-0 bottom-0 pointer-events-none z-10"
          style={{ left: oneConferenceLeft, width: 1, background: '#f59e0b' }} />
      </>
    )
  }

  function Bar({ targetStart, targetEnd, status, label, height, color }: {
    targetStart: string | null; targetEnd: string | null
    status: string; label: string; height: number; color?: string | null
  }) {
    const bar = barProps(targetStart, targetEnd)
    if (!bar) return null
    const bg = color ?? STATUS_BG[status] ?? '#94a3b8'
    return (
      <div className="absolute rounded flex items-center px-1.5 overflow-hidden"
        style={{ left: bar.left, width: bar.width, height: height - 10, top: 5, backgroundColor: bg, opacity: 0.85 }}
        title={label}>
        {bar.startsBeforeRange && <span className="text-white mr-1" style={{ fontSize: 9 }}>←</span>}
        <span className="text-white truncate" style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
      </div>
    )
  }

  function StatusPill({ status }: { status: string }) {
    const s = STATUS_BADGE[status] ?? { bg: '#f3f4f6', color: '#6b7280' }
    return (
      <span className="shrink-0 rounded-full px-1.5 py-px whitespace-nowrap"
        style={{ fontSize: 9, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
        {status}
      </span>
    )
  }

  function LeftCell({ indent, status, children }: { indent: number; status?: string; children: React.ReactNode }) {
    return (
      <div className="sticky left-0 z-10 bg-white border-r border-gray-100 flex items-center gap-2 px-3 shrink-0"
        style={{ width: leftW, paddingLeft: 12 + indent }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">{children}</div>
        {status && <StatusPill status={status} />}
      </div>
    )
  }

  function RightCell({ height, children }: { height: number; children?: React.ReactNode }) {
    return (
      <div className="relative flex-1 overflow-hidden" style={{ minWidth: totalWidth, height }}>
        <QuarterBg />
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">VM Timeline</h1>
          {nextRelease && daysToRelease !== null && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1"
              title={`${nextRelease.name} on ${nextRelease.date.toLocaleDateString()}`}>
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-700">{nextRelease.name}</span>
              <span className="text-xs text-amber-500">·</span>
              <span className="text-xs font-semibold text-amber-700">
                {daysToRelease === 0 ? 'Today!' : daysToRelease === 1 ? '1 day' : `${daysToRelease} days`}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {syncedAt && <span className="text-xs text-gray-400">Last synced {new Date(syncedAt).toLocaleString()}</span>}
          <button onClick={refresh} disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <ArrowsClockwise size={14} weight="duotone" className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700 shrink-0">{syncError}</div>
      )}

      {/* Legend + filter buttons */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {detectedStreams.map((name) => {
            const color = vsColor(name) ?? '#94a3b8'
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div className="rounded-full shrink-0" style={{ width: 10, height: 10, backgroundColor: color }} />
                <span className="text-xs text-gray-600">{name}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSortPanel((v) => !v)}
            className={`text-xs border rounded-lg px-2.5 py-1 transition-colors flex items-center gap-1 ${
              showSortPanel ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'text-gray-500 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Sort by: {sortBy === 'targetStart' ? 'Target Start' : sortBy === 'targetEnd' ? 'Target End' : 'Manual'}
            {sortBy !== 'manual' && <span>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
          </button>
          <button
            onClick={() => setHideDone((v) => !v)}
            className={`text-xs border rounded-lg px-2.5 py-1 transition-colors ${
              hideDone ? 'bg-green-50 border-green-300 text-green-700' : 'text-gray-500 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {hideDone ? 'Show Done' : 'Hide Done'}
          </button>
          <button
            onClick={() => setShowPaused((v) => !v)}
            className={`text-xs border rounded-lg px-2.5 py-1 transition-colors ${
              showPaused ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-gray-500 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showPaused ? 'Hide Paused' : 'Show Paused'}
          </button>
          <button
            onClick={() => setCollapsed({})}
            className="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors"
          >
            Expand all
          </button>
          <button
            onClick={() => {
              const allKeys = sortedVMEntries.map(({ vm }) => 'vm:' + vm.key)
              setCollapsed(Object.fromEntries(allKeys.map((k) => [k, true])))
            }}
            className="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      {showSortPanel && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 shrink-0 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="targetStart">Target Start</option>
              <option value="targetEnd">Target End</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          {sortBy !== 'manual' && (
            <div className="flex items-center gap-3">
              {(['asc', 'desc'] as const).map((d) => (
                <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="vmSortDir" checked={sortDir === d} onChange={() => setSortDir(d)}
                    className="accent-indigo-600" />
                  <span className="text-xs text-gray-600">{d === 'asc' ? 'Ascending' : 'Descending'}</span>
                </label>
              ))}
            </div>
          )}
          {sortBy === 'manual' && (
            <span className="text-xs text-gray-400 italic">Drag VM rows to reorder</span>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !hasData ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No roadmap data.</p>
          <button onClick={refresh} disabled={syncing} className="text-sm text-indigo-600 font-medium hover:underline disabled:opacity-50">
            {syncing ? 'Refreshing…' : 'Refresh from Jira →'}
          </button>
        </div>
      ) : (
        <div ref={containerRef} className="bg-white border border-gray-200 rounded-xl overflow-auto flex-1">
          <div style={{ minWidth: leftW + totalWidth }}>

            {/* Year header */}
            <div className="flex sticky top-0 z-30 bg-gray-50 border-b border-gray-100" style={{ height: YEAR_H }}>
              <div className="sticky left-0 z-40 bg-gray-50 border-r border-gray-200 shrink-0" style={{ width: leftW }} />
              <div className="relative flex-1" style={{ minWidth: totalWidth }}>
                {years.map((y) => (
                  <div key={y.year} className="absolute top-0 bottom-0 flex items-center px-3 border-r border-gray-200"
                    style={{ left: y.left, width: y.width }}>
                    <span className="text-xs font-semibold text-gray-500">{y.year}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarter header */}
            <div className="flex sticky z-30 bg-gray-50 border-b border-gray-200" style={{ top: YEAR_H, height: QTR_H }}>
              <div className="sticky left-0 z-40 bg-gray-50 border-r border-gray-200 flex items-center px-4 shrink-0 relative" style={{ width: leftW }}>
                <span className="text-xs font-semibold text-gray-400 w-5 shrink-0">#</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Work Item</span>
                <div onMouseDown={onResizeMouseDown}
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-300 transition-colors" />
              </div>
              <div className="relative flex-1" style={{ minWidth: totalWidth }}>
                {quarters.map((q, i) => (
                  <div key={i} className="absolute top-0 bottom-0 flex items-center px-3 border-r border-gray-200"
                    style={{ left: q.left, width: q.width, background: q.shaded ? 'rgba(0,0,0,0.025)' : undefined }}>
                    <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{q.label}</span>
                  </div>
                ))}
                <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: todayLeft, width: 1, background: '#818cf8' }} />
                <div className="absolute bottom-0 pointer-events-none flex flex-col items-center" style={{ left: oneConferenceLeft - 18, width: 36 }}>
                  <span className="text-amber-500 font-semibold whitespace-nowrap" style={{ fontSize: 9 }}>ONE conf</span>
                </div>
                <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: oneConferenceLeft, width: 1, background: '#f59e0b' }} />
              </div>
            </div>

            {/* VM rows */}
            {sortedVMEntries.map(({ vm, initiativeKey, initiativeSummary, valueStream }, idx) => {
              const color = vsColor(valueStream)
              const href = jiraHref(vm.key)
              return (
                <div key={vm.key || vm.summary}
                  draggable={sortBy === 'manual'}
                  onDragStart={() => onDragStart(vm.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(vm.key)}
                >
                  {/* VM row */}
                  <div className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors" style={{ height: VM_H }}>
                    <LeftCell indent={0} status={vm.status}>
                      {sortBy === 'manual' && (
                        <span className="text-gray-300 text-sm shrink-0 cursor-grab select-none">⠿</span>
                      )}
                      <span className="text-xs text-gray-300 w-5 shrink-0 tabular-nums">{idx + 1}</span>
                      {color && <div className="shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: color }} />}
                      <button onClick={() => toggle('vm:' + vm.key)} className="text-gray-400 text-sm shrink-0 w-4">
                        {isOpen('vm:' + vm.key) ? '▾' : '▸'}
                      </button>
                      <Diamond size={13} weight="duotone" className="text-indigo-400 shrink-0" />
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-mono text-gray-400 shrink-0 hover:text-indigo-600 hover:underline">{vm.key}</a>
                      ) : vm.key ? (
                        <span className="text-xs font-mono text-gray-400 shrink-0">{vm.key}</span>
                      ) : null}
                      <span className="text-xs font-semibold text-gray-800 truncate">{vm.summary}</span>
                      {initiativeKey && jiraBaseUrl ? (
                        <a
                          href={`${jiraBaseUrl}/browse/${initiativeKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={initiativeSummary}
                          className="shrink-0 text-gray-300 hover:text-blue-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Rocket size={13} weight="duotone" />
                        </a>
                      ) : initiativeSummary ? (
                        <span title={initiativeSummary} className="shrink-0 text-gray-300">
                          <Rocket size={13} weight="duotone" />
                        </span>
                      ) : null}
                    </LeftCell>
                    <RightCell height={VM_H}>
                      <Bar targetStart={vm.targetStart} targetEnd={vm.targetEnd} status={vm.status} label={vm.summary} height={VM_H} color={color} />
                    </RightCell>
                  </div>

                  {/* Epic rows */}
                  {isOpen('vm:' + vm.key) && vm.epics.map((epic) => {
                    const epicHref = jiraHref(epic.key)
                    return (
                      <div key={epic.key} className="flex border-b border-gray-50 hover:bg-gray-50/50 transition-colors" style={{ height: EPIC_H }}>
                        <LeftCell indent={24} status={epic.status}>
                          <span className="text-gray-200 text-xs shrink-0">└</span>
                          {epicHref ? (
                            <a href={epicHref} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-mono text-gray-400 shrink-0 hover:text-indigo-600 hover:underline">{epic.key}</a>
                          ) : (
                            <span className="text-xs font-mono text-gray-400 shrink-0">{epic.key}</span>
                          )}
                          <span className="text-xs text-gray-600 truncate">{epic.summary}</span>
                        </LeftCell>
                        <RightCell height={EPIC_H}>
                          <Bar targetStart={epic.targetStart} targetEnd={epic.targetEnd} status={epic.status} label={epic.summary} height={EPIC_H} />
                        </RightCell>
                      </div>
                    )
                  })}
                </div>
              )
            })}

          </div>
        </div>
      )}
    </div>
  )
}
