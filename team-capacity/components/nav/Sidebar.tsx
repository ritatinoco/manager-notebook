'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import TeamSwitcher from './TeamSwitcher'
import {
  Lightning,
  ChartBar,
  CalendarBlank,
  TrendUp,
  Users,
  Target,
  ClipboardTextIcon,
  ArrowLeft,
  ArrowRight,
  GearSix,
} from '@phosphor-icons/react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', Icon: Lightning },
  { href: '/capacity', label: 'Capacity', Icon: ChartBar },
  { href: '/absences', label: 'Absences', Icon: CalendarBlank },
  { href: '/velocity', label: 'Velocity', Icon: TrendUp },
  { href: '/sprint-goals', label: 'Sprint Goals', Icon: ClipboardTextIcon },
  { href: '/team', label: 'Team', Icon: Users },
  { href: '/allocation', label: 'Allocation', Icon: Target },
]

const navBottom = [
  { href: '/settings', label: 'Settings', Icon: GearSix },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-48'} bg-white border-r border-gray-200 flex flex-col py-6 shrink-0 transition-all duration-200`}>
      <div className={`flex items-center mb-2 gap-2 ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
        {!collapsed && <div className="flex-1 min-w-0"><TeamSwitcher collapsed={false} /></div>}
        {collapsed && <TeamSwitcher collapsed={true} />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ArrowRight size={16} weight="duotone" />
            : <ArrowLeft size={16} weight="duotone" />
          }
        </button>
      </div>
      {!collapsed && <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider px-3 mb-3">Capacity Planner</p>}

      <nav className="flex flex-col gap-1 px-2 flex-1">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 px-2 py-2 rounded text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} weight="duotone" className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      <nav className="flex flex-col gap-1 px-2 pt-2 border-t border-gray-100">
        {navBottom.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 px-2 py-2 rounded text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} weight="duotone" className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
