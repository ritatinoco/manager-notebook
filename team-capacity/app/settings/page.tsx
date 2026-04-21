'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

export default function SettingsPage() {
  const [teamName, setTeamName] = useState('')
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [teamNameStatus, setTeamNameStatus] = useState<'idle' | 'saved'>('idle')

  const [fields, setFields] = useState({
    JIRA_BASE_URL: '',
    JIRA_EMAIL: '',
    JIRA_API_TOKEN: '',
    JIRA_PROJECT_KEY: '',
  })
  const [hasToken, setHasToken] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    fetch('/api/setup/env').then((r) => r.json()).then((d) => {
      setFields({
        JIRA_BASE_URL: d.JIRA_BASE_URL,
        JIRA_EMAIL: d.JIRA_EMAIL,
        JIRA_API_TOKEN: d.JIRA_API_TOKEN,
        JIRA_PROJECT_KEY: d.JIRA_PROJECT_KEY,
      })
      setHasToken(d.hasToken)
    })
    fetch('/api/active-team').then((r) => r.json()).then((d) => {
      setActiveTeamId(d.activeTeamId)
      const active = d.teams.find((t: { id: string; name: string }) => t.id === d.activeTeamId)
      if (active) setTeamName(active.name)
    })
  }, [])

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
      body: JSON.stringify(fields),
    })
    setSaveStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setSaveStatus('idle'), 2500)
  }

  async function saveTeamName() {
    if (!activeTeamId || !teamName.trim()) return
    const res = await fetch('/api/active-team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeTeamId, name: teamName.trim() }),
    })
    if (res.ok) {
      setTeamNameStatus('saved')
      setTimeout(() => setTeamNameStatus('idle'), 2500)
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

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Team</h2>
        <p className="text-xs text-gray-400 mb-4">Rename this team as it appears in the sidebar.</p>
        <div className="flex items-center gap-3">
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Team name"
            value={teamName}
            onChange={(e) => { setTeamName(e.target.value); setTeamNameStatus('idle') }}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTeamName() }}
          />
          <Button size="sm" onClick={saveTeamName} disabled={!teamName.trim()}>
            Save
          </Button>
          {teamNameStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Jira Connection</h2>
        <p className="text-xs text-gray-400 mb-5">
          Credentials are stored in <code className="bg-gray-100 px-1 rounded">.env.local</code> and never committed to git.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
            <input className={inputCls} placeholder="https://your-org.atlassian.net" value={fields.JIRA_BASE_URL} onChange={set('JIRA_BASE_URL')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input className={inputCls} placeholder="you@company.com" type="email" value={fields.JIRA_EMAIL} onChange={set('JIRA_EMAIL')} />
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
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Button size="sm" onClick={save} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : 'Save credentials'}
          </Button>
          {saveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
          {saveStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
        </div>
      </div>

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
  )
}
