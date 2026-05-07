'use client'

import { useState, useRef, useEffect } from 'react'
import { Play } from '@phosphor-icons/react'

interface QueryResult {
  columns: string[]
  rows: unknown[][]
}

interface SnowflakeConnection {
  id: string
  name: string
  database: string
  warehouse: string
  schema: string
}

export default function SnowflakeQueryPage() {
  const [sql, setSql] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connections, setConnections] = useState<SnowflakeConnection[]>([])
  const [connectionId, setConnectionId] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/snowflake/connections').then((r) => r.json()).then((d: SnowflakeConnection[]) => {
      setConnections(d)
      if (d.length > 0) setConnectionId(d[0].id)
    })
  }, [])

  async function runQuery() {
    if (!sql.trim() || status === 'running') return
    setStatus('running')
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, connectionId: connectionId || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Query failed')
        setStatus('error')
      } else {
        setResult(data)
        setStatus('ok')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      setStatus('error')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      runQuery()
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-900">Query</h1>
        <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">Snowflake</span>
      </div>

      {connections.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 shrink-0">Connection</label>
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <textarea
          ref={textareaRef}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          rows={8}
          placeholder={'SELECT *\nFROM your_table\nLIMIT 100'}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={runQuery}
            disabled={!sql.trim() || status === 'running'}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Play size={14} weight="fill" />
            {status === 'running' ? 'Running…' : 'Run'}
          </button>
          <span className="text-xs text-gray-400">or {navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter</span>
        </div>
      </div>

      {status === 'error' && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
          <p className="text-sm text-red-700 font-medium">Query error</p>
          <p className="text-sm text-red-600 font-mono">{error}</p>
          {error.toLowerCase().includes('network policy') && (
            <p className="text-xs text-red-500 mt-2 leading-relaxed">
              Your Snowflake token requires a network policy.{' '}
              Go to{' '}
              <a href="https://app.snowflake.com" target="_blank" rel="noreferrer" className="underline text-red-500 hover:text-red-700">Snowflake</a>
              {' → your avatar → Profile → Authentication → Programmatic access tokens'},
              click <strong>…</strong> next to your token and choose <strong>Bypass requirement for network policy</strong> to grant temporary access.
              If that option is missing, ask your Snowflake admin to whitelist your IP.
            </p>
          )}
        </div>
      )}

      {status === 'ok' && result && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Results</p>
            <span className="text-xs text-gray-400">{result.rows.length} row{result.rows.length !== 1 ? 's' : ''}</span>
          </div>
          {result.rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No rows returned</p>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2 text-gray-700 whitespace-nowrap border-b border-gray-100 font-mono text-xs max-w-xs truncate">
                          {cell === null || cell === undefined ? <span className="text-gray-300 italic">null</span> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
