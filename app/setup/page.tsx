'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { MemberConfig, LocalHoliday } from '@/lib/data/config'

const COUNTRIES = [
  { code: 'PT', label: '🇵🇹 Portugal' },
  { code: 'UK', label: '🇬🇧 United Kingdom' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'US', label: '🇺🇸 United States' },
]

const STEPS = ['Team Members', 'Local Holidays', 'Jira Connection']

// ── Step 1: Team Members ──────────────────────────────────────────────────────

function StepTeam({
  members,
  onChange,
}: {
  members: MemberConfig[]
  onChange: (members: MemberConfig[]) => void
}) {
  const [name, setName] = useState('')
  const [sp, setSP] = useState('1.4')
  const [country, setCountry] = useState('PT')

  function add() {
    if (!name.trim()) return
    onChange([...members, { name: name.trim(), sp_per_day: parseFloat(sp) || 1.4, jira_account_id: null, country }])
    setName('')
    setSP('1.4')
    setCountry('PT')
  }

  function remove(idx: number) {
    onChange(members.filter((_, i) => i !== idx))
  }

  const selectCls = 'border border-gray-300 rounded px-2 py-1 text-sm bg-white'

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Add everyone on your team. You can always update this later from the Team page.</p>

      {members.length > 0 && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">SP / day</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Country</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-medium">{m.name}</td>
                  <td className="px-4 py-2 text-gray-600">{m.sp_per_day}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {COUNTRIES.find((c) => c.code === (m.country ?? 'PT'))?.label ?? m.country}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3 items-end bg-gray-50 border border-gray-200 rounded-lg p-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Input label="SP / day" value={sp} onChange={(e) => setSP(e.target.value)} type="number" step="0.1" className="w-24" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Country</label>
          <select className={selectCls} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

// ── Step 2: Local Holidays ────────────────────────────────────────────────────

function StepHolidays({
  holidays,
  onChange,
}: {
  holidays: LocalHoliday[]
  onChange: (holidays: LocalHoliday[]) => void
}) {
  const [date, setDate] = useState('')
  const [holidayName, setHolidayName] = useState('')

  function add() {
    const mmdd = date.trim()
    if (!mmdd || !holidayName.trim()) return
    // Accept YYYY-MM-DD or MM-DD
    const parts = mmdd.split('-')
    const normalized = parts.length === 3 ? `${parts[1]}-${parts[2]}` : mmdd
    onChange([...holidays, { date: normalized, name: holidayName.trim() }])
    setDate('')
    setHolidayName('')
  }

  function remove(idx: number) {
    onChange(holidays.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">Add company or office-specific holidays that aren&apos;t national holidays.</p>
      <p className="text-xs text-gray-400 mb-4">These apply to all team members in Portugal. National holidays (PT, US) are handled automatically based on each member&apos;s country.</p>

      {holidays.length > 0 && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Date (MM-DD)</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {holidays.map((h, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-mono text-gray-700">{h.date}</td>
                  <td className="px-4 py-2 text-gray-700">{h.name}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {holidays.length === 0 && (
        <div className="mb-4 text-sm text-gray-400 italic py-3">No local holidays added. This is optional.</div>
      )}

      <div className="flex gap-3 items-end bg-gray-50 border border-gray-200 rounded-lg p-4">
        <Input label="Date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="MM-DD or YYYY-MM-DD" className="w-44" />
        <Input label="Holiday name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. City Day" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  )
}

// ── Step 3: Jira Connection ───────────────────────────────────────────────────

function StepJira({ onConnected }: { onConnected: () => void }) {
  const [fields, setFields] = useState({ JIRA_BASE_URL: '', JIRA_EMAIL: '', JIRA_API_TOKEN: '', JIRA_PROJECT_KEY: '' })
  const [hasToken, setHasToken] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'syncing' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/setup/env').then((r) => r.json()).then((d) => {
      setFields({ JIRA_BASE_URL: d.JIRA_BASE_URL, JIRA_EMAIL: d.JIRA_EMAIL, JIRA_API_TOKEN: d.JIRA_API_TOKEN, JIRA_PROJECT_KEY: d.JIRA_PROJECT_KEY })
      setHasToken(d.hasToken)
    })
  }, [])

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }))
      if (key === 'JIRA_API_TOKEN') setHasToken(false)
      if (status === 'ok') setStatus('idle')
    }
  }

  async function saveAndSync() {
    setStatus('saving')
    setMessage('')
    const saveRes = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!saveRes.ok) {
      setStatus('error')
      setMessage('Failed to save credentials.')
      return
    }
    setStatus('syncing')
    try {
      const res = await fetch('/api/jira/sync', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setStatus('ok')
        setMessage(`Connected! Loaded ${json.sprintCount} sprint${json.sprintCount !== 1 ? 's' : ''}.`)
        onConnected()
      } else {
        setStatus('error')
        setMessage(json.error ?? 'Connection failed. Check your credentials.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error.')
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const busy = status === 'saving' || status === 'syncing'

  return (
    <div>
      <p className="text-sm text-gray-500 mb-5">
        Connect to Jira to automatically pull your sprint history and velocity data.
        Credentials are saved to <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>.
      </p>

      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jira Base URL</label>
          <input className={inputCls} placeholder="https://your-org.atlassian.net" value={fields.JIRA_BASE_URL} onChange={set('JIRA_BASE_URL')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input className={inputCls} placeholder="you@company.com" type="email" value={fields.JIRA_EMAIL} onChange={set('JIRA_EMAIL')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            API Token
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline">
              Get one →
            </a>
          </label>
          <input className={inputCls} placeholder={hasToken ? 'Token saved — enter new value to replace' : 'Paste your API token'} type="password" value={fields.JIRA_API_TOKEN} onChange={set('JIRA_API_TOKEN')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Project Key</label>
          <input className={inputCls} placeholder="e.g. RAR, PROJ" value={fields.JIRA_PROJECT_KEY} onChange={set('JIRA_PROJECT_KEY')} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button size="sm" onClick={saveAndSync} disabled={busy}>
          {status === 'saving' ? 'Saving…' : status === 'syncing' ? 'Connecting…' : 'Save & Connect'}
        </Button>
        {status === 'ok' && <span className="text-sm text-green-600 font-medium">✓ {message}</span>}
        {status === 'error' && <span className="text-sm text-red-600">{message}</span>}
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [members, setMembers] = useState<MemberConfig[]>([])
  const [holidays, setHolidays] = useState<LocalHoliday[]>([])
  const [jiraConnected, setJiraConnected] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((c) => {
      // Start fresh — don't pre-fill with Rita's defaults so new teams start clean
      const hasRealMembers = c.team_members?.length > 0 && c.bootstrapped !== true
      setMembers(hasRealMembers ? [] : (c.team_members ?? []))
      setHolidays(c.local_holidays ?? [])
    })
  }, [])

  async function finish() {
    setSaving(true)
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_members: members, local_holidays: holidays, bootstrapped: true }),
    })
    router.push('/dashboard')
  }

  const canContinue = step === 0 ? members.length > 0 : true
  const canFinish = jiraConnected

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Capacity Planner</h1>
          <p className="text-gray-500 text-sm">Let&apos;s set up your team in a few quick steps.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                idx < step ? 'bg-indigo-600 text-white' :
                idx === step ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500' :
                'bg-gray-200 text-gray-400'
              }`}>
                {idx < step ? '✓' : idx + 1}
              </div>
              <span className={`text-sm ${idx === step ? 'text-indigo-700 font-medium' : 'text-gray-400'}`}>{label}</span>
              {idx < STEPS.length - 1 && <div className={`flex-1 h-px ${idx < step ? 'bg-indigo-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{STEPS[step]}</h2>
          {step === 0 && <StepTeam members={members} onChange={setMembers} />}
          {step === 1 && <StepHolidays holidays={holidays} onChange={setHolidays} />}
          {step === 2 && <StepJira onConnected={() => setJiraConnected(true)} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {step > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)}>← Back</Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canContinue}>
                Continue →
              </Button>
            ) : (
              <Button size="sm" onClick={finish} disabled={saving || !canFinish}>
                {saving ? 'Saving…' : 'Finish setup →'}
              </Button>
            )}
          </div>
        </div>

        {step === 0 && members.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">Add at least one team member to continue.</p>
        )}
        {step === 2 && !jiraConnected && (
          <p className="text-center text-xs text-gray-400 mt-3">Connect to Jira successfully to finish setup.</p>
        )}
      </div>
    </div>
  )
}
