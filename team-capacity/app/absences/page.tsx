'use client'

import { useEffect, useState } from 'react'
import type { Config } from '@/lib/data/config'
import type { AbsencesData } from '@/lib/data/absences'
import type { HolidayInfo, SprintCapacity } from '@/lib/capacity/calculations'

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

function SprintTable({
  title,
  sprintRows,
  members,
  absences,
  onBlur,
  defaultHidden = false,
}: {
  title: string
  sprintRows: SprintCapacity[]
  members: Config['team_members']
  absences: AbsencesData
  onBlur: (member: string, sprint: string, value: string) => void
  defaultHidden?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultHidden)
  if (sprintRows.length === 0) return null

  return (
    <section className="mb-8">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 hover:text-gray-700"
      >
        <span>{collapsed ? '▶' : '▼'}</span>
        <span>{title}</span>
        <span className="font-normal normal-case tracking-normal text-gray-400">({sprintRows.length} sprints)</span>
      </button>

      {!collapsed && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 w-44">Member</th>
                {sprintRows.map(({ sprint }) => (
                  <th key={sprint.id} className="px-3 py-3 font-medium text-gray-600 text-center whitespace-nowrap min-w-24">
                    <div>{sprint.name}</div>
                    <div
                      className="text-xs text-gray-400 font-normal"
                      title={sprint.startDate && sprint.endDate ? `${sprint.startDate} → ${sprint.endDate}` : undefined}
                    >
                      {sprint.startDate?.slice(5)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Holidays row */}
              <tr className="bg-blue-50 border-b border-blue-100">
                <td className="px-4 py-2 text-blue-700 font-medium sticky left-0 bg-blue-50 text-xs">🇵🇹 Holidays</td>
                {sprintRows.map(({ sprint, holidays }) => (
                  <td key={sprint.id} className="px-3 py-2 text-center text-xs text-blue-700">
                    {holidays.length > 0 ? (
                      <span title={holidays.map((h: HolidayInfo) => h.name).join(', ')}>
                        {holidays.length}d
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
              {members.map((m) => (
                <tr key={m.name} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium sticky left-0 bg-white">{m.name}</td>
                  {sprintRows.map(({ sprint }) => {
                    const days = absences[m.name]?.[sprint.name] ?? 0
                    return (
                      <td key={sprint.id} className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          defaultValue={days || ''}
                          placeholder="0"
                          onBlur={(e) => onBlur(m.name, sprint.name, e.target.value)}
                          className={`w-16 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            days > 0 ? 'bg-amber-50 border-amber-300' : 'border-gray-200'
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AbsencesPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [matrix, setMatrix] = useState<SprintCapacity[]>([])
  const [absences, setAbsences] = useState<AbsencesData>({})

  async function load() {
    const [cRes, aRes, capRes] = await Promise.all([
      fetch('/api/config'),
      fetch('/api/absences'),
      fetch('/api/capacity'),
    ])
    setConfig(await cRes.json())
    setAbsences(await aRes.json())
    const cap = await capRes.json()
    setMatrix(cap.matrix ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleBlur(memberName: string, sprintName: string, value: string) {
    const days = parseFloat(value) || 0
    await fetch('/api/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member: memberName, sprint: sprintName, days }),
    })
    const res = await fetch('/api/absences')
    setAbsences(await res.json())
  }

  if (!config) return <div className="text-sm text-gray-500">Loading...</div>

  const activeSprint = matrix.find((sc) => sc.sprint.state === 'active')
  const currentQ = activeSprint ? extractQuarter(activeSprint.sprint.name) : null
  const futureQ = currentQ ? nextQuarter(currentQ) : null

  const currentQRows = currentQ ? matrix.filter((sc) => extractQuarter(sc.sprint.name) === currentQ) : []
  const futureQRows = futureQ ? matrix.filter((sc) => extractQuarter(sc.sprint.name) === futureQ) : []
  const pastRows = matrix.filter(
    (sc) => extractQuarter(sc.sprint.name) !== currentQ && extractQuarter(sc.sprint.name) !== futureQ
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Absences</h1>
        <p className="text-sm text-gray-500 mt-1">Days off per sprint. Auto-saved on blur.</p>
      </div>

      {matrix.length === 0 ? (
        <p className="text-sm text-gray-500">No sprints loaded. Sync from Jira first.</p>
      ) : (
        <>
          <SprintTable
            title={currentQ ? `Current quarter — ${currentQ}` : 'Current quarter'}
            sprintRows={currentQRows}
            members={config.team_members}
            absences={absences}
            onBlur={handleBlur}
          />
          <SprintTable
            title={futureQ ? `Next quarter — ${futureQ}` : 'Next quarter'}
            sprintRows={futureQRows}
            members={config.team_members}
            absences={absences}
            onBlur={handleBlur}
          />
          <SprintTable
            title="Past sprints"
            sprintRows={pastRows}
            members={config.team_members}
            absences={absences}
            onBlur={handleBlur}
            defaultHidden
          />
        </>
      )}
    </div>
  )
}
