'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ArrowsClockwise, BellRinging, UserCircle } from '@phosphor-icons/react'
import type { Config } from '@/lib/data/config'
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

function JiraLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M11.53 2a5.53 5.53 0 00-5.53 5.53v.32H2.32A5.53 5.53 0 007.85 13.38h.68v3.09A5.53 5.53 0 0014.06 22h.32v-3.68h-.32a1.85 1.85 0 01-1.85-1.85v-3.09h3.69A5.53 5.53 0 0021.43 7.85h-3.68v-.32A5.53 5.53 0 0012.22 2h-.69z"
        fill="url(#jira-grad-s)"
      />
      <defs>
        <linearGradient id="jira-grad-s" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IntegrationsPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 hover:text-gray-700"
      >
        <span>{open ? '▼' : '▶'}</span>
        Integrations
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-4">
          {children}
        </div>
      )}
    </section>
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function SettingsPage() {
  // ── Team ───────────────────────────────────────────────────────────────────
  const [teamName, setTeamName] = useState('')
  const [valueStream, setValueStream] = useState('')
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [teamSaveStatus, setTeamSaveStatus] = useState<'idle' | 'saved'>('idle')

  // ── My Profile ─────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── Sync ───────────────────────────────────────────────────────────────────
  const [jiraSync, setJiraSync] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [jiraSyncMsg, setJiraSyncMsg] = useState('')
  const [eomSync, setEomSync] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [eomSyncMsg, setEomSyncMsg] = useState('')
  const [eomLastSynced, setEomLastSynced] = useState<string | null>(null)
  const [syncAllStatus, setSyncAllStatus] = useState<'idle' | 'syncing'>('idle')

  // ── Integrations ───────────────────────────────────────────────────────────
  const [jiraFields, setJiraFields] = useState({
    JIRA_BASE_URL: '',
    JIRA_API_TOKEN: '',
    JIRA_PROJECT_KEY: '',
    JIRA_PM_PROJECT_KEY: '',
  })
  const [hasJiraToken, setHasJiraToken] = useState(false)
  const [jiraSaveStatus, setJiraSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [rootlyFields, setRootlyFields] = useState({ ROOTLY_TOKEN: '', oncall_schedule_id: '' })
  const [hasRootlyToken, setHasRootlyToken] = useState(false)
  const [rootlySaveStatus, setRootlySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [eomToken, setEomToken] = useState('')
  const [hasEomToken, setHasEomToken] = useState(false)
  const [eomTokenStatus, setEomTokenStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [snowflakeFields, setSnowflakeFields] = useState({
    SNOWFLAKE_ACCOUNT: '',
    SNOWFLAKE_USER: '',
    SNOWFLAKE_TOKEN: '',
  })

  const [sfConnections, setSfConnections] = useState<{ id: string; name: string; database: string; warehouse: string; schema: string }[]>([])
  const [sfConnForm, setSfConnForm] = useState<{ name: string; database: string; warehouse: string; schema: string } | null>(null)
  const [sfConnEditId, setSfConnEditId] = useState<string | null>(null)
  const [hasSnowflakeToken, setHasSnowflakeToken] = useState(false)
  const [snowflakeSaveStatus, setSnowflakeSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── Danger Zone ────────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle')

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/setup/env').then((r) => r.json()).then((d) => {
      setJiraFields({
        JIRA_BASE_URL: d.JIRA_BASE_URL ?? '',
        JIRA_API_TOKEN: d.JIRA_API_TOKEN ?? '',
        JIRA_PROJECT_KEY: d.JIRA_PROJECT_KEY ?? '',
        JIRA_PM_PROJECT_KEY: d.JIRA_PM_PROJECT_KEY ?? '',
      })
      setHasJiraToken(d.hasToken)
      setValueStream(d.oncall_department ?? '')
      setRootlyFields({ ROOTLY_TOKEN: d.ROOTLY_TOKEN ?? '', oncall_schedule_id: d.oncall_schedule_id ?? '' })
      setHasRootlyToken(d.hasRootlyToken)
    })
    fetch('/api/active-team').then((r) => r.json()).then((d) => {
      setActiveTeamId(d.activeTeamId)
      const active = d.teams?.find((t: { id: string; name: string }) => t.id === d.activeTeamId)
      if (active) setTeamName(active.name)
    })
    fetch('/api/eom/env').then((r) => r.json()).then((d) => {
      setHasEomToken(d.hasToken)
      if (d.EOM_TOKEN) setEomToken(d.EOM_TOKEN)
    })
    fetch('/api/snowflake/connections').then((r) => r.json()).then(setSfConnections)
    fetch('/api/snowflake/env').then((r) => r.json()).then((d) => {
      setHasSnowflakeToken(d.hasToken)
      setSnowflakeFields({
        SNOWFLAKE_ACCOUNT: d.SNOWFLAKE_ACCOUNT ?? '',
        SNOWFLAKE_USER: d.SNOWFLAKE_USER ?? '',
        SNOWFLAKE_TOKEN: d.SNOWFLAKE_TOKEN ?? '',
      })
    })
    fetch('/api/config').then((r) => r.json()).then((c: Config) => {
      if (c.eom_last_synced) setEomLastSynced(c.eom_last_synced)
      const mp = c.manager_profile ?? {}
      const email = mp.email ?? ''
      setProfile({
        name: [mp.first_name, mp.last_name].filter(Boolean).join(' ') || (c.oncall_supervisor ?? ''),
        email,
      })
      if (email) setSnowflakeFields((f) => ({ ...f, SNOWFLAKE_USER: f.SNOWFLAKE_USER || email }))
    })
  }, [])

  // ── Sync functions ─────────────────────────────────────────────────────────
  async function syncJira() {
    setJiraSync('syncing')
    setJiraSyncMsg('')
    const res = await fetch('/api/jira/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setJiraSync('ok')
      setJiraSyncMsg(`${json.sprintCount} sprint${json.sprintCount !== 1 ? 's' : ''}`)
    } else {
      setJiraSync('error')
      setJiraSyncMsg(json.error ?? 'Sync failed')
    }
  }

  async function syncEom() {
    setEomSync('syncing')
    setEomSyncMsg('')
    const res = await fetch('/api/eom/sync', { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      setEomSync('ok')
      setEomSyncMsg(`${json.synced} member${json.synced !== 1 ? 's' : ''}`)
      setEomLastSynced(json.synced_at)
    } else {
      setEomSync('error')
      setEomSyncMsg(json.error ?? 'Sync failed')
    }
  }

  async function syncAll() {
    setSyncAllStatus('syncing')
    await Promise.all([syncJira(), syncEom()])
    setSyncAllStatus('idle')
  }

  // ── Save functions ─────────────────────────────────────────────────────────
  async function saveProfile() {
    setProfileSaveStatus('saving')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oncall_supervisor: profile.name, JIRA_EMAIL: profile.email }),
    })
    if (res.ok) {
      setProfileSaveStatus('saved')
      setTimeout(() => setProfileSaveStatus('idle'), 2500)
    } else {
      setProfileSaveStatus('error')
    }
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

  async function saveJira() {
    setJiraSaveStatus('saving')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jiraFields),
    })
    setJiraSaveStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setJiraSaveStatus('idle'), 2500)
  }

  async function saveRootly() {
    setRootlySaveStatus('saving')
    const res = await fetch('/api/setup/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rootlyFields),
    })
    setRootlySaveStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setRootlySaveStatus('idle'), 2500)
  }

  async function saveSnowflake() {
    setSnowflakeSaveStatus('saving')
    const res = await fetch('/api/snowflake/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snowflakeFields),
    })
    if (res.ok) {
      if (snowflakeFields.SNOWFLAKE_TOKEN && snowflakeFields.SNOWFLAKE_TOKEN !== '••••••••') {
        setHasSnowflakeToken(true)
        setSnowflakeFields((f) => ({ ...f, SNOWFLAKE_TOKEN: '' }))
      }
      setSnowflakeSaveStatus('saved')
      setTimeout(() => setSnowflakeSaveStatus('idle'), 2500)
    } else {
      setSnowflakeSaveStatus('error')
    }
  }

  async function saveSfConnection() {
    if (!sfConnForm?.name.trim()) return
    const method = sfConnEditId ? 'PATCH' : 'POST'
    const body = sfConnEditId ? { id: sfConnEditId, ...sfConnForm } : sfConnForm
    const res = await fetch('/api/snowflake/connections', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setSfConnections(await res.json())
      setSfConnForm(null)
      setSfConnEditId(null)
    }
  }

  async function deleteSfConnection(id: string) {
    const res = await fetch('/api/snowflake/connections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setSfConnections(await res.json())
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

  const syncBusy = syncAllStatus === 'syncing' || jiraSync === 'syncing' || eomSync === 'syncing'

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* ── Sync All Sources ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-0.5">Sync All Sources</h2>
            <p className="text-xs text-gray-400">Pull the latest data from all connected integrations.</p>
          </div>
          <button onClick={syncAll} disabled={syncBusy}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0">
            <ArrowsClockwise size={14} weight="duotone" className={syncAllStatus === 'syncing' ? 'animate-spin' : ''} />
            {syncAllStatus === 'syncing' ? 'Syncing…' : 'Sync All Sources'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div>
            <button onClick={syncJira} disabled={syncBusy}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              <JiraLogo />
              <ArrowsClockwise size={14} weight="duotone" className={jiraSync === 'syncing' ? 'animate-spin' : ''} />
              {jiraSync === 'syncing' ? 'Syncing…' : 'Sync Jira'}
            </button>
            <p className="text-[10px] text-gray-400 mt-1 px-1">
              {jiraSync === 'ok' ? `✓ ${jiraSyncMsg}` : jiraSync === 'error' ? `✗ ${jiraSyncMsg}` : 'Sprint data'}
            </p>
          </div>

          <div>
            <button onClick={syncEom} disabled={syncBusy}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
              <div className="w-[16px] h-[16px] flex items-center justify-center rounded bg-indigo-600 text-white text-[8px] font-bold leading-none shrink-0">OS</div>
              <ArrowsClockwise size={14} weight="duotone" className={eomSync === 'syncing' ? 'animate-spin' : ''} />
              {eomSync === 'syncing' ? 'Syncing…' : 'Sync EOM'}
            </button>
            <p className="text-[10px] text-gray-400 mt-1 px-1">
              {eomSync === 'ok' ? `✓ ${eomSyncMsg}` : eomSync === 'error' ? `✗ ${eomSyncMsg}` : eomLastSynced ? formatRelativeTime(eomLastSynced) : 'Team members'}
            </p>
          </div>
        </div>
      </div>

      {/* ── My Profile + Team ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCircle size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">My Profile</h2>
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                className={inputCls}
                placeholder="Your full name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className={inputCls}
                placeholder="you@outsystems.com"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveProfile} disabled={profileSaveStatus === 'saving'}>
              {profileSaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {profileSaveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
            {profileSaveStatus === 'error' && <span className="text-sm text-red-600">Failed to save</span>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Team</h2>
          <div className="space-y-3 mb-4">
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Value Stream</label>
              <input
                className={inputCls}
                placeholder="e.g. Web & Mobile"
                value={valueStream}
                onChange={(e) => { setValueStream(e.target.value); setTeamSaveStatus('idle') }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveTeam} disabled={!teamName.trim()}>Save</Button>
            {teamSaveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}
          </div>
        </div>
      </div>

      {/* ── Integrations ─────────────────────────────────────────────────────── */}
      <IntegrationsPanel>
        {/* Jira */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <JiraLogo />
            <h3 className="text-sm font-semibold text-gray-700">Jira</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Credentials stored in <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
              <input className={inputCls} placeholder="https://your-org.atlassian.net" value={jiraFields.JIRA_BASE_URL}
                onChange={(e) => { setJiraFields((f) => ({ ...f, JIRA_BASE_URL: e.target.value })); setJiraSaveStatus('idle') }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Token
                <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline text-xs">Get one →</a>
              </label>
              <input className={inputCls} type="password"
                placeholder={hasJiraToken ? 'Token saved — paste to replace' : 'Paste your API token'}
                value={jiraFields.JIRA_API_TOKEN}
                onChange={(e) => { setJiraFields((f) => ({ ...f, JIRA_API_TOKEN: e.target.value })); setHasJiraToken(false); setJiraSaveStatus('idle') }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Key</label>
              <input className={inputCls} placeholder="e.g. RAR" value={jiraFields.JIRA_PROJECT_KEY}
                onChange={(e) => { setJiraFields((f) => ({ ...f, JIRA_PROJECT_KEY: e.target.value })); setJiraSaveStatus('idle') }} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={saveJira} disabled={jiraSaveStatus === 'saving'}>
              {jiraSaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {jiraSaveStatus === 'saved' && <span className="text-xs text-green-600">✓ Saved</span>}
            {jiraSaveStatus === 'error' && <span className="text-xs text-red-600">Failed</span>}
          </div>
        </div>

        {/* Rootly */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-[18px] h-[18px] flex items-center justify-center rounded bg-red-500 text-white shrink-0">
              <BellRinging size={11} weight="fill" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700">Rootly</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Required for the On-Call tab. Key stored in <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Key
                <a href="https://docs.rootly.com/integrations/api#generate-an-api-key" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline text-xs">Get one →</a>
              </label>
              <input className={inputCls} type="password"
                placeholder={hasRootlyToken ? 'Key saved — paste to replace' : 'Paste your Rootly API key'}
                value={rootlyFields.ROOTLY_TOKEN}
                onChange={(e) => { setRootlyFields((r) => ({ ...r, ROOTLY_TOKEN: e.target.value })); setHasRootlyToken(false); setRootlySaveStatus('idle') }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule ID</label>
              <input className={inputCls} placeholder="e.g. e40f4393-64c7-4acd-9bad-48e15c63ac2c"
                value={rootlyFields.oncall_schedule_id}
                onChange={(e) => { setRootlyFields((r) => ({ ...r, oncall_schedule_id: e.target.value })); setRootlySaveStatus('idle') }} />
              <p className="text-xs text-gray-400 mt-1">From the Rootly schedule edit page URL.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={saveRootly} disabled={rootlySaveStatus === 'saving'}>
              {rootlySaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {rootlySaveStatus === 'saved' && <span className="text-xs text-green-600">✓ Saved</span>}
            {rootlySaveStatus === 'error' && <span className="text-xs text-red-600">Failed</span>}
          </div>
        </div>

        {/* EOM */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-[18px] h-[18px] flex items-center justify-center rounded bg-indigo-600 text-white text-[8px] font-bold leading-none shrink-0">OS</div>
            <h3 className="text-sm font-semibold text-gray-700">EOM</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Engineering Organization Management — syncs team member names, emails, and countries automatically. Token stored in <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              API Token
              <a href="https://apps.outsystems.app/EOM/TokenGeneration" target="_blank" rel="noreferrer" className="ml-2 font-normal text-indigo-500 hover:underline text-xs">Get one →</a>
            </label>
            <input className={inputCls} type="password"
              placeholder={hasEomToken ? 'Token saved — paste to replace' : 'Paste your EOM token'}
              value={eomToken}
              onChange={(e) => { setEomToken(e.target.value); setHasEomToken(false); setEomTokenStatus('idle') }} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={saveEomToken} disabled={eomTokenStatus === 'saving'}>
              {eomTokenStatus === 'saving' ? 'Saving…' : 'Save key'}
            </Button>
            {eomTokenStatus === 'saved' && <span className="text-xs text-green-600">✓ Key configured</span>}
            {eomTokenStatus === 'error' && <span className="text-xs text-red-600">Failed</span>}
          </div>
          {eomLastSynced && (
            <p className="text-[10px] text-gray-400 mt-3">Last synced {new Date(eomLastSynced).toLocaleString()}</p>
          )}
        </div>

        {/* Snowflake */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L9.5 6.5l-5-1.5 1.5 5L2 12l4 1.5L4.5 18.5l5-1.5L12 22l2.5-5 5 1.5-1.5-5L22 12l-4-1.5 1.5-5.5-5 1.5L12 2z" fill="#29B5E8"/>
            </svg>
            <h3 className="text-sm font-semibold text-gray-700">Snowflake</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Query Snowflake data and track feature metrics. Credentials stored in <code className="bg-gray-100 px-1 rounded">.env.local</code>, never committed.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
              <input className={inputCls} placeholder="xy12345.us-east-1" value={snowflakeFields.SNOWFLAKE_ACCOUNT}
                onChange={(e) => { setSnowflakeFields((f) => ({ ...f, SNOWFLAKE_ACCOUNT: e.target.value })); setSnowflakeSaveStatus('idle') }} />
              <p className="text-xs text-gray-400 mt-1">From your Snowflake login URL: <code className="bg-gray-100 px-1 rounded">https://&lt;account&gt;.snowflakecomputing.com</code></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">API Token</label>
              <input className={inputCls} type="password"
                placeholder={hasSnowflakeToken ? 'Token saved — paste to replace' : 'Paste your API token'}
                value={snowflakeFields.SNOWFLAKE_TOKEN}
                onChange={(e) => { setSnowflakeFields((f) => ({ ...f, SNOWFLAKE_TOKEN: e.target.value })); setHasSnowflakeToken(false); setSnowflakeSaveStatus('idle') }} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" onClick={saveSnowflake} disabled={snowflakeSaveStatus === 'saving'}>
              {snowflakeSaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </Button>
            {snowflakeSaveStatus === 'saved' && <span className="text-xs text-green-600">✓ Saved</span>}
            {snowflakeSaveStatus === 'error' && <span className="text-xs text-red-600">Failed</span>}
          </div>
        </div>

        {/* Snowflake Connections */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Snowflake Connections</h3>
              <p className="text-xs text-gray-400 mt-0.5">Named database + warehouse profiles you can pick when querying.</p>
            </div>
            {!sfConnForm && (
              <button
                onClick={() => { setSfConnForm({ name: '', database: '', warehouse: '', schema: '' }); setSfConnEditId(null) }}
                className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50"
              >
                + Add
              </button>
            )}
          </div>

          {sfConnections.length > 0 && (
            <div className="space-y-2 mb-3">
              {sfConnections.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{c.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{c.database}{c.warehouse ? ` · ${c.warehouse}` : ''}{c.schema ? ` · ${c.schema}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setSfConnEditId(c.id); setSfConnForm({ name: c.name, database: c.database, warehouse: c.warehouse, schema: c.schema }) }}
                      className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                    <button onClick={() => deleteSfConnection(c.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sfConnForm && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <input className={inputCls} placeholder="Connection name (e.g. Engineering Metrics)" value={sfConnForm.name}
                onChange={(e) => setSfConnForm((f) => f && ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Database" value={sfConnForm.database}
                  onChange={(e) => setSfConnForm((f) => f && ({ ...f, database: e.target.value }))} />
                <input className={inputCls} placeholder="Warehouse" value={sfConnForm.warehouse}
                  onChange={(e) => setSfConnForm((f) => f && ({ ...f, warehouse: e.target.value }))} />
              </div>
              <input className={inputCls} placeholder="Schema (optional)" value={sfConnForm.schema}
                onChange={(e) => setSfConnForm((f) => f && ({ ...f, schema: e.target.value }))} />
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={saveSfConnection} disabled={!sfConnForm.name.trim()}>Save</Button>
                <button onClick={() => { setSfConnForm(null); setSfConnEditId(null) }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          )}

          {sfConnections.length === 0 && !sfConnForm && (
            <p className="text-xs text-gray-400">No connections yet.</p>
          )}
        </div>
      </IntegrationsPanel>

      {/* ── Danger Zone ───────────────────────────────────────────────────────── */}
      <div className="border border-red-200 rounded-xl p-5 max-w-lg">
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
            <button onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
