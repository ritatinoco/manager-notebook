'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from '@phosphor-icons/react'
import Link from 'next/link'
import type { SprintCapacity, TeamMetrics } from '@/lib/capacity/calculations'
import { getTeamMetrics } from '@/lib/capacity/calculations'
import type { Config } from '@/lib/data/config'

interface CapacityResponse {
  matrix: SprintCapacity[]
  teamMetrics: TeamMetrics
  config: Config
  syncedAt: string | null
  hasSprints: boolean
}

const ALLOC_ROWS = [
  { key: 'features' as const, label: 'Priorities (Features)' },
  { key: 'discovery' as const, label: 'Discovery (HLD)' },
  { key: 'risk' as const, label: 'Risk' },
  { key: 'debts' as const, label: 'Debts & Acceleration' },
  { key: 'support' as const, label: 'Support & Maintenance' },
]

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function extractQuarter(sprintName: string): string | null {
  const m = sprintName.match(/(\d{2}\.Q\d)/)
  return m ? m[1] : null
}

function nextQuarter(q: string): string {
  const m = q.match(/(\d{2})\.Q(\d)/)
  if (!m) return ''
  const year = parseInt(m[1])
  const qNum = parseInt(m[2])
  return qNum === 4 ? `${String(year + 1).padStart(2, '0')}.Q1` : `${m[1]}.Q${qNum + 1}`
}

function RowLabel({ label, info }: { label: string; info: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pos) return
    function handle(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setPos(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pos])

  function toggle() {
    if (pos) { setPos(null); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left })
  }

  return (
    <span className="flex items-center gap-1">
      {label}
      <button ref={btnRef} onClick={toggle} className="flex items-center">
        <Info size={13} weight="duotone" className="text-gray-400 hover:text-indigo-500 transition-colors" />
      </button>
      {pos && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
        >
          {info}
        </div>,
        document.body
      )}
    </span>
  )
}

