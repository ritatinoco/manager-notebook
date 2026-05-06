'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { SprintCapacity, TeamMetrics } from '@/lib/capacity/calculations'
import type { Config } from '@/lib/data/config'
import VelocityChart from '@/components/velocity/VelocityChart'

interface CapacityResponse {
  matrix: SprintCapacity[]
  teamMetrics: TeamMetrics
  config: Config
  syncedAt: string | null
  hasSprints: boolean
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

export default function VelocityPage() {
  const [data, setData] = useState<CapacityResponse | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/capacity')
    if (res.ok) setData(await res.json())
  }

  useEffect(() => { load() }, [])

  async function syncJira() {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/jira/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setSyncResult(`Synced ${json.sprintCount} sprints from Jira`)
      load()
    } else {
      setSyncResult(`Error: ${json.error}`)
    }
    setSyncing(false)
  }

  const chartData = (data?.matrix ?? [])
    .filter((sc) => sc.sprint.committedSP > 0 || sc.sprint.deliveredSP > 0)
    .map((sc) => ({
      sprint: sc.sprint.name,
      initialCommit: sc.sprint.initialCommittedSP || null,
      committed: sc.sprint.committedSP || null,
      delivered: sc.sprint.deliveredSP || null,
      capacity: sc.totalSP,
    }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Velocity</h1>
          {data?.syncedAt && (
            <p className="text-xs text-gray-400 mt-0.5">Last synced {new Date(data.syncedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {syncResult && <span className={`text-sm ${syncResult.startsWith('Error') ? 'text-red-600' : 'text-gray-500'}`}>{syncResult}</span>}
          <Button size="sm" variant="secondary" onClick={syncJira} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync from Jira'}
          </Button>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <VelocityChart data={chartData} />
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center mb-8">
          <p className="text-gray-500 text-sm">No velocity data yet. Click &quot;Sync from Jira&quot; to pull your sprint history.</p>
        </div>
      )}

      {data?.hasSprints && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sprint</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dates</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Suggested</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Initial Commit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Final Commit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Delivered</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Capacity SP</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Velocity</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Devs</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">SP/dev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const currentQ = data.matrix.find((s) => s.sprint.state === 'active')?.sprint.name.match(/(\d{2}\.Q\d)/)?.[1]
                return data.matrix.filter((sc) => currentQ ? sc.sprint.name.includes(currentQ) : true)
              })().map((sc) => {
                const velocity =
                  sc.sprint.committedSP > 0
                    ? (sc.sprint.deliveredSP / sc.sprint.committedSP).toFixed(2)
                    : '—'
                const devCount = sc.members.filter((m) => m.availableDays > 0).length
                const spPerDev = devCount > 0 && sc.totalSP > 0 ? (sc.totalSP / devCount).toFixed(1) : '—'
                const stateColor = sc.sprint.state === 'active' ? 'text-green-700 bg-green-50' : sc.sprint.state === 'future' ? 'text-blue-600 bg-blue-50' : ''
                return (
                  <tr key={sc.sprint.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {sc.sprint.name}
                      {sc.sprint.state !== 'closed' && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${stateColor}`}>{sc.sprint.state}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sc.sprint.startDate} → {sc.sprint.endDate}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmt(sc.suggestedSP)}</td>
                    <td className="px-4 py-3 text-right">{sc.sprint.initialCommittedSP > 0 ? fmt(sc.sprint.initialCommittedSP) : '—'}</td>
                    <td className="px-4 py-3 text-right">{sc.sprint.committedSP > 0 ? fmt(sc.sprint.committedSP) : '—'}</td>
                    <td className="px-4 py-3 text-right">{sc.sprint.deliveredSP > 0 ? fmt(sc.sprint.deliveredSP) : '—'}</td>
                    <td className="px-4 py-3 text-right">{fmt(sc.totalSP)}</td>
                    <td className="px-4 py-3 text-right">{velocity}</td>
                    <td className="px-4 py-3 text-right">{devCount}</td>
                    <td className="px-4 py-3 text-right">{spPerDev}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
