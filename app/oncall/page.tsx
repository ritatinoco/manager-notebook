'use client'

import { useEffect, useState } from 'react'
import { ArrowClockwise, CopySimple } from '@phosphor-icons/react'
import type { OnCallRow } from '@/app/api/oncall/route'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function OnCallPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState<OnCallRow[] | null>(null)
  const [approvals, setApprovals] = useState<Record<number, string>>({})
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/oncall/cache').then((r) => r.json()).then((d) => {
      if (!d) return
      setRows(d.rows)
      setFetchedAt(d.fetchedAt)
      setMonth(d.month ? MONTHS.indexOf(d.month) + 1 : now.getMonth() + 1)
      setYear(d.year ?? now.getFullYear())
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/oncall?month=${month}&year=${year}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      setRows(data.rows)
      setFetchedAt(data.fetchedAt)
      setApprovals({})
    } catch (e) {
      setError(String(e))
      setRows(null)
    } finally {
      setLoading(false)
    }
  }

  function setApproval(idx: number, value: string) {
    setApprovals((prev) => ({ ...prev, [idx]: value }))
  }

  function copyTSV() {
    if (!rows) return
    const lines = rows.map((r) =>
      [
        r.employeeNumber,
        r.firstName,
        r.lastName,
        r.department,
        r.country,
        r.month,
        r.weekdayDays,
        r.weekendDays,
        r.supervisor,
      ].join('\t')
    )
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">On-Call Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fetch from Rootly and copy to the payroll spreadsheet.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {MONTHS.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <ArrowClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching...' : 'Fetch from Rootly'}
        </button>
        {rows && rows.length > 0 && (
          <button
            onClick={copyTSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded text-sm font-medium hover:bg-gray-50"
          >
            <CopySimple size={16} weight="bold" />
            {copied ? 'Copied!' : 'Copy as TSV'}
          </button>
        )}
        {fetchedAt && (
          <span className="text-xs text-gray-400">
            Last fetched {new Date(fetchedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {rows !== null && rows.length > 0 && (() => {
        const daysInMonth = new Date(year, month, 0).getDate()
        const totalCovered = rows.reduce((sum, r) => sum + r.weekdayDays + r.weekendDays, 0)
        const covered = totalCovered === daysInMonth
        return (
          <div className={`mb-4 flex items-center gap-4 px-4 py-3 rounded-lg border text-sm ${covered ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{daysInMonth}</span> days in {MONTHS[month - 1]} {year}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-600">
              Total on-call days: <span className="font-medium text-gray-900">{totalCovered}</span>
            </span>
            <span className="text-gray-300">·</span>
            <span className={covered ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
              {covered ? '✓ Full coverage' : `${totalCovered > daysInMonth ? '+' : ''}${totalCovered - daysInMonth} days ${totalCovered > daysInMonth ? 'over' : 'missing'}`}
            </span>
          </div>
        )
      })()}

      {rows !== null && (
        rows.length === 0 ? (
          <p className="text-sm text-gray-500">No on-call data found for this period.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
            <table className="text-sm min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Emp #', 'First Name', 'Last Name', 'Department', 'Country', 'Month', 'Weekdays', 'Weekends', 'Supervisor'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => {
                  const approval = approvals[i] ?? ''
                  return (
                    <tr key={i} className={`${approval === 'Approved' ? 'bg-green-50' : approval === 'Not Approved' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-2 text-gray-500">{row.employeeNumber}</td>
                      <td className="px-4 py-2 font-medium">{row.firstName}</td>
                      <td className="px-4 py-2 font-medium">{row.lastName}</td>
                      <td className="px-4 py-2 text-gray-500">{row.department}</td>
                      <td className="px-4 py-2 text-gray-500">{row.country}</td>
                      <td className="px-4 py-2 text-gray-500">{row.month}</td>
                      <td className="px-4 py-2 text-center font-mono">{row.weekdayDays}</td>
                      <td className="px-4 py-2 text-center font-mono">{row.weekendDays}</td>
                      <td className="px-4 py-2 text-gray-500">{row.supervisor}</td>
                      <td className="px-4 py-2">
                        <select
                          value={approval}
                          onChange={(e) => setApproval(i, e.target.value)}
                          className={`border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            approval === 'Approved' ? 'border-green-300 bg-green-50 text-green-700' :
                            approval === 'Not Approved' ? 'border-red-300 bg-red-50 text-red-700' :
                            'border-gray-200 bg-white text-gray-400'
                          }`}
                        >
                          <option value=""></option>
                          <option value="Approved">Approved</option>
                          <option value="Not Approved">Not Approved</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
