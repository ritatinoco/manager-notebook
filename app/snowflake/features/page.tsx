'use client'

import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { Plus, Trash, PencilSimple, Check, X, FloppyDisk } from '@phosphor-icons/react'

interface SnowflakeChart {
  label: string
  sql: string
  type?: 'line' | 'pie'
}

interface SnowflakeFeature {
  id: string
  name: string
  description: string
  connectionId?: string
  charts: SnowflakeChart[]
}

interface SnowflakeConnection {
  id: string
  name: string
}

interface ChartResult {
  status: 'idle' | 'loading' | 'ok' | 'error'
  columns: string[]
  rows: unknown[][]
  error?: string
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
const textareaCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none'

function toChartData(columns: string[], rows: unknown[][]): Record<string, unknown>[] {
  return rows.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

function FeatureChart({ chart, connectionId }: { chart: SnowflakeChart; connectionId?: string }) {
  const [result, setResult] = useState<ChartResult>({ status: 'idle', columns: [], rows: [] })

  useEffect(() => {
    setResult({ status: 'loading', columns: [], rows: [] })
    fetch('/api/snowflake/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: chart.sql, connectionId: connectionId || undefined }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setResult({ status: 'error', columns: [], rows: [], error: d.error })
        else setResult({ status: 'ok', columns: d.columns, rows: d.rows })
      })
      .catch((e) => setResult({ status: 'error', columns: [], rows: [], error: e.message }))
  }, [chart.sql])

  const chartData = result.status === 'ok' ? toChartData(result.columns, result.rows) : []
  const xKey = result.columns[0] ?? ''
  const valueKeys = result.columns.slice(1)
  const chartType = chart.type ?? 'line'

  // For pie: use col0 as name, col1 as value
  const total = chartType === 'pie' ? chartData.reduce((s, r) => s + (Number(r[valueKeys[0]]) || 0), 0) : 0
  const pieData = chartType === 'pie' ? chartData.map((r) => ({ name: String(r[xKey] ?? ''), value: Number(r[valueKeys[0]]) || 0 })) : []

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">{chart.label}</p>
      {result.status === 'loading' && (
        <div className="h-40 flex items-center justify-center text-xs text-gray-400">Loading…</div>
      )}
      {result.status === 'error' && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
          <p className="text-xs text-red-500 text-center">{result.error}</p>
          {result.error?.toLowerCase().includes('network policy') && (
            <p className="text-xs text-gray-400 text-center leading-relaxed max-w-xs">
              Go to{' '}
              <a href="https://app.snowflake.com" target="_blank" rel="noreferrer" className="underline text-gray-500 hover:text-gray-700">Snowflake</a>
              {' → Profile → Authentication → Programmatic access tokens'},
              click <strong className="text-gray-500">…</strong> on your token and select <strong className="text-gray-500">Bypass requirement for network policy</strong>.
            </p>
          )}
        </div>
      )}
      {result.status === 'ok' && chartData.length === 0 && (
        <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data</div>
      )}
      {result.status === 'ok' && chartData.length > 0 && chartType === 'pie' && (
        <div className="flex gap-4 items-start">
          <ResponsiveContainer width="50%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`, '']} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 justify-center py-2 min-w-0 flex-1">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="truncate text-gray-600 flex-1">{entry.name}</span>
                <span className="text-gray-400 shrink-0">{total ? ((entry.value / total) * 100).toFixed(1) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.status === 'ok' && chartData.length > 0 && chartType === 'line' && valueKeys.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(0, 10)} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            {valueKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {valueKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function EditForm({
  initial,
  connections,
  onSave,
  onCancel,
}: {
  initial: SnowflakeFeature
  connections: SnowflakeConnection[]
  onSave: (f: SnowflakeFeature) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [connectionId, setConnectionId] = useState(initial.connectionId ?? '')
  const [charts, setCharts] = useState<SnowflakeChart[]>(initial.charts.map((c) => ({ ...c })))

  function addChart() {
    setCharts((prev) => [...prev, { label: '', sql: '', type: 'line' }])
  }

  function removeChart(idx: number) {
    setCharts((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateChart(idx: number, field: keyof SnowflakeChart, value: string) {
    setCharts((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function submit() {
    if (!name.trim()) return
    onSave({ ...initial, name: name.trim(), description: description.trim(), connectionId: connectionId || undefined, charts })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Feature name</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Onboarding Flow" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
      </div>

      {connections.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Connection</label>
          <select value={connectionId} onChange={(e) => setConnectionId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">None</option>
            {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600">Charts</label>
          <button onClick={addChart} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
            <Plus size={12} /> Add chart
          </button>
        </div>
        <div className="space-y-3">
          {charts.map((chart, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  className={inputCls}
                  placeholder="Chart label"
                  value={chart.label}
                  onChange={(e) => updateChart(idx, 'label', e.target.value)}
                />
                <select
                  value={chart.type ?? 'line'}
                  onChange={(e) => updateChart(idx, 'type', e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0"
                >
                  <option value="line">Line</option>
                  <option value="pie">Pie</option>
                </select>
                <button onClick={() => removeChart(idx)} className="text-gray-400 hover:text-red-500 shrink-0">
                  <Trash size={14} />
                </button>
              </div>
              <textarea
                className={textareaCls}
                rows={4}
                placeholder="SELECT date, count(*) as users FROM events WHERE feature = 'x' GROUP BY 1 ORDER BY 1"
                value={chart.sql}
                onChange={(e) => updateChart(idx, 'sql', e.target.value)}
              />
            </div>
          ))}
          {charts.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">No charts yet — add one above</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-50"
        >
          <FloppyDisk size={14} /> Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

export default function SnowflakeFeaturesPage() {
  const [features, setFeatures] = useState<SnowflakeFeature[]>([])
  const [connections, setConnections] = useState<SnowflakeConnection[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/snowflake/features').then((r) => r.json()).then((d: SnowflakeFeature[]) => {
      setFeatures(d)
      if (d.length > 0 && !selectedId) setSelectedId(d[0].id)
    })
  }, [selectedId])

  useEffect(() => {
    load()
    fetch('/api/snowflake/connections').then((r) => r.json()).then(setConnections)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = features.find((f) => f.id === selectedId) ?? null

  async function saveFeature(f: SnowflakeFeature) {
    const method = creating ? 'POST' : 'PATCH'
    const body = creating ? { name: f.name, description: f.description, charts: f.charts } : f
    const res = await fetch('/api/snowflake/features', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const updated: SnowflakeFeature[] = await res.json()
    setFeatures(updated)
    setEditing(false)
    setCreating(false)
    if (creating && updated.length > 0) setSelectedId(updated[updated.length - 1].id)
  }

  async function deleteFeature(id: string) {
    const res = await fetch('/api/snowflake/features', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const updated: SnowflakeFeature[] = await res.json()
    setFeatures(updated)
    setDeleteConfirm(null)
    if (selectedId === id) setSelectedId(updated[0]?.id ?? null)
  }

  const blankFeature: SnowflakeFeature = { id: '', name: '', description: '', charts: [] }

  return (
    <div className="flex gap-4 h-full">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-sm font-bold text-gray-800">Features</h1>
          <button
            onClick={() => { setCreating(true); setEditing(true); setSelectedId(null) }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <Plus size={13} /> New
          </button>
        </div>

        {features.length === 0 && !creating && (
          <p className="text-xs text-gray-400 mt-2">No features yet.</p>
        )}

        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => { setSelectedId(f.id); setEditing(false); setCreating(false) }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              selectedId === f.id && !creating
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <p className="truncate font-medium">{f.name}</p>
            {f.description && <p className="text-xs text-gray-400 truncate">{f.description}</p>}
          </button>
        ))}
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {(editing || creating) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-2xl">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{creating ? 'New feature' : `Edit: ${selected?.name}`}</h2>
            <EditForm
              initial={creating ? blankFeature : selected!}
              connections={connections}
              onSave={saveFeature}
              onCancel={() => { setEditing(false); setCreating(false) }}
            />
          </div>
        )}

        {!editing && !creating && selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">Snowflake</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {selected.description && <p className="text-sm text-gray-500">{selected.description}</p>}
                  {selected.connectionId && connections.find((c) => c.id === selected.connectionId) && (
                    <span className="text-xs text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                      {connections.find((c) => c.id === selected.connectionId)!.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                >
                  <PencilSimple size={13} /> Edit
                </button>
                {deleteConfirm === selected.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => deleteFeature(selected.id)} className="flex items-center gap-1 text-xs text-white bg-red-600 rounded-lg px-2.5 py-1.5 hover:bg-red-700">
                      <Check size={13} /> Confirm
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(selected.id)} className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50">
                    <Trash size={13} /> Delete
                  </button>
                )}
              </div>
            </div>

            {selected.charts.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No charts configured for this feature.</p>
                <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 hover:underline">Add charts →</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selected.charts.map((chart, i) => (
                <FeatureChart key={i} chart={chart} connectionId={selected.connectionId} />
              ))}
            </div>
          </div>
        )}

        {!editing && !creating && !selected && features.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-sm text-gray-500 mb-3">No features yet. Create one to start tracking metrics.</p>
            <button
              onClick={() => { setCreating(true); setEditing(true) }}
              className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
            >
              <Plus size={14} /> New feature
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
