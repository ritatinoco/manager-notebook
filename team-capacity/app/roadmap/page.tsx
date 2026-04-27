'use client'

import { useEffect, useState } from 'react'
import type { InitiativeCache, VMCache } from '@/lib/data/roadmap-cache'
import type { ValueStreamConfig } from '@/lib/data/value-streams'
import { ArrowsClockwise, Rocket, Diamond, GearSix } from '@phosphor-icons/react'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const STATUS_STYLES: Record<string, string> = {
  'In Progress':            'bg-blue-100 text-blue-700',
  'Development':            'bg-blue-100 text-blue-700',
  'Done':                   'bg-green-100 text-green-700',
  'GA':                     'bg-green-100 text-green-700',
  'Releasing':              'bg-green-100 text-green-700',
  'Blocked':                'bg-red-100 text-red-700',
  'Solution Design':        'bg-purple-100 text-purple-700',
  'Planning Preparation':   'bg-purple-100 text-purple-700',
  'Ready for Planning':     'bg-purple-100 text-purple-700',
  'Ready for Development':  'bg-purple-100 text-purple-700',
  'In Design':              'bg-purple-100 text-purple-700',
  'To Do':                  'bg-gray-100 text-gray-600',
  'Backlog':                'bg-gray-100 text-gray-600',
}

const ACTIVE_ORDER = ['Solution Design', 'Planning Preparation', 'Ready for Planning', 'Ready for Development', 'In Design', 'Development', 'In Progress']
const DONE_STATUSES = new Set(['Done', 'GA', 'Releasing'])
const DEFINITION_KEYWORDS = ['definition', 'ideation', 'discovery']
const PAUSED_KEYWORDS = ['paused', 'on hold', 'blocked']

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6']

type IniGroup = 'active' | 'definition' | 'paused'

function classifyInitiative(ini: InitiativeCache): IniGroup {
  const s = ini.status.toLowerCase()
  if (PAUSED_KEYWORDS.some((k) => s.includes(k))) return 'paused'
  if (DEFINITION_KEYWORDS.some((k) => s.includes(k))) return 'definition'
  return 'active'
}

function sortActive(items: InitiativeCache[]): InitiativeCache[] {
  return [...items].sort((a, b) => {
    const ai = ACTIVE_ORDER.indexOf(a.status)
    const bi = ACTIVE_ORDER.indexOf(b.status)
    const aDone = DONE_STATUSES.has(a.status)
    const bDone = DONE_STATUSES.has(b.status)
    if (aDone && !bDone) return 1
    if (!aDone && bDone) return -1
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.status.localeCompare(b.status)
  })
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

function VSBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
      style={{ backgroundColor: color + '22', color }}
    >
      {name}
    </span>
  )
}

