'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BellRinging } from '@phosphor-icons/react'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

function JiraLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M11.53 2a5.53 5.53 0 00-5.53 5.53v.32H2.32A5.53 5.53 0 007.85 13.38h.68v3.09A5.53 5.53 0 0014.06 22h.32v-3.68h-.32a1.85 1.85 0 01-1.85-1.85v-3.09h3.69A5.53 5.53 0 0021.43 7.85h-3.68v-.32A5.53 5.53 0 0012.22 2h-.69z"
        fill="url(#jira-grad)"
      />
      <defs>
        <linearGradient id="jira-grad" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function SettingsPage() {
  const [teamName, setTeamName] = useState('')
  const [valueStream, setValueStream] = useState('')
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [teamSaveStatus, setTeamSaveStatus] = useState<'idle' | 'saved'>('idle')

  const [manager, setManager] = useState({ name: '', email: '' })
  const [managerSaveStatus, setManagerSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [fields, setFields] = useState({
    JIRA_BASE_URL: '',
    JIRA_API_TOKEN: '',
    JIRA_PROJECT_KEY: '',
    JIRA_PM_PROJECT_KEY: '',
  })
  const [hasToken, setHasToken] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [rootly, setRootly] = useState({
    ROOTLY_TOKEN: '',
    oncall_schedule_id: '',
  })
  const [hasRootlyToken, setHasRootlyToken] = useState(false)
  const [rootlySaveStatus, setRootlySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [syncMsg, setSyncMsg] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle')

  const [eomToken, setEomToken] = useState('')
  const [hasEomToken, setHasEomToken] = useState(false)
  const [eomTokenStatus, setEomTokenStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [eomSyncStatus, setEomSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [eomSyncMsg, setEomSyncMsg] = useState('')
  const [eomLastSynced, setEomLastSynced] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/setup/env').then((r) => r.json()).then((d) => {
      setManager({ name: d.oncall_supervisor ?? '', email: d.JIRA_EMAIL ?? '' })
      setFields({
        JIRA_BASE_URL: d.JIRA_BASE_URL,
        JIRA_API_TOKEN: d.JIRA_API_TOKEN,
        JIRA_PROJECT_KEY: d.JIRA_PROJECT_KEY,
        JIRA_PM_PROJECT_KEY: d.JIRA_PM_PROJECT_KEY,
      })
      setHasToken(d.hasToken)
      setValueStream(d.oncall_department ?? '')
      setRootly({
        ROOTLY_TOKEN: d.ROOTLY_TOKEN,
        oncall_schedule_id: d.oncall_schedule_id,
      })
      setHasRootlyToken(d.hasRootlyToken)
    })
    fetch('/api/active-team').then((r) => r.json()).then((d) => {
      setActiveTeamId(d.activeTeamId)
      const active = d.teams.find((t: { id: string; name: string }) => t.id === d.activeTeamId)
      if (active) setTeamName(active.name)
    })
    fetch('/api/eom/env').then((r) => r.json()).then((d) => {
      setHasEomToken(d.hasToken)
      if (d.EOM_TOKEN) setEomToken(d.EOM_TOKEN)
    })
    fetch('/api/config').then((r) => r.json()).then((d) => {
      if (d.eom_last_synced) setEomLastSynced(d.eom_last_synced)
    })
  }, [])

  async function saveManager() {
    setManagerSaveStatus('saving')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oncall_supervisor: manager.name, JIRA_EMAIL: manager.email }),
    })
    setManagerSaveStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setManagerSaveStatus('idle'), 2500)
  }

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }))
      if (key === 'JIRA_API_TOKEN') setHasToken(false)
      setSaveStatus('idle')
    }
  }

  async function save() {
    setSaveStatus('saving')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, JIRA_EMAIL: manager.email }),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setSaveStatus('idle'), 2500)
  }

  async function saveTeam() {
    if (!activeTeamId || !teamName.trim()) return
    const [nameRes, vsRes] = await Promise.all([
      fetch('/api/active-team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeTeamId, name: teamName.trim() }),
      }),
      fetch('/api/setup/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oncall_department: valueStream.trim() }),
      }),
    ])
    if (nameRes.ok && vsRes.ok) {
      setTeamSaveStatus('saved')
      setTimeout(() => setTeamSaveStatus('idle'), 2500)
    }
  }

  function setRootlyField(key: keyof typeof rootly) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setRootly((r) => ({ ...r, [key]: e.target.value }))
      if (key === 'ROOTLY_TOKEN') setHasRootlyToken(false)
      setRootlySaveStatus('idle')
    }
  }

  async function saveRootly() {
    setRootlySaveStatus('saving')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rootly),
    })
    setRootlySaveStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setRootlySaveStatus('idle'), 2500)
  }

  async function deleteTeam() {
    if (!activeTeamId) return
    setDeleteStatus('deleting')
    const res = await fetch('/api/teams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeTeamId }),
    })
    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      const json = await res.json()
      alert(json.error ?? 'Could not delete team')
      setDeleteStatus('error')
      setDeleteConfirm(false)
    }
  }

  async function sync() {
    setSyncStatus('syncing')
    setSyncMsg('')
    const res = await fetch('/api/jira/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setSyncStatus('ok')
      setSyncMsg(`Synced ${json.sprintCount} sprint${json.sprintCount !== 1 ? 's' : ''}`)
    } else {
      setSyncStatus('error')
      setSyncMsg(json.error ?? 'Sync failed')
    }
  }

  async function saveEomToken() {
    if (!eomToken.trim() || eomTokenStatus === 'saving') return
    setEomTokenStatus('saving')
    const res = await fetch('/api/eom/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: eomToken }),
    })
    if (res.ok) {
      setHasEomToken(true)
      setEomToken('')
      setEomTokenStatus('saved')
      setTimeout(() => setEomTokenStatus('idle'), 2500)
    } else {
      setEomTokenStatus('error')
    }
  }

  async function syncEom() {
    setEomSyncStatus('syncing')
    setEomSyncMsg('')
    const res = await fetch('/api/eom/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setEomSyncStatus('ok')
      setEomSyncMsg(`Synced ${json.synced} member${json.synced !== 1 ? 's' : ''}`)
      setEomLastSynced(json.synced_at)
    } else {
      setEomSyncStatus('error')
      setEomSyncMsg(json.error ?? 'Sync failed')
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Team</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Team name</label>
            <input
              className={inputCls}
              placeholder="Team name"
              value={teamName}
              onChange={(e) => { setTeamName(e.target.value); setTeamSaveStatus('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTeam() }}
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Value Stream</label>
            <input
              className={inputCls}
              placeholder="e.g. Web & Mobile"
              value={valueStream}
              onChange={(e) => { setValueStream(e.target.value); setTeamSaveStatus('idle') }}
            />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button size="sm" onClick={saveTeam} disabled={!teamName.trim()}>Save</Button>
            {teamSaveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Manager</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                className={inputCls}
                placeholder="Your full name"
                value={manager.name}
                onChange={(e) => { setManager((m) => ({ ...m, name: e.target.value })); setManagerSaveStatus('idle') }}
              />
              <p className="text-xs text-gray-400 mt-1">Used to filter direct reports in EOM and as supervisor in on-call reports.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                className={inputCls}
                placeholder="you@outsystems.com"
                type="email"
                value={manager.email}
                onChange={(e) => { setManager((m) => ({ ...m, email: e.target.value })); setManagerSaveStatus('idle') }}
              />
              <p className="text-xs text-gray-400 mt-1">Used for Jira authentication.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button size="sm" onClick={saveManager} disabled={managerSaveStatus === 'saving'}>
              {managerSaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {managerSaveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
            {managerSaveStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
          </div>
        </div>
      </div>

      {/* Integrations — side by side */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Jira */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <JiraLogo />
            <h2 className="text-sm font-semibold text-gray-700">Jira</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Credentials stored in <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
              <input className={inputCls} placeholder="https://your-org.atlassian.net" value={fields.JIRA_BASE_URL} onChange={set('JIRA_BASE_URL')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Token
                <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline text-xs">
                  Get one →
                </a>
              </label>
              <input
                className={inputCls}
                type="password"
                placeholder={hasToken ? 'Token saved — enter new value to replace' : 'Paste your API token'}
                value={fields.JIRA_API_TOKEN}
                onChange={set('JIRA_API_TOKEN')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Key</label>
              <input className={inputCls} placeholder="e.g. RAR, PROJ" value={fields.JIRA_PROJECT_KEY} onChange={set('JIRA_PROJECT_KEY')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PM Project Key</label>
              <input className={inputCls} placeholder="e.g. PLAT, PM" value={fields.JIRA_PM_PROJECT_KEY} onChange={set('JIRA_PM_PROJECT_KEY')} />
              <p className="text-xs text-gray-400 mt-1">Project containing Value Milestones (for Roadmap page)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <Button size="sm" onClick={save} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {saveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
            {saveStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
          </div>
        </div>

        {/* Rootly */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-5 h-5 flex items-center justify-center rounded bg-red-500 text-white">
              <BellRinging size={12} weight="fill" />
            </div>
            <h2 className="text-sm font-semibold text-gray-700">Rootly</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Required for On-Call tracker. Token stored in <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Token
                <a href="https://docs.rootly.com/integrations/api#generate-an-api-key" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline text-xs">
                  Get one →
                </a>
              </label>
              <input
                className={inputCls}
                type="password"
                placeholder={hasRootlyToken ? 'Token saved — enter new value to replace' : 'Paste your Rootly API token'}
                value={rootly.ROOTLY_TOKEN}
                onChange={setRootlyField('ROOTLY_TOKEN')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule ID</label>
              <input
                className={inputCls}
                placeholder="e.g. e40f4393-64c7-4acd-9bad-48e15c63ac2c"
                value={rootly.oncall_schedule_id}
                onChange={setRootlyField('oncall_schedule_id')}
              />
              <p className="text-xs text-gray-400 mt-1">From the Rootly schedule edit page URL.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <Button size="sm" onClick={saveRootly} disabled={rootlySaveStatus === 'saving'}>
              {rootlySaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {rootlySaveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
            {rootlySaveStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* EOM */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-5 h-5 flex items-center justify-center rounded bg-indigo-600 text-white text-[9px] font-bold leading-none">OS</div>
            <h2 className="text-sm font-semibold text-gray-700">EOM</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Sync team members from the Engineering Org Management directory. Token stored in{' '}
            <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Token
                <a href="https://apps.outsystems.app/EOM/TokenGeneration" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline text-xs">
                  Get one →
                </a>
              </label>
              <input
                className={inputCls}
                type="password"
                placeholder="Paste your EOM token"
                value={eomToken}
                onChange={(e) => { setEomToken(e.target.value); setHasEomToken(false); setEomTokenStatus('idle') }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <Button size="sm" onClick={saveEomToken} disabled={eomTokenStatus === 'saving'}>
              {eomTokenStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {eomTokenStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
            {eomTokenStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
          </div>

          <div className="border-t border-gray-100 pt-4 mt-5">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={syncEom} disabled={eomSyncStatus === 'syncing'}>
                {eomSyncStatus === 'syncing' ? 'Syncing…' : 'Sync from EOM'}
              </Button>
              {eomSyncStatus === 'ok' && <span className="text-sm text-green-600">✓ {eomSyncMsg}</span>}
              {eomSyncStatus === 'error' && <span className="text-sm text-red-600">{eomSyncMsg}</span>}
            </div>
            {eomLastSynced && (
              <p className="text-xs text-gray-400 mt-2">
                Last synced {new Date(eomLastSynced).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Sync Sprint Data */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Sync Sprint Data</h2>
          <p className="text-xs text-gray-400 mb-4">Pull the latest sprint and velocity data from Jira.</p>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={sync} disabled={syncStatus === 'syncing'}>
              {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
            </Button>
            {syncStatus === 'ok' && <span className="text-sm text-green-600">✓ {syncMsg}</span>}
            {syncStatus === 'error' && <span className="text-sm text-red-600">{syncMsg}</span>}
          </div>
        </div>
      </div>

      <div className="border border-red-200 rounded-xl p-6 max-w-lg mt-4">
        <h2 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-400 mb-4">Permanently delete this team and all its data. This cannot be undone.</p>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-sm text-red-600 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
          >
            Delete team…
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={deleteTeam}
              disabled={deleteStatus === 'deleting'}
              className="text-sm text-white bg-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteStatus === 'deleting' ? 'Deleting…' : `Yes, delete "${teamName}"`}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