function CapacityView({
  matrix,
  config,
}: {
  matrix: SprintCapacity[]
  config: Config
}) {
  const allMemberNames = matrix[0]?.members.map((m) => m.memberName) ?? []
  const teamMetrics = getTeamMetrics(matrix)

  return (
    <>
      {/* Team metrics */}
      {teamMetrics.completedSprints > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Team Metrics</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Over-commit', value: `${Math.round(teamMetrics.overCommitPct * 100)}%` },
              { label: 'Under-deliver', value: `${Math.round(teamMetrics.underDeliverPct * 100)}%` },
              { label: 'Deliver ≥ Commit', value: `${Math.round(teamMetrics.deliverGteCommitPct * 100)}%` },
              { label: 'Avg velocity', value: fmt(teamMetrics.avgVelocity) + ' SP' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member availability */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Team Availability (days)</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 w-44">Member</th>
                {matrix.map((sc) => (
                  <th key={sc.sprint.id} className="px-3 py-3 font-medium text-gray-600 text-center whitespace-nowrap min-w-28">
                    <div>{sc.sprint.name}</div>
                    <div className="text-xs text-gray-400 font-normal">{fmtShort(sc.sprint.startDate ?? '')} → {fmtEndShort(sc.sprint.endDate ?? '')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allMemberNames.map((name) => (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium sticky left-0 bg-white">{name}</td>
                  {matrix.map((sc) => {
                    const mc = sc.members.find((m) => m.memberName === name)
                    return (
                      <td key={sc.sprint.id} className={`px-3 py-2 text-center ${mc && mc.availableDays === 0 ? 'text-red-600 bg-red-50' : ''}`}>
                        {mc ? fmt(mc.availableDays) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                <td className="px-4 py-2 sticky left-0 bg-gray-50">Total days</td>
                {matrix.map((sc) => <td key={sc.sprint.id} className="px-3 py-2 text-center">{fmt(sc.totalDays)}</td>)}
              </tr>
              <tr className="bg-indigo-50 font-semibold">
                <td className="px-4 py-2 sticky left-0 bg-indigo-50 text-indigo-800">Total SP</td>
                {matrix.map((sc) => <td key={sc.sprint.id} className="px-3 py-2 text-center text-indigo-800">{fmt(sc.totalSP)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Allocation breakdown */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Allocation (SP)</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 w-48">Category</th>
                <th className="px-3 py-3 font-medium text-gray-600 text-center w-16">%</th>
                {matrix.map((sc) => (
                  <th key={sc.sprint.id} className="px-3 py-3 font-medium text-gray-600 text-center whitespace-nowrap min-w-28">{sc.sprint.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ALLOC_ROWS.map(({ key, label }) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 sticky left-0 bg-white">{label}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{Math.round(config.allocations[key] * 100)}%</td>
                  {matrix.map((sc) => (
                    <td key={sc.sprint.id} className="px-3 py-2 text-center">{fmt(sc.allocations[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sprint summary */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sprint Summary</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 w-44">Sprint</th>
                {matrix.map((sc) => (
                  <th key={sc.sprint.id} className="px-3 py-3 font-medium text-gray-600 text-center whitespace-nowrap min-w-28">{sc.sprint.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-center">
              <tr>
                <td className="px-4 py-2 text-left text-gray-500 sticky left-0 bg-white">
                  <RowLabel label="Suggested SP" info="Capacity SP × (Features % + Discovery % + Debts & Acceleration %). The amount of SP the team should aim to commit to." />
                </td>
                {matrix.map((sc) => <td key={sc.sprint.id} className="px-3 py-2 text-indigo-700 font-medium">{fmt(sc.suggestedSP)}</td>)}
              </tr>
              <tr>
                <td className="px-4 py-2 text-left text-gray-500 sticky left-0 bg-white">
                  <RowLabel label="Committed SP" info="Story points in the sprint when it began, before any scope changes. Sourced from Jira's velocity chart." />
                </td>
                {matrix.map((sc) => <td key={sc.sprint.id} className="px-3 py-2">{sc.sprint.initialCommittedSP > 0 ? fmt(sc.sprint.initialCommittedSP) : '—'}</td>)}
              </tr>
              <tr>
                <td className="px-4 py-2 text-left text-gray-500 sticky left-0 bg-white">
                  <RowLabel label="Delivered SP" info="Story points completed during the sprint. Counts issues in Done or Waiting for Release status." />
                </td>
                {matrix.map((sc) => <td key={sc.sprint.id} className="px-3 py-2">{sc.sprint.deliveredSP > 0 ? fmt(sc.sprint.deliveredSP) : '—'}</td>)}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-2 text-left font-medium sticky left-0 bg-gray-50">
                  <RowLabel label="Capacity SP" info="Total available days × SP/day rate, summed across all team members. Accounts for days off and public holidays." />
                </td>
                {matrix.map((sc) => <td key={sc.sprint.id} className="px-3 py-2 font-medium">{fmt(sc.totalSP)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </>
  )
}

function fmtShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Jira endDate is exclusive (first day of next sprint) — display the day before
function fmtEndShort(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function BootstrapPanel({
  quarter,
  onCreated,
}: {
  quarter: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ startDate: '', sprintCount: 6, sprintDuration: 14, namePrefix: '' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  useEffect(() => {
    fetch('/api/capacity/bootstrap').then((r) => r.json()).then((d) => {
      setForm((f) => ({ ...f, namePrefix: d.namePrefix, sprintCount: d.sprintCount, sprintDuration: d.sprintDuration }))
    })
  }, [])

  const preview = form.startDate
    ? Array.from({ length: form.sprintCount }, (_, i) => {
        const start = addDays(form.startDate, i * form.sprintDuration)
        const end = addDays(form.startDate, (i + 1) * form.sprintDuration - 1)
        return { name: `${form.namePrefix} ${quarter}.${i + 1}`, start, end }
      })
    : []

  async function create() {
    setStatus('saving')
    const res = await fetch('/api/capacity/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quarter, ...form }),
    })
    if (res.ok) { onCreated() }
    else setStatus('error')
  }

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg">
      <p className="text-sm text-gray-500 mb-3">No sprints for this quarter yet.</p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-indigo-600 font-medium hover:underline"
        >
          Bootstrap {quarter} →
        </button>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First sprint start</label>
              <input
                type="date"
                className={inputCls + ' w-full'}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sprint prefix</label>
              <input
                className={inputCls + ' w-full'}
                value={form.namePrefix}
                onChange={(e) => setForm((f) => ({ ...f, namePrefix: e.target.value }))}
                placeholder="e.g. RAR"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Number of sprints</label>
              <input
                type="number"
                min={1}
                max={12}
                className={inputCls + ' w-full'}
                value={form.sprintCount}
                onChange={(e) => setForm((f) => ({ ...f, sprintCount: parseInt(e.target.value) || 6 }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (days)</label>
              <input
                type="number"
                min={7}
                max={30}
                className={inputCls + ' w-full'}
                value={form.sprintDuration}
                onChange={(e) => setForm((f) => ({ ...f, sprintDuration: parseInt(e.target.value) || 14 }))}
              />
            </div>
          </div>

          {preview.length > 0 && (
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
              <div className="space-y-1">
                {preview.map((s) => (
                  <div key={s.name} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{s.name}</span>
                    <span className="text-gray-400">{fmtShort(s.start)} → {fmtShort(s.end)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={create}
              disabled={!form.startDate || !form.namePrefix || status === 'saving'}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-1.5 font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {status === 'saving' ? 'Creating…' : 'Create sprints'}
            </button>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            {status === 'error' && <span className="text-sm text-red-600">Failed — try again</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CapacityPage() {
  const [data, setData] = useState<CapacityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'current' | 'next'>('current')

  function reload() {
    setLoading(true)
    fetch('/api/capacity').then((r) => r.json()).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>
  if (!data) return <div className="text-sm text-red-500">Failed to load capacity data.</div>

  if (!data.hasSprints) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Capacity</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-sm text-amber-800 mb-2">No sprint data yet.</p>
          <p className="text-sm text-amber-700">
            Go to <Link href="/velocity" className="underline font-medium">Velocity</Link> and click &quot;Sync from Jira&quot; to load your sprints.
          </p>
        </div>
      </div>
    )
  }

  const { matrix, config } = data

  // Determine current quarter from active sprint
  const activeSprint = matrix.find((sc) => sc.sprint.state === 'active')
  const currentQ = activeSprint ? extractQuarter(activeSprint.sprint.name) : null
  const futureQ = currentQ ? nextQuarter(currentQ) : null

  const currentMatrix = currentQ ? matrix.filter((sc) => extractQuarter(sc.sprint.name) === currentQ) : matrix
  const nextMatrix = futureQ ? matrix.filter((sc) => extractQuarter(sc.sprint.name) === futureQ) : []

  const tabs = [
    { id: 'current' as const, label: currentQ ? `Current — ${currentQ}` : 'Current quarter' },
    { id: 'next' as const, label: futureQ ? `Next — ${futureQ}` : 'Next quarter' },
  ]

  const activeMatrix = tab === 'current' ? currentMatrix : nextMatrix

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Capacity</h1>
        {data.syncedAt && (
          <span className="text-xs text-gray-400">Last synced {new Date(data.syncedAt).toLocaleString()}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeMatrix.length === 0 ? (
        <BootstrapPanel quarter={tab === 'next' ? (futureQ ?? '') : (currentQ ?? '')} onCreated={() => { reload(); setTab(tab) }} />
      ) : (
        <CapacityView matrix={activeMatrix} config={config} />
      )}
    </div>
  )
}
