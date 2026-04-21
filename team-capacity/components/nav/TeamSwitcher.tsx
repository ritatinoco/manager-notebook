'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CaretUpDown, Plus, Check } from '@phosphor-icons/react'
import type { Team } from '@/lib/data/teams'

export default function TeamSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [switching, setSwitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/active-team').then((r) => r.json()).then((d) => {
      setTeams(d.teams)
      setActiveId(d.activeTeamId)
    })
  }, [])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setAdding(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const activeTeam = teams.find((t) => t.id === activeId)

  async function switchTo(teamId: string) {
    if (teamId === activeId || switching) return
    setSwitching(true)
    setOpen(false)
    await fetch('/api/active-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId }),
    })
    setActiveId(teamId)
    setSwitching(false)
    window.location.href = '/dashboard'
  }

  async function addTeam() {
    if (!newName.trim()) return
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const team = await res.json()
    await fetch('/api/active-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: team.id }),
    })
    window.location.href = '/setup'
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen((o) => !o)}
        title={activeTeam?.name ?? 'Teams'}
        className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mx-auto hover:bg-indigo-200 transition-colors"
      >
        {activeTeam?.name?.[0]?.toUpperCase() ?? '?'}
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between group px-1 py-1 rounded hover:bg-gray-100 transition-colors text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">Team</p>
          <p className="text-sm font-bold text-gray-900 truncate">{activeTeam?.name ?? '—'}</p>
        </div>
        <CaretUpDown size={14} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => switchTo(team.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className={team.id === activeId ? 'font-medium text-indigo-700' : 'text-gray-700'}>{team.name}</span>
              {team.id === activeId && <Check size={13} className="text-indigo-600" weight="bold" />}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1">
            {adding ? (
              <div className="px-3 py-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTeam(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
                  placeholder="Team name"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={addTeam} className="text-xs text-indigo-600 font-medium hover:underline">Create</button>
                  <button onClick={() => { setAdding(false); setNewName('') }} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Plus size={13} weight="bold" />
                Add team
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
