'use client'

import { useEffect, useState } from 'react'
import { FloppyDisk, CheckCircle, WarningCircle, Spinner } from '@phosphor-icons/react'
import type { SprintCache } from '@/lib/data/jira-cache'

interface SprintEntry {
  sprint: SprintCache
  suggestedSP: number
  totalSP: number
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function extractQuarter(name: string): string | null {
  const m = name.match(/(\d{2}\.Q\d)/)
  return m ? m[1] : null
}

function QuarterSection({
  quarter, isCurrent, entries, defaultOpen,
}: {
  quarter: string
  isCurrent: boolean
  entries: SprintEntry[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-700"
      >
        <span>{open ? '▼' : '▶'}</span>
        <span>{quarter}{isCurrent ? ' — Current' : ''}</span>
        <span className="font-normal normal-case tracking-normal text-gray-400">({entries.length} sprints)</span>
      </button>
      {open && (
        <div className="space-y-3">
          {entries.map(({ sprint, suggestedSP, totalSP }) => (
            <SprintGoalRow key={sprint.id} sprint={sprint} suggestedSP={suggestedSP} totalSP={totalSP} />
          ))}
        </div>
      )}
    </section>
  )
}

function SprintGoalRow({ sprint, suggestedSP, totalSP }: { sprint: SprintCache; suggestedSP: number; totalSP: number }) {
  const readOnly = sprint.state === 'closed'
  const [goal, setGoal] = useState(sprint.goal ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const isDirty = !readOnly && goal !== (sprint.goal ?? '')

  async function save() {
    if (readOnly) return
    setSaveState('saving')
    setErrorMsg('')
    try {
      const res = await fetch('/api/jira/sprint-goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprintId: sprint.id, goal }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSaveState('saved')
      sprint.goal = goal
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (err) {
      setErrorMsg(String(err))
      setSaveState('error')
    }
  }

  const stateColor = {
    idle: isDirty ? 'text-indigo-600 hover:text-indigo-800' : 'text-gray-300 cursor-default',
    saving: 'text-gray-400',
    saved: 'text-green-600',
    error: 'text-red-500',
  }[saveState]

  return (
    <div className={`border rounded-lg p-4 ${readOnly ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-gray-800">{sprint.name}</span>
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
            sprint.state === 'active' ? 'bg-green-100 text-green-700' :
            sprint.state === 'future' ? 'bg-indigo-50 text-indigo-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {sprint.state}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-indigo-600">{suggestedSP}</span>
            <span className="text-gray-400"> / {totalSP} SP</span>
          </span>
          {readOnly
            ? <span className="text-xs text-gray-400 italic">Read-only</span>
            : <>
                {saveState === 'error' && <span className="text-xs text-red-500">{errorMsg}</span>}
                <button
                  onClick={save}
                  disabled={saveState === 'saving' || !isDirty}
                  title={isDirty ? 'Save to Jira' : 'No changes'}
                  className={`flex items-center gap-1 text-xs font-medium transition-colors ${stateColor}`}
                >
                  {saveState === 'saving' && <Spinner size={14} weight="duotone" className="animate-spin" />}
                  {saveState === 'saved' && <CheckCircle size={14} weight="duotone" />}
                  {saveState === 'error' && <WarningCircle size={14} weight="duotone" />}
                  {saveState === 'idle' && <FloppyDisk size={14} weight="duotone" />}
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : 'Save to Jira'}
                </button>
              </>
          }
        </div>
      </div>
      {sprint.startDate && (
        <p className="text-xs text-gray-400 mb-2">{sprint.startDate} → {sprint.endDate}</p>
      )}
      <textarea
        value={goal}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => { setGoal(e.target.value); setSaveState('idle') }}
        onKeyDown={readOnly ? undefined : (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
        placeholder={readOnly ? '—' : 'No sprint goal set…'}
        rows={3}
        className={`w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none placeholder-gray-300 ${
          readOnly
            ? 'text-gray-500 bg-gray-50 border-gray-100 cursor-default'
            : 'text-gray-700 border-gray-200 focus:ring-2 focus:ring-indigo-400'
        }`}
      />
      {isDirty && <p className="text-xs text-gray-400 mt-1">⌘↵ or Ctrl+↵ to save</p>}
    </div>
  )
}

export default function SprintGoalsPage() {
  const [entries, setEntries] = useState<SprintEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/capacity')
      .then((r) => r.json())
      .then((data) => {
        const matrix = data.matrix ?? []
        setEntries(matrix.map((sc: { sprint: SprintCache; suggestedSP: number; totalSP: number }) => ({
          sprint: sc.sprint,
          suggestedSP: sc.suggestedSP,
          totalSP: sc.totalSP,
        })))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>
  if (!entries.length) return <p className="text-sm text-gray-500">No sprints loaded. Sync from Jira first.</p>

  const activeSprint = entries.find((e) => e.sprint.state === 'active')?.sprint
  const currentQ = activeSprint ? extractQuarter(activeSprint.name) : null

  // Collect unique quarters sorted descending (most recent first)
  const quarters = Array.from(
    new Set(entries.map((e) => extractQuarter(e.sprint.name) ?? 'Other'))
  ).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Sprint Goals</h1>
        <p className="text-sm text-gray-500 mt-1">Edit goals and save them directly to Jira.</p>
      </div>

      <div className="space-y-4">
        {quarters.map((quarter) => {
          const quarterEntries = entries
            .filter((e) => extractQuarter(e.sprint.name) === quarter)
            .sort((a, b) => (a.sprint.startDate ?? '').localeCompare(b.sprint.startDate ?? ''))
          const isCurrent = quarter === currentQ

          return (
            <QuarterSection
              key={quarter}
              quarter={quarter}
              isCurrent={isCurrent}
              entries={quarterEntries}
              defaultOpen={isCurrent}
            />
          )
        })}
      </div>
    </div>
  )
}
