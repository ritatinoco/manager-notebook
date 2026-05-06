'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Config } from '@/lib/data/config'

const ALLOC_FIELDS = [
  { key: 'features' as const, label: 'Priorities (Features)' },
  { key: 'discovery' as const, label: 'Discovery (HLD)' },
  { key: 'risk' as const, label: 'Risk' },
  { key: 'debts' as const, label: 'Debts and Acceleration' },
  { key: 'support' as const, label: 'Support & Maintenance' },
]

export default function AllocationPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [spPerDay, setSpPerDay] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function load() {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data: Config = await res.json()
      setConfig(data)
      const f: Record<string, string> = {}
      for (const { key } of ALLOC_FIELDS) f[key] = String(Math.round(data.allocations[key] * 100))
      setForm(f)
      setSpPerDay(String(data.sp_per_day))
    }
  }

  useEffect(() => { load() }, [])

  async function save() {
    setError('')
    const sum = ALLOC_FIELDS.reduce((s, { key }) => s + Number(form[key] || 0), 0)
    if (Math.abs(sum - 100) > 0.1) {
      setError(`Allocations must sum to 100%. Currently: ${sum}%`)
      return
    }
    const allocations: Record<string, number> = {}
    for (const { key } of ALLOC_FIELDS) allocations[key] = Number(form[key]) / 100

    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sp_per_day: parseFloat(spPerDay), allocations }),
    })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (!config) return <div className="text-sm text-gray-500">Loading...</div>

  const sum = ALLOC_FIELDS.reduce((s, { key }) => s + Number(form[key] || 0), 0)

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Allocation</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SP / member / day</label>
          <input
            type="number"
            step="0.1"
            value={spPerDay}
            onChange={(e) => setSpPerDay(e.target.value)}
            className="mt-1 block w-24 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <hr className="border-gray-100" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team allocation</p>

        {ALLOC_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-sm text-gray-700 flex-1">{label}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form[key] ?? ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        ))}

        <div className={`flex justify-between text-sm font-semibold pt-1 border-t border-gray-100 ${Math.abs(sum - 100) > 0.1 ? 'text-red-600' : 'text-green-700'}`}>
          <span>Total</span>
          <span>{sum}%</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved!</p>}

        <Button onClick={save} className="w-full justify-center">Save</Button>
      </div>
    </div>
  )
}
