'use client'

import { useEffect, useState } from 'react'
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

export default function TeamPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editSP, setEditSP] = useState('')
  const [editCountry, setEditCountry] = useState('PT')
  const [newName, setNewName] = useState('')
  const [newSP, setNewSP] = useState('1.4')
  const [newCountry, setNewCountry] = useState('PT')
  const [adding, setAdding] = useState(false)

  async function load() {
    const res = await fetch('/api/config')
    setConfig(await res.json())
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
    const members = [...config!.team_members]
    members[editIdx] = { ...members[editIdx], name: editName, sp_per_day: parseFloat(editSP), country: editCountry }
    await saveMembers(members)
    setEditIdx(null)
  }

  async function addMember() {
    if (!newName.trim()) return
    const members = [...config!.team_members, { name: newName, sp_per_day: parseFloat(newSP), jira_account_id: null, country: newCountry }]
    await saveMembers(members)
    setNewName('')
    setNewSP('1.4')
    setNewCountry('PT')
    setAdding(false)
  }

  async function removeMember(idx: number) {
    if (!confirm('Remove this member?')) return
    const members = config!.team_members.filter((_, i) => i !== idx)
    await saveMembers(members)
  }

  const selectCls = 'border border-gray-300 rounded px-2 py-1 text-sm bg-white'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Team</h1>
        <Button size="sm" onClick={() => setAdding(true)}>Add member</Button>
      </div>

      {adding && (
        <div className="mb-4 flex gap-3 items-end bg-gray-50 border border-gray-200 rounded p-4">
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
          <Input label="SP / day" value={newSP} onChange={(e) => setNewSP(e.target.value)} type="number" step="0.1" className="w-24" />
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">SP / day</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {config.team_members.map((m, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editIdx === idx ? (
                    <input className="border border-gray-300 rounded px-2 py-1 text-sm w-48" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    <span className="font-medium">{m.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editIdx === idx ? (
                    <input type="number" step="0.1" className="border border-gray-300 rounded px-2 py-1 text-sm w-20" value={editSP} onChange={(e) => setEditSP(e.target.value)} />
                  ) : (
                    m.sp_per_day
                  )}
                </td>
                <td className="px-4 py-3">
                  {editIdx === idx ? (
                    <select className={selectCls} value={editCountry} onChange={(e) => setEditCountry(e.target.value)}>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-700">{countryLabel(m.country)}</span>
                  )}
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
                        <Button size="sm" variant="ghost" onClick={() => { setEditIdx(idx); setEditName(m.name); setEditSP(String(m.sp_per_day)); setEditCountry(m.country ?? 'PT') }}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => removeMember(idx)}>Remove</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
