'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowsClockwise, PaperPlaneTilt, CopySimple, CheckFat } from '@phosphor-icons/react'

interface Ticket {
  key: string
  summary: string
  status: string
  assignee: string | null
  slackUserId: string | null
  priority: string | null
}

interface TicketsResponse {
  tickets: Ticket[]
  fetchedAt: string
  jiraBaseUrl: string
  slackChannel: string
}

// Statuses that count as "active" (the 3 board columns the team tracks)
const ACTIVE_STATUSES = new Set([
  'Assigned',
  'Team Assigned',
  'Work In Progress',
  'Troubleshooting In Progress',
  'Waiting for Customer',
  'Waiting for Support',
])

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  'Assigned':                    { bg: '#e0e7ff', color: '#3730a3' },
  'Team Assigned':               { bg: '#e0e7ff', color: '#3730a3' },
  'Work In Progress':            { bg: '#dbeafe', color: '#1d4ed8' },
  'Troubleshooting In Progress': { bg: '#dbeafe', color: '#1d4ed8' },
  'Waiting for Customer':        { bg: '#fef3c7', color: '#92400e' },
  'Waiting for Support':         { bg: '#fef3c7', color: '#92400e' },
}

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  'Blocker':       { bg: '#fee2e2', color: '#b91c1c' },
  'Critical':      { bg: '#fee2e2', color: '#b91c1c' },
  'High':          { bg: '#ffedd5', color: '#c2410c' },
  'Medium':        { bg: '#fef3c7', color: '#92400e' },
  'Low':           { bg: '#f3f4f6', color: '#6b7280' },
  'Low Priority':  { bg: '#f3f4f6', color: '#6b7280' },
  'Lowest':        { bg: '#f3f4f6', color: '#9ca3af' },
  'Normal':        { bg: '#f3f4f6', color: '#6b7280' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-gray-300">—</span>
  const p = PRIORITY_COLOR[priority] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: p.bg, color: p.color }}>
      {priority}
    </span>
  )
}

export default function SupportTicketsPage() {
  const [data, setData] = useState<TicketsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [slackMessage, setSlackMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sendResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/support-tickets')
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to load tickets')
        return
      }
      const json: TicketsResponse = await res.json()
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  function composeMessage() {
    if (!data) return
    const tickets = data.tickets.filter((t) => ACTIVE_STATUSES.has(t.status))
    const lines = tickets.map((t) => {
      const keyLink = data.jiraBaseUrl ? `<${data.jiraBaseUrl}/browse/${t.key}|${t.key}>` : t.key
      const assignee = t.slackUserId ? ` <@${t.slackUserId}>` : t.assignee ? ` @${t.assignee}` : ''
      const priorityEmoji: Record<string, string> = {
        'Normal': ':jira-normal:',
        'Low': ':jira-low:',
        'Lowest': ':jira-low:',
        'Low Priority': ':jira-low:',
        'High': ':jira-critical:',
        'Urgent': ':jira-urgent:',
        'Blocker': ':jira-blocker:',
        'Critical': ':jira-critical:',
      }
      const priority = t.priority ? (priorityEmoji[t.priority] ?? `[${t.priority}]`) + ' ' : ''
      return `• ${priority}${keyLink} — ${t.summary}${assignee}`
    })
    setSlackMessage(`:this-is-fine-fire: *Daily Support Update* :this-is-fine-fire:\n\n*In Progress:*\n\n${lines.join('\n')}`)
    setSendResult(null)
  }

  async function sendToSlack() {
    if (!slackMessage) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/slack/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: slackMessage }),
      })
      const json = await res.json()
      setSendResult(json)
    } catch (e) {
      setSendResult({ error: String(e) })
    } finally {
      setSending(false)
      if (sendResultTimer.current) clearTimeout(sendResultTimer.current)
      sendResultTimer.current = setTimeout(() => setSendResult(null), 5000)
    }
  }

  function copyMessage() {
    navigator.clipboard.writeText(slackMessage)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const inProgressTickets = data?.tickets.filter((t) => ACTIVE_STATUSES.has(t.status)) ?? []
  const inProgressCount = inProgressTickets.length

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Support Tickets</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
          {data && (
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
              {inProgressCount} in progress
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data?.fetchedAt && (
            <span className="text-xs text-gray-400">
              Fetched {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ArrowsClockwise size={14} weight="duotone" className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Ticket table */}
      {inProgressCount === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-10 text-center text-sm text-gray-400">
          No tickets in progress.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 w-28">Key</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5">Summary</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 w-44">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 w-36">Assignee</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5 w-20">Priority</th>
              </tr>
            </thead>
            <tbody>
              {inProgressTickets.map((ticket, i) => (
                <tr key={ticket.key} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === inProgressCount - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-2.5">
                    {data?.jiraBaseUrl ? (
                      <a
                        href={`${data.jiraBaseUrl}/browse/${ticket.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-indigo-600 hover:underline"
                      >
                        {ticket.key}
                      </a>
                    ) : (
                      <span className="text-xs font-mono text-gray-500">{ticket.key}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">{ticket.summary}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{ticket.assignee ?? <span className="text-gray-300">Unassigned</span>}</td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={ticket.priority} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slack section */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Slack Update</p>

        {/* Compose + preview */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={composeMessage}
            disabled={inProgressCount === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Compose
          </button>
          {slackMessage && (
            <>
              <button
                onClick={sendToSlack}
                disabled={sending}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperPlaneTilt size={14} weight="duotone" />
                {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                onClick={copyMessage}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
              >
                {copied ? <CheckFat size={13} weight="fill" className="text-green-500" /> : <CopySimple size={13} weight="duotone" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </>
          )}
          {sendResult?.ok && <span className="text-xs text-green-600 font-medium">Sent ✓</span>}
          {sendResult?.error && <span className="text-xs text-red-600">{sendResult.error}</span>}
        </div>

        {slackMessage && (
          <textarea
            value={slackMessage}
            onChange={(e) => setSlackMessage(e.target.value)}
            rows={Math.max(inProgressCount + 4, 10)}
            className="w-full text-xs font-mono text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none bg-gray-50"
          />
        )}
      </div>
    </div>
  )
}
