'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Card, CardTitle, CardValue } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Info } from '@phosphor-icons/react'
import type { SprintCapacity, TeamMetrics } from '@/lib/capacity/calculations'
import type { Config } from '@/lib/data/config'

interface CapacityResponse {
  matrix: SprintCapacity[]
  teamMetrics: TeamMetrics
  config: Config
  syncedAt: string | null
  hasSprints: boolean
}

function InfoPopover({ text }: { text: string }) {
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
    <>
      <button ref={btnRef} onClick={toggle} className="flex items-center ml-1">
        <Info size={13} weight="duotone" className="text-gray-400 hover:text-indigo-500 transition-colors" />
      </button>
      {pos && createPortal(
        <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
          {text}
        </div>,
        document.body
      )}
    </>
  )
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function SprintHealthBar({ sc }: { sc: SprintCapacity }) {
  const today = new Date()
  const start = new Date(sc.sprint.startDate)
  const end = new Date(sc.sprint.endDate)

  function countWorkingDays(from: Date, to: Date): number {
    let count = 0
    const cur = new Date(from)
    cur.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(0, 0, 0, 0)
    while (cur < end) {
      const day = cur.getDay()
      if (day !== 0 && day !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }

  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)
  const totalWorkingDays = Math.max(1, countWorkingDays(start, end))
  const elapsedWorkingDays = countWorkingDays(start, todayMidnight)
  const daysLeft = countWorkingDays(todayMidnight, end)
  const timeElapsedPct = Math.round((elapsedWorkingDays / totalWorkingDays) * 100)

  const total = sc.sprint.committedSP || 1
  const doneSP = sc.sprint.doneSP ?? sc.sprint.deliveredSP
  const wfrSP = sc.sprint.waitingForReleaseSP ?? 0
  const delivered = sc.sprint.deliveredSP
  const remaining = Math.max(0, total - delivered)
  const workCompletePct = Math.round((delivered / (sc.sprint.initialCommittedSP || total)) * 100)

  const scopeChange = sc.sprint.initialCommittedSP > 0
    ? Math.round(((sc.sprint.committedSP - sc.sprint.initialCommittedSP) / sc.sprint.initialCommittedSP) * 100)
    : 0

  const donePct = (doneSP / total) * 100
  const wfrPct = (wfrSP / total) * 100
  const remainingPct = (remaining / total) * 100

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          {sc.sprint.name} &mdash; Overall sprint progress <span className="font-normal text-gray-400">(Story Points)</span>
        </p>
        <p className="text-sm font-semibold text-gray-700">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</p>
      </div>

      {/* Progress bar */}
      <div className="flex rounded-lg overflow-hidden h-8 mb-2 text-xs font-bold bg-gray-100">
        {doneSP > 0 && (
          <div style={{ width: `${donePct}%`, backgroundColor: '#76ca38' }} title={`${doneSP} SP Done`} className="text-white flex items-center justify-center shrink-0 transition-all cursor-default">
            {doneSP}
          </div>
        )}
        {wfrSP > 0 && (
          <div style={{ width: `${wfrPct}%` }} title={`${wfrSP} SP Waiting for Release`} className="bg-violet-400 text-white flex items-center justify-center shrink-0 transition-all cursor-default">
            {wfrSP}
          </div>
        )}
        {remaining > 0 && (
          <div style={{ width: `${remainingPct}%`, backgroundColor: '#e8eef2' }} title={`${remaining} SP still in progress or not started`} className="text-gray-500 flex items-center justify-center shrink-0 transition-all cursor-default">
            {remaining}
          </div>
        )}
      </div>
      <div className="flex gap-3 mb-3">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#76ca38' }} />Done
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-400" />Waiting for Release
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#e8eef2' }} />Remaining
        </span>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
          <p className="text-sm font-bold text-gray-700">{timeElapsedPct}<span className="text-xs font-normal text-gray-400"> %</span></p>
          <p className="text-xs text-gray-400 mt-0.5">Time elapsed</p>
        </div>
        <div className="bg-indigo-50 rounded-lg px-4 py-2 text-center">
          <p className="text-sm font-bold text-indigo-700">{workCompletePct}<span className="text-xs font-normal text-indigo-400"> %</span></p>
          <p className="text-xs text-indigo-400 mt-0.5">Work complete</p>
        </div>
        <div className={`rounded-lg px-4 py-2 text-center ${scopeChange > 0 ? 'bg-red-50' : scopeChange < 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className={`text-sm font-bold ${scopeChange > 0 ? 'text-red-500' : scopeChange < 0 ? 'text-green-600' : 'text-gray-700'}`}>
            {scopeChange > 0 ? '+' : ''}{scopeChange}<span className="text-xs font-normal"> %</span>
          </p>
          <p className={`text-xs mt-0.5 ${scopeChange > 0 ? 'text-red-400' : scopeChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>Scope change</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
          <p className="text-sm font-bold text-gray-700">{fmt(sc.sprint.initialCommittedSP)}<span className="text-xs font-normal text-gray-400"> SP</span></p>
          <p className="text-xs text-gray-400 mt-0.5">Initial commit</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
          <p className="text-sm font-bold text-gray-700">{fmt(sc.sprint.committedSP)}<span className="text-xs font-normal text-gray-400"> SP</span></p>
          <p className="text-xs text-gray-400 mt-0.5">Final commit</p>
        </div>
      </div>
    </div>
  )
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function findCurrentSprint(matrix: SprintCapacity[]): SprintCapacity | undefined {
  const now = new Date()
  const today = localDateStr(now)
  // All sprints containing today — pick the one with the latest startDate
  // (handles boundary overlap where a new sprint starts the same day the old one ends)
  const todayMatches = matrix.filter((sc) => sc.sprint.startDate <= today && sc.sprint.endDate >= today)
  if (todayMatches.length > 0) {
    return todayMatches.sort((a, b) => b.sprint.startDate.localeCompare(a.sprint.startDate))[0]
  }
  // Fall back to any sprint overlapping the current calendar week (Mon–Sun), latest startDate wins
  const dow = now.getDay()
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekMatches = matrix.filter(
    (sc) => sc.sprint.startDate <= localDateStr(weekEnd) && sc.sprint.endDate >= localDateStr(weekStart)
  )
  return weekMatches.sort((a, b) => b.sprint.startDate.localeCompare(a.sprint.startDate))[0]
}

export default function DashboardPage() {
  const [data, setData] = useState<CapacityResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentDraft, setCommentDraft] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    const [capRes, commentsRes] = await Promise.all([
      fetch('/api/capacity'),
      fetch('/api/sprint-comments'),
    ])
    if (capRes.ok) {
      const cap = await capRes.json()
      setData(cap)
      if (commentsRes.ok) {
        const c = await commentsRes.json()
        setComments(c)
        const current = findCurrentSprint(cap.matrix ?? [])
        if (current) setCommentDraft(c[current.sprint.name] ?? '')
      }
    }
  }

  async function syncJira() {
    setSyncing(true)
    setSyncMsg(null)
    const res = await fetch('/api/jira/sync', { method: 'POST' })
    const json = await res.json()
    setSyncMsg(res.ok ? `Synced ${json.sprintCount} sprints` : `Error: ${json.error}`)
    if (res.ok) load()
    setSyncing(false)
  }

  function handleCommentChange(sprintName: string, value: string) {
    setCommentDraft(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/sprint-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprint: sprintName, comment: value }),
      })
      setComments((c) => ({ ...c, [sprintName]: value }))
    }, 800)
  }

  useEffect(() => { load() }, [])

  if (!data) return <div className="text-sm text-gray-500">Loading...</div>

  if (!data.hasSprints) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-sm text-amber-800 mb-1 font-medium">No sprints loaded yet.</p>
          <p className="text-sm text-amber-700 mb-4">Connect to Jira to pull your RAR board sprint data.</p>
          {syncMsg && <p className={`text-sm mb-3 ${syncMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{syncMsg}</p>}
          <Button size="sm" onClick={syncJira} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync from Jira'}
          </Button>
          <p className="text-xs text-amber-600 mt-3">Make sure JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN are set in <code>.env.local</code></p>
        </div>
      </div>
    )
  }

  const today = localDateStr(new Date())
  const current = findCurrentSprint(data.matrix)
  const upcoming = data.matrix.filter((sc) => sc.sprint.startDate > today).slice(0, 3)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          {syncMsg && <span className="text-xs text-gray-500">{syncMsg}</span>}
          {data.syncedAt && <span className="text-xs text-gray-400">Synced {new Date(data.syncedAt).toLocaleString()}</span>}
          <Button size="sm" variant="secondary" onClick={syncJira} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Jira'}
          </Button>
        </div>
      </div>

      {current && (
        <section className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Sprint</p>
          <SprintHealthBar sc={current} />
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card>
              <CardTitle>{current.sprint.name}</CardTitle>
              <CardValue className="whitespace-nowrap">{fmtDate(current.sprint.startDate)} → {fmtDate(current.sprint.endDate)}</CardValue>
            </Card>
            <Card>
              <CardTitle>Capacity SP</CardTitle>
              <CardValue>{fmt(current.totalSP)}</CardValue>
            </Card>
            <Card>
              <CardTitle>Suggested SP</CardTitle>
              <CardValue className="text-indigo-700">{fmt(current.suggestedSP)}</CardValue>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardTitle>Out this sprint</CardTitle>
              {current.members.some((m) => m.daysOff > 0)
                ? <div className="flex flex-wrap gap-1.5 mt-1">
                    {current.members
                      .filter((m) => m.daysOff > 0)
                      .map((m) => (
                        <span key={m.memberName} className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          {m.memberName}
                          <span className="text-amber-400">{m.daysOff}d</span>
                        </span>
                      ))}
                  </div>
                : <p className="text-sm text-amber-300 mt-1">Everyone in</p>
              }
            </Card>
          </div>

          {/* Sprint goal + comments side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sprint Goal</p>
              {current.sprint.goal
                ? <p className="text-sm text-gray-700 whitespace-pre-line">{current.sprint.goal}</p>
                : <p className="text-sm text-gray-400 italic">No goal set. <Link href="/sprint-goals" className="text-indigo-500 hover:underline not-italic">Set one →</Link></p>
              }
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sprint Notes</p>
              <textarea
                value={commentDraft}
                onChange={(e) => handleCommentChange(current.sprint.name, e.target.value)}
                placeholder="Add notes for this sprint…"
                rows={4}
                className="w-full text-sm text-gray-700 resize-none focus:outline-none placeholder-gray-300"
              />
            </div>
          </div>
        </section>
      )}

      {data.teamMetrics.completedSprints > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Team Metrics ({data.teamMetrics.completedSprints} sprints)
          </p>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardTitle><span className="flex items-center">Avg velocity<InfoPopover text="Average suggested SP across all sprints in the quarter, including future ones. Based on team capacity and allocation settings." /></span></CardTitle>
              <CardValue>{fmt(data.teamMetrics.avgVelocity)} SP</CardValue>
            </Card>
            <Card>
              <CardTitle><span className="flex items-center">Deliver ≥ Commit<InfoPopover text="% of closed sprints where delivered SP met or exceeded the initial commitment (SP in the sprint when it began)." /></span></CardTitle>
              <CardValue className="text-green-700">{Math.round(data.teamMetrics.deliverGteCommitPct * 100)}%</CardValue>
            </Card>
            <Card>
              <CardTitle><span className="flex items-center">Over-commit<InfoPopover text="% of closed sprints where the initial commitment exceeded the team's calculated capacity SP." /></span></CardTitle>
              <CardValue className={data.teamMetrics.overCommitPct > 0 ? 'text-amber-600' : ''}>
                {Math.round(data.teamMetrics.overCommitPct * 100)}%
              </CardValue>
            </Card>
            <Card>
              <CardTitle><span className="flex items-center">Under-deliver<InfoPopover text="% of closed sprints where delivered SP fell short of the initial commitment." /></span></CardTitle>
              <CardValue className={data.teamMetrics.underDeliverPct > 0 ? 'text-red-600' : ''}>
                {Math.round(data.teamMetrics.underDeliverPct * 100)}%
              </CardValue>
            </Card>
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Upcoming</p>
            <Link href="/capacity" className="text-xs text-indigo-600 hover:underline">Full capacity view →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {upcoming.map((sc) => (
              <Card key={sc.sprint.id}>
                <CardTitle>{sc.sprint.name}</CardTitle>
                <p className="text-xs text-gray-400 mb-2">{fmtDate(sc.sprint.startDate)} → {fmtDate(sc.sprint.endDate)}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Capacity SP</p>
                    <p className="text-lg font-bold text-gray-900">{fmt(sc.totalSP)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Suggested SP</p>
                    <p className="text-lg font-bold text-indigo-700">{fmt(sc.suggestedSP)}</p>
                  </div>
                </div>
                {(() => {
                  const out = sc.members.filter((m) => m.daysOff > 0)
                  return out.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                      {out.map((m) => (
                        <span key={m.memberName} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs text-amber-700">
                          {m.memberName} <span className="text-amber-400">{m.daysOff}d</span>
                        </span>
                      ))}
                    </div>
                  ) : null
                })()}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
