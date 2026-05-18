'use client'

import { useEffect, useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Config, MemberConfig } from '@/lib/data/config'

const COUNTRIES = [
  { code: 'PT', label: '🇵🇹 Portugal' },
  { code: 'UK', label: '🇬🇧 United Kingdom' },
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'US', label: '🇺🇸 United States' },
]

function countryLabel(code: string | undefined) {
  const found = COUNTRIES.find((c) => c.code === (code ?? 'PT'))
  return found ? `${found.label.split(' ')[0]} ${found.code}` : code ?? 'PT'
}

function MemberAvatar({ member }: { member: MemberConfig }) {
  const [imgError, setImgError] = useState(false)

  if (member.eom_id && !imgError) {
    return (
      <img
        src={`/api/avatars/${member.eom_id}`}
        alt={member.name}
        width={28}
        height={28}
        className="rounded-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  // Fallback: initials
  const initials = member.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  )
}

export default function TeamPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editCountry, setEditCountry] = useState('PT')
  const [editEmpNum, setEditEmpNum] = useState('')
  const [editSlackUserId, setEditSlackUserId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCountry, setNewCountry] = useState('PT')
  const [newEmpNum, setNewEmpNum] = useState('')
  const [adding, setAdding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  async function syncEom() {
    setSyncing(true)
    setSyncError('')
    const res = await fetch('/api/eom/sync', { method: 'POST' })
    const json = await res.json()
    setSyncing(false)
    if (res.ok) {
      setLastSynced(json.synced_at)
      load()
    } else {
      setSyncError(json.error ?? 'Sync failed')
    }
  }

  async function load() {
    const res = await fetch('/api/config')
    const data = await res.json()
    setConfig(data)
    if (data.eom_last_synced) setLastSynced(data.eom_last_synced)
  }

  async function saveMembers(members: MemberConfig[]) {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_members: members }),
    })
    load()
  }

  useEffect(() => { load() }, [])

  if (!config) return <div className="text-sm text-gray-500">Loading...</div>

  async function saveEdit() {
    if (editIdx === null) return
    const m = config!.team_members[editIdx]
    const members = [...config!.team_members]
    members[editIdx] = {
      ...m,
      // Only update name/country for manual members (no eom_id)
      ...(m.eom_id ? {} : { name: editName, country: editCountry }),
      employee_number: editEmpNum ? parseInt(editEmpNum) : undefined,
      slack_user_id: editSlackUserId.trim() || undefined,
    }
    await saveMembers(members)
    setEditIdx(null)
  }

  async function addMember() {
    if (!newName.trim()) return
    const members = [
      ...config!.team_members,
      {
        name: newName,
        sp_per_day: config!.sp_per_day,
        jira_account_id: null,
        country: newCountry,
        employee_number: newEmpNum ? parseInt(newEmpNum) : undefined,
      },
    ]
    await saveMembers(members)
    setNewName('')
    setNewCountry('PT')
    setNewEmpNum('')
    setAdding(false)
  }

  async function removeMember(idx: number) {
    if (!confirm('Remove this member?')) return
    const members = config!.team_members.filter((_, i) => i !== idx)
    await saveMembers(members)
  }

  function startEdit(idx: number) {
    const m = config!.team_members[idx]
    setEditIdx(idx)
    setEditName(m.name)
    setEditCountry(m.country ?? 'PT')
    setEditEmpNum(m.employee_number != null ? String(m.employee_number) : '')
    setEditSlackUserId(m.slack_user_id ?? '')
  }

  const selectCls = 'border border-gray-300 rounded px-2 py-1 text-sm bg-white'
  const cellInputCls = 'border border-gray-300 rounded px-2 py-1 text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Team</h1>
        <div className="flex items-center gap-3">
          {lastSynced && <span className="text-xs text-gray-400">Last synced {new Date(lastSynced).toLocaleString()}</span>}
          <button onClick={syncEom} disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <ArrowsClockwise size={14} weight="duotone" className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from EOM'}
          </button>
          <Button size="sm" onClick={() => setAdding(true)}>Add member</Button>
        </div>
      </div>
      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">{syncError}</div>
      )}

      {adding && (
        <div className="mb-4 flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 rounded p-4">
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
          <Input label="Emp #" value={newEmpNum} onChange={(e) => setNewEmpNum(e.target.value)} type="number" className="w-24" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Country</label>
            <select className={selectCls} value={newCountry} onChange={(e) => setNewCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={addMember}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-8" />
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Emp #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Slack ID</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {config.team_members.map((m, idx) => {
              const isEom = !!m.eom_id
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <MemberAvatar member={m} />
                  </td>
                  <td className="px-4 py-3">
                    {editIdx === idx && !isEom
                      ? <input className={`${cellInputCls} w-44`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                      : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          {isEom && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">EOM</span>}
                        </div>
                      )}
                  </td>
                  <td className="px-4 py-3">
                    {editIdx === idx
                      ? <input type="number" className={`${cellInputCls} w-20`} value={editEmpNum} onChange={(e) => setEditEmpNum(e.target.value)} />
                      : <span className="text-gray-500 font-mono text-xs">{m.employee_number ?? <span className="text-gray-300">—</span>}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {editIdx === idx && !isEom
                      ? <select className={selectCls} value={editCountry} onChange={(e) => setEditCountry(e.target.value)}>
                          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                      : <span className="text-gray-700">{countryLabel(m.country)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {editIdx === idx
                      ? <input className={`${cellInputCls} w-32`} placeholder="U0123456789" value={editSlackUserId} onChange={(e) => setEditSlackUserId(e.target.value)} />
                      : <span className="text-gray-500 text-xs font-mono">{m.slack_user_id ?? <span className="text-gray-300">—</span>}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {editIdx === idx ? (
                        <>
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditIdx(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(idx)}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => removeMember(idx)}>Remove</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {config.team_members.some((m) => m.eom_id) && (
        <p className="text-xs text-gray-400 mt-2">
          Members marked <span className="bg-gray-100 px-1 rounded">EOM</span> are synced from the Engineering Org Management directory. Name and country are managed by EOM.
        </p>
      )}
    </div>
  )
}