function VMSection({ vm, jiraBaseUrl }: { vm: VMCache; jiraBaseUrl: string }) {
  const [open, setOpen] = useState(true)
  const vmHref = jiraBaseUrl && vm.key ? `${jiraBaseUrl}/browse/${vm.key}` : null

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-300 text-xs ml-2">{open ? '▾' : '▸'}</span>
        <Diamond size={12} weight="duotone" className="text-indigo-400 shrink-0" />
        {vmHref ? (
          <a href={vmHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="text-xs font-mono text-gray-400 hover:text-indigo-600 hover:underline shrink-0">
            {vm.key}
          </a>
        ) : vm.key ? (
          <span className="text-xs font-mono text-gray-400 shrink-0">{vm.key}</span>
        ) : null}
        <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">{vm.summary}</span>
        {vm.status && <StatusBadge status={vm.status} />}
        {(vm.targetStart || vm.targetEnd) && (
          <span className="text-xs text-gray-400 shrink-0">{fmtDate(vm.targetStart)} → {fmtDate(vm.targetEnd)}</span>
        )}
      </button>
      {open && vm.epics.length > 0 && (
        <div>
          {vm.epics.map((epic) => {
            const epicHref = jiraBaseUrl ? `${jiraBaseUrl}/browse/${epic.key}` : null
            return (
              <div key={epic.key} className="flex items-center gap-3 px-5 py-2 border-t border-gray-50 hover:bg-gray-50 ml-4">
                <span className="text-gray-200 text-xs ml-4">└</span>
                {epicHref ? (
                  <a href={epicHref} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-mono text-gray-400 shrink-0 hover:text-indigo-600 hover:underline">
                    {epic.key}
                  </a>
                ) : (
                  <span className="text-xs font-mono text-gray-400 shrink-0">{epic.key}</span>
                )}
                <span className="text-sm text-gray-600 flex-1 min-w-0 truncate">{epic.summary}</span>
                <StatusBadge status={epic.status} />
                {(epic.targetStart || epic.targetEnd) && (
                  <span className="text-xs text-gray-400 shrink-0">{fmtDate(epic.targetStart)} → {fmtDate(epic.targetEnd)}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InitiativeRow({
  ini, jiraBaseUrl, vsName, vsColor,
}: {
  ini: InitiativeCache; jiraBaseUrl: string; vsName: string | null; vsColor: string | null
}) {
  const [open, setOpen] = useState(true)
  const href = jiraBaseUrl && ini.key ? `${jiraBaseUrl}/browse/${ini.key}` : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-300 mt-0.5 text-sm">{open ? '▾' : '▸'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Rocket size={14} weight="duotone" className="text-blue-400 shrink-0 mt-0.5" />
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="text-xs font-mono text-gray-400 hover:text-indigo-600 hover:underline">
                {ini.key}
              </a>
            ) : ini.key ? (
              <span className="text-xs font-mono text-gray-400">{ini.key}</span>
            ) : null}
            <span className="text-sm font-semibold text-gray-900">{ini.summary}</span>
            {ini.status && <StatusBadge status={ini.status} />}
            {vsName && vsColor && <VSBadge name={vsName} color={vsColor} />}
            {(ini.targetStart || ini.targetEnd) && (
              <span className="text-xs text-gray-400 ml-auto">{fmtDate(ini.targetStart)} → {fmtDate(ini.targetEnd)}</span>
            )}
          </div>
        </div>
      </button>

      {open && ini.vms.length > 0 && (
        <div>
          {ini.vms.map((vm) => (
            <VMSection key={vm.key || vm.summary} vm={vm} jiraBaseUrl={jiraBaseUrl} />
          ))}
        </div>
      )}
      {open && ini.vms.length === 0 && (
        <p className="px-10 py-3 text-xs text-gray-400 italic border-t border-gray-100">No VMs</p>
      )}
    </div>
  )
}

// ── Value stream settings panel ────────────────────────────────────────────

function VSSettings({
  detectedStreams, config, onChange,
}: {
  detectedStreams: string[]
  config: ValueStreamConfig
  onChange: (c: ValueStreamConfig) => void
}) {
  function colorFor(name: string): string {
    return config.streams.find((s) => s.name === name)?.color
      ?? DEFAULT_COLORS[detectedStreams.indexOf(name) % DEFAULT_COLORS.length]
  }

  function setColor(name: string, color: string) {
    const existing = config.streams.find((s) => s.name === name)
    const streams = existing
      ? config.streams.map((s) => s.name === name ? { ...s, color } : s)
      : [...config.streams, { name, color }]
    onChange({ ...config, streams })
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-3">
        Value Stream Colors
      </span>
      {detectedStreams.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No value streams found in data. Sync from Jira first.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {detectedStreams.map((name) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer">
              <input
                type="color"
                value={colorFor(name)}
                onChange={(e) => setColor(name, e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-gray-200 shrink-0"
              />
              <span className="text-sm text-gray-700">{name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [initiatives, setInitiatives] = useState<InitiativeCache[]>([])
  const [orphanVMs, setOrphanVMs] = useState<VMCache[]>([])
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const [vsConfig, setVsConfig] = useState<ValueStreamConfig>({ streams: [], assignments: {} })
  const [vsSaving, setVsSaving] = useState(false)

  type Tab = 'active' | 'definition' | 'paused'
  const [activeTab, setActiveTab] = useState<Tab>('active')

  function load() {
    fetch('/api/roadmap').then((r) => r.json()).then((d) => {
      setInitiatives(d.initiatives ?? [])
      setOrphanVMs(d.orphanVMs ?? [])
      setSyncedAt(d.syncedAt)
      setJiraBaseUrl(d.jiraBaseUrl ?? '')
    }).finally(() => setLoading(false))
  }

  function loadVS() {
    fetch('/api/value-streams').then((r) => r.json()).then((d) => setVsConfig(d))
  }

  useEffect(() => { load(); loadVS() }, [])

  async function saveVS(config: ValueStreamConfig) {
    setVsConfig(config)
    setVsSaving(true)
    await fetch('/api/value-streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setVsSaving(false)
  }

  async function refresh() {
    setSyncing(true)
    setSyncError('')
    const res = await fetch('/api/roadmap/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) load()
    else setSyncError(json.error ?? 'Sync failed')
    setSyncing(false)
  }

  // Collect unique value stream names from Jira data
  const detectedStreams = [...new Set(
    initiatives.map((i) => i.valueStream).filter(Boolean) as string[]
  )]

  function vsColorFor(name: string | null): string | null {
    if (!name) return null
    const idx = detectedStreams.indexOf(name)
    return vsConfig.streams.find((s) => s.name === name)?.color
      ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
  }

  // Wrap orphan VMs in a synthetic initiative for display
  const orphanInitiative: InitiativeCache = {
    key: '', summary: 'No Initiative', status: '', targetStart: null, targetEnd: null, resolvedAt: null,
    vms: orphanVMs,
  }
  const allInitiatives = orphanVMs.length > 0 ? [...initiatives, orphanInitiative] : initiatives

  const activeInis = sortActive(allInitiatives.filter((i) => classifyInitiative(i) === 'active'))
  const definitionInis = allInitiatives.filter((i) => classifyInitiative(i) === 'definition')
  const pausedInis = allInitiatives.filter((i) => classifyInitiative(i) === 'paused')

  const tabs: { id: Tab; label: string; items: InitiativeCache[] }[] = [
    { id: 'active', label: 'Active', items: activeInis },
    { id: 'definition', label: 'In Definition', items: definitionInis },
    { id: 'paused', label: 'Paused', items: pausedInis },
  ]
  const visibleItems = tabs.find((t) => t.id === activeTab)?.items ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Roadmap</h1>
        <div className="flex items-center gap-2">
          {syncedAt && <span className="text-xs text-gray-400">Last synced {new Date(syncedAt).toLocaleString()}</span>}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors ${
              showSettings
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            title="Configure value streams"
          >
            <GearSix size={14} weight="duotone" />
            Value Streams
            {vsSaving && <span className="text-xs text-gray-400 ml-1">saving…</span>}
          </button>
          <button onClick={refresh} disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <ArrowsClockwise size={14} weight="duotone" className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">{syncError}</div>
      )}

      {showSettings && (
        <VSSettings
          detectedStreams={detectedStreams}
          config={vsConfig}
          onChange={saveVS}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : allInitiatives.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No roadmap data. Click Refresh to load from Jira.</p>
          <button onClick={refresh} disabled={syncing}
            className="text-sm text-indigo-600 font-medium hover:underline disabled:opacity-50">
            {syncing ? 'Refreshing…' : 'Refresh from Jira →'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-5 border-b border-gray-200">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {tab.items.length > 0 && (
                  <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${
                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                  }`}>{tab.items.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {visibleItems.map((ini) => (
              <InitiativeRow
                key={ini.key || ini.summary}
                ini={ini}
                jiraBaseUrl={jiraBaseUrl}
                vsName={ini.valueStream ?? null}
                vsColor={vsColorFor(ini.valueStream ?? null)}
              />
            ))}
            {visibleItems.length === 0 && <p className="text-sm text-gray-400 py-4">No items in this category.</p>}
          </div>
        </>
      )}
    </div>
  )
}
