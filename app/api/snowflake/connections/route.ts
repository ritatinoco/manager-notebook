import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

const CONNECTIONS_PATH = path.join(process.cwd(), 'data', 'snowflake-connections.json')

export interface SnowflakeConnection {
  id: string
  name: string
  database: string
  warehouse: string
  schema: string
}

function read(): SnowflakeConnection[] {
  if (!fs.existsSync(CONNECTIONS_PATH)) return []
  try { return JSON.parse(fs.readFileSync(CONNECTIONS_PATH, 'utf8')) } catch { return [] }
}

function write(connections: SnowflakeConnection[]) {
  const dir = path.dirname(CONNECTIONS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONNECTIONS_PATH, JSON.stringify(connections, null, 2), 'utf8')
}

export async function GET() {
  return NextResponse.json(read())
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<SnowflakeConnection, 'id'>
  const connections = read()
  const conn: SnowflakeConnection = { id: randomUUID(), name: body.name, database: body.database ?? '', warehouse: body.warehouse ?? '', schema: body.schema ?? '' }
  connections.push(conn)
  write(connections)
  return NextResponse.json(connections)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as SnowflakeConnection
  const connections = read()
  const idx = connections.findIndex((c) => c.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  connections[idx] = { ...connections[idx], ...body }
  write(connections)
  return NextResponse.json(connections)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string }
  write(read().filter((c) => c.id !== id))
  return NextResponse.json(read().filter((c) => c.id !== id))
}
