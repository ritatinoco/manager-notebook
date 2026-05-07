import { NextRequest, NextResponse } from 'next/server'
import { runQuery } from '@/lib/snowflake/client'
import path from 'path'
import fs from 'fs'

function loadConnection(id: string) {
  const p = path.join(process.cwd(), 'data', 'snowflake-connections.json')
  if (!fs.existsSync(p)) return {}
  const connections: { id: string; database: string; warehouse: string; schema: string }[] = JSON.parse(fs.readFileSync(p, 'utf8'))
  return connections.find((c) => c.id === id) ?? {}
}

export async function POST(req: NextRequest) {
  const { sql, connectionId } = await req.json() as { sql?: string; connectionId?: string }
  if (!sql?.trim()) {
    return NextResponse.json({ error: 'No SQL provided' }, { status: 400 })
  }
  const overrides = connectionId ? loadConnection(connectionId) : {}
  try {
    const rows = await runQuery(sql, overrides)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    const data = rows.map((r) => columns.map((c) => r[c]))
    return NextResponse.json({ columns, rows: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
