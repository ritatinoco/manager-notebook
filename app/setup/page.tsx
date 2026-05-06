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

const STEPS = ['Team Members', 'Local Holidays', 'Jira Connection', 'Rootly (On-Call)']

// ── Step 1: Team Members ──────────────────────────────────────────────────────

function StepTeam({
  members,
  onChange,
}: {
  members: MemberConfig[]
  onChange: (members: MemberConfig[]) => void
}) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('PT')

  // EOM import state
  const [eomOpen, setEomOpen] = useState(false)
  const [eomToken, setEomToken] = useState('')
  const [eomManager, setEomManager] = useState('')
  const [eomStatus, setEomStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [eomError, setEomError] = useState('')

  function add() {
    if (!name.trim()) return
    onChange([...members, { name: name.trim(), sp_per_day: 1.4, jira_account_id: null, country }])
    setName('')
    setCountry('PT')
  }

  function remove(idx: number) {
    onChange(members.filter((_, i) => i !== idx))
  }

  async function fetchFromEom() {
    if (!eomToken.trim() || !eomManager.trim()) {
      setEomError('Both manager name and EOM token are required.')
      return
    }
    setEomStatus('loading')
    setEomError('')

    const tokenRes = await fetch('/api/eom/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: eomToken.trim() }),
    })
    if (!tokenRes.ok) {
      setEomStatus('error')
      setEomError('Failed to save EOM token.')
      return
    }

    await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oncall_supervisor: eomManager.trim() }),
    })

    const syncRes = await fetch('/api/eom/sync', { method: 'POST' })
    const json = await syncRes.json()

    if (!syncRes.ok) {
      setEomStatus('error')
      setEomError(json.error ?? 'EOM sync failed.')
      return
    }

    onChange(json.members ?? [])
    setEomStatus('ok')
    setEomOpen(false)
  }

  const selectCls = 'border border-gray-300 rounded px-2 py-1 text-sm bg-white'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Add everyone on your team. You can always update this later from the Team page.</p>

      {/* EOM Import */}
      <div className="border border-dashed border-indigo-200 rounded-lg bg-indigo-50/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-indigo-700">Import from EOM</span>
            <span className="text-xs text-gray-400 ml-2">Auto-fill your team from OutSystems EOM</span>
          </div>
          <button
            onClick={() => { setEomOpen(!eomOpen); setEomStatus('idle'); setEomError('') }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {eomOpen ? 'Cancel' : 'Set up →'}
          </button>
        </div>

        {eomOpen && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Your name in EOM (used to find your direct reports)</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="e.g. Rita Tinoco"
                value={eomManager}
                onChange={(e) => setEomManager(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                EOM Token
                <a href="https://apps.outsystems.app/EOM/TokenGeneration" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline">
                  Generate one →
                </a>
              </label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                type="password"
                placeholder="Paste your EOM token"
                value={eomToken}
                onChange={(e) => setEomToken(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={fetchFromEom} disabled={eomStatus === 'loading'}>
                {eomStatus === 'loading' ? 'Fetching…' : 'Fetch team'}
              </Button>
              {eomStatus === 'error' && <span className="text-sm text-red-600">{eomError}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Members list */}
      {members.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Country</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-medium">{m.name}</td>
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

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Manual add form */}
      <div className="flex gap-3 items-end bg-gray-50 border border-gray-200 rounded-lg p-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" onKeyDown={(e) => e.key === 'Enter' && add()} />
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
      <p className="text-xs text-gray-400 mb-4">National holidays (PT, US) are handled automatically per member country.</p>

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

interface JiraProject { key: string; name: string; boardId: number }

function StepJira({ onVelocityDetected }: { onVelocityDetected: (v: number) => void }) {
  const [creds, setCreds] = useState({ JIRA_BASE_URL: '', JIRA_EMAIL: '', JIRA_API_TOKEN: '' })
  const [hasToken, setHasToken] = useState(false)

  // Phase: 'credentials' → 'projects' → 'connected'
  const [phase, setPhase] = useState<'credentials' | 'projects' | 'connected'>('credentials')
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'syncing' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/setup/env').then((r) => r.json()).then((d) => {
      setCreds({ JIRA_BASE_URL: d.JIRA_BASE_URL, JIRA_EMAIL: d.JIRA_EMAIL, JIRA_API_TOKEN: d.JIRA_API_TOKEN })
      setHasToken(d.hasToken)
      if (d.JIRA_PROJECT_KEY) {
        setSelectedKey(d.JIRA_PROJECT_KEY)
        setPhase('projects')
      }
    })
  }, [])

  function setCred(key: keyof typeof creds) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setCreds((c) => ({ ...c, [key]: e.target.value }))
      if (key === 'JIRA_API_TOKEN') setHasToken(false)
      if (phase !== 'credentials') setPhase('credentials')
    }
  }

  async function fetchProjects() {
    setStatus('loading')
    setMessage('')

    // Save credentials first
    const saveRes = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    })
    if (!saveRes.ok) {
      setStatus('error')
      setMessage('Failed to save credentials.')
      return
    }

    const res = await fetch('/api/jira/projects')
    const json = await res.json()

    if (!res.ok) {
      setStatus('error')
      setMessage(json.error ?? 'Could not reach Jira. Check your URL and credentials.')
      return
    }

    setProjects(json.projects ?? [])
    setPhase('projects')
    setStatus('idle')
    if (json.projects?.length === 1) setSelectedKey(json.projects[0].key)
  }

  async function connect() {
    if (!selectedKey) return
    setStatus('syncing')
    setMessage('')

    // Save selected project key
    await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ JIRA_PROJECT_KEY: selectedKey }),
    })

    try {
      const res = await fetch('/api/jira/sync', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setPhase('connected')
        setStatus('idle')
        setMessage(`Loaded ${json.sprintCount} sprint${json.sprintCount !== 1 ? 's' : ''}.`)
        if (json.avgDeliveredSP > 0) onVelocityDetected(json.avgDeliveredSP)
      } else {
        setStatus('error')
        setMessage(json.error ?? 'Sync failed. Check your project key.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error.')
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const busy = status === 'loading' || status === 'syncing'

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Connect to Jira to pull sprint history and auto-detect your team velocity.
        Credentials are saved to <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code>.
      </p>

      {/* Credentials */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Jira Base URL</label>
          <input className={inputCls} placeholder="https://your-org.atlassian.net" value={creds.JIRA_BASE_URL} onChange={setCred('JIRA_BASE_URL')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input className={inputCls} placeholder="you@company.com" type="email" value={creds.JIRA_EMAIL} onChange={setCred('JIRA_EMAIL')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            API Token
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline">
              Get one →
            </a>
          </label>
          <input
            className={inputCls}
            placeholder={hasToken ? 'Token saved — enter new value to replace' : 'Paste your API token'}
            type="password"
            value={creds.JIRA_API_TOKEN}
            onChange={setCred('JIRA_API_TOKEN')}
          />
        </div>
        <Button size="sm" onClick={fetchProjects} disabled={busy}>
          {status === 'loading' ? 'Connecting…' : 'Connect →'}
        </Button>
        {status === 'error' && phase === 'credentials' && <p className="text-sm text-red-600">{message}</p>}
      </div>

      {/* Project picker */}
      {phase !== 'credentials' && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            {projects.length > 0 ? (
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={selectedKey}
                onChange={(e) => { setSelectedKey(e.target.value); if (phase === 'connected') setPhase('projects') }}
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                ))}
              </select>
            ) : (
              <input
                className={inputCls}
                placeholder="e.g. RAR, PROJ"
                value={selectedKey}
                onChange={(e) => { setSelectedKey(e.target.value); if (phase === 'connected') setPhase('projects') }}
              />
            )}
          </div>

          {phase === 'connected' ? (
            <p className="text-sm text-green-600 font-medium">✓ {message}</p>
          ) : (
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={connect} disabled={busy || !selectedKey}>
                {status === 'syncing' ? 'Syncing…' : 'Sync sprints →'}
              </Button>
              {status === 'error' && phase === 'projects' && <span className="text-sm text-red-600">{message}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 4: Rootly (On-Call) ──────────────────────────────────────────────────

function StepRootly() {
  const [token, setToken] = useState('')
  const [scheduleId, setScheduleId] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/setup/env').then((r) => r.json()).then((d) => {
      setToken(d.ROOTLY_TOKEN ?? '')
      setHasToken(d.hasRootlyToken)
      setScheduleId(d.oncall_schedule_id ?? '')
    })
  }, [])

  async function save() {
    setStatus('saving')
    setMessage('')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ROOTLY_TOKEN: token.trim(), oncall_schedule_id: scheduleId.trim() }),
    })
    if (res.ok) {
      setStatus('saved')
      setHasToken(true)
    } else {
      setStatus('error')
      setMessage('Failed to save.')
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Connect Rootly to track on-call shifts and factor them into your capacity planning.
        You can skip this and configure it later in Settings.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rootly API Token
            <a href="https://rootly.com/account/api-keys" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline">
              Get one →
            </a>
          </label>
          <input
            className={inputCls}
            type="password"
            placeholder={hasToken ? 'Token saved — enter new value to replace' : 'Paste your Rootly API token'}
            value={token}
            onChange={(e) => { setToken(e.target.value); setHasToken(false); if (status === 'saved') setStatus('idle') }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">On-Call Schedule ID</label>
          <input
            className={inputCls}
            placeholder="e.g. abc123"
            value={scheduleId}
            onChange={(e) => { setScheduleId(e.target.value); if (status === 'saved') setStatus('idle') }}
          />
          <p className="text-xs text-gray-400 mt-1">Find it in the Rootly schedule URL: rootly.com/schedules/<strong>schedule-id</strong></p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        {status === 'saved' && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
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
  const [velocity, setVelocity] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((c) => {
      const hasRealMembers = c.team_members?.length > 0 && c.bootstrapped !== true
      setMembers(hasRealMembers ? [] : (c.team_members ?? []))
      setHolidays(c.local_holidays ?? [])
    })
  }, [])

  async function finish() {
    setSaving(true)
    const body: Record<string, unknown> = {
      team_members: members,
      local_holidays: holidays,
      bootstrapped: true,
    }
    if (velocity > 0) body.team_avg_velocity = velocity

    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    router.push('/dashboard')
  }

  const isLastStep = step === STEPS.length - 1
  const canContinue = step === 0 ? members.length > 0 : true

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
          {step === 2 && <StepJira onVelocityDetected={(v) => setVelocity(v)} />}
          {step === 3 && <StepRootly />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {step > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)}>← Back</Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Skip option for optional steps */}
            {step >= 2 && !isLastStep && (
              <button
                onClick={() => setStep(step + 1)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Skip for now →
              </button>
            )}

            {isLastStep ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={finish}
                  disabled={saving}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  {saving ? 'Saving…' : 'Skip & finish →'}
                </button>
                <Button size="sm" onClick={finish} disabled={saving}>
                  {saving ? 'Saving…' : 'Finish setup →'}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canContinue}>
                Continue →
              </Button>
            )}
          </div>
        </div>

        {step === 0 && members.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">Add at least one team member to continue.</p>
        )}

        {velocity > 0 && step === 2 && (
          <p className="text-center text-xs text-green-600 mt-3">
            Detected average velocity: {velocity} SP/sprint — will be saved to Allocation settings.
          </p>
        )}
      </div>
    </div>
  )
}
