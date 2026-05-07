import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

const FEATURES_PATH = path.join(process.cwd(), 'data', 'snowflake-features.json')

export interface SnowflakeChart {
  label: string
  sql: string
}

export interface SnowflakeFeature {
  id: string
  name: string
  description: string
  charts: SnowflakeChart[]
}

function read(): SnowflakeFeature[] {
  if (!fs.existsSync(FEATURES_PATH)) return []
  try { return JSON.parse(fs.readFileSync(FEATURES_PATH, 'utf8')) } catch { return [] }
}

function write(features: SnowflakeFeature[]) {
  const dir = path.dirname(FEATURES_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(FEATURES_PATH, JSON.stringify(features, null, 2), 'utf8')
}

export async function GET() {
  return NextResponse.json(read())
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<SnowflakeFeature, 'id'>
  const features = read()
  const feature: SnowflakeFeature = { id: randomUUID(), name: body.name, description: body.description ?? '', charts: body.charts ?? [] }
  features.push(feature)
  write(features)
  return NextResponse.json(features)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as SnowflakeFeature
  const features = read()
  const idx = features.findIndex((f) => f.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  features[idx] = { ...features[idx], ...body }
  write(features)
  return NextResponse.json(features)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string }
  const features = read().filter((f) => f.id !== id)
  write(features)
  return NextResponse.json(features)
}
