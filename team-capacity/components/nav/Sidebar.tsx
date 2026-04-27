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
  Bell,
  MapTrifold,
  Rows,
  SquaresFour,
  CaretDown,
} from '@phosphor-icons/react'

type NavItem =
  | { href: string; label: string; Icon: React.ElementType; children?: never }
  | { href?: never; label: string; Icon: React.ElementType; children: { href: string; label: string; Icon: React.ElementType }[] }

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: Lightning },
  { href: '/capacity', label: 'Capacity', Icon: ChartBar },
  { href: '/absences', label: 'Absences', Icon: CalendarBlank },
  { href: '/velocity', label: 'Velocity', Icon: TrendUp },
  { href: '/sprint-goals', label: 'Sprint Goals', Icon: ClipboardTextIcon },
  { href: '/roadmap', label: 'Roadmap', Icon: MapTrifold },
  {
    label: 'Timeline',
    Icon: Rows,
    children: [
      { href: '/gantt', label: 'Initiatives', Icon: Rows },
      { href: '/vm-timeline', label: 'VMs', Icon: SquaresFour },
    ],
  },
  { href: '/team', label: 'Team', Icon: Users },
  { href: '/allocation', label: 'Allocation', Icon: Target },
  { href: '/oncall', label: 'On Call', Icon: Bell },
]

const navBottom = [
  { href: '/settings', label: 'Settings', Icon: GearSix },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Track which group menus are open; auto-open if a child is active
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const item of nav) {
      if (item.children) {
        const anyActive = item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))
        if (anyActive) initial[item.label] = true
      }
    }
    return initial
  })

  function toggleGroup(label: string) {
    setOpenGroups((g) => ({ ...g, [label]: !g[label] }))
  }

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
        {nav.map((item) => {
          if (item.children) {
            const anyChildActive = item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))
            const isOpen = openGroups[item.label]
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggleGroup(item.label)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm font-medium transition-colors ${
                    anyChildActive ? 'text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <item.Icon size={18} weight="duotone" className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <CaretDown size={12} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                    {item.children.map((child) => {
                      const active = pathname === child.href || pathname.startsWith(child.href + '/')
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                            active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                          }`}
                        >
                          <child.Icon size={15} weight="duotone" className="shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-2 py-2 rounded text-sm font-medium transition-colors ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.Icon size={18} weight="duotone" className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
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
