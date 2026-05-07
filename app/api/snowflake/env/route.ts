import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const ENV_PATH = path.join(process.cwd(), '.env.local')

const SNOWFLAKE_KEYS = [
  'SNOWFLAKE_ACCOUNT',
  'SNOWFLAKE_USER',
  'SNOWFLAKE_TOKEN',
  'SNOWFLAKE_WAREHOUSE',
  'SNOWFLAKE_DATABASE',
  'SNOWFLAKE_SCHEMA',
] as const

function readEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {}
  const result: Record<string, string> = {}
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return result
}

function writeEnvFile(updates: Record<string, string>) {
  const existing = readEnvFile()
  const merged = { ...existing, ...updates }
  fs.writeFileSync(
    ENV_PATH,
    Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('\n') + '\n',
    'utf8'
  )
}

export async function GET() {
  const vars = readEnvFile()
  const token = vars.SNOWFLAKE_TOKEN || process.env.SNOWFLAKE_TOKEN || ''
  return NextResponse.json({
    hasToken: !!token,
    SNOWFLAKE_ACCOUNT: vars.SNOWFLAKE_ACCOUNT || process.env.SNOWFLAKE_ACCOUNT || '',
    SNOWFLAKE_USER: vars.SNOWFLAKE_USER || process.env.SNOWFLAKE_USER || '',
    SNOWFLAKE_TOKEN: token ? '••••••••' : '',
    SNOWFLAKE_WAREHOUSE: vars.SNOWFLAKE_WAREHOUSE || process.env.SNOWFLAKE_WAREHOUSE || '',
    SNOWFLAKE_DATABASE: vars.SNOWFLAKE_DATABASE || process.env.SNOWFLAKE_DATABASE || '',
    SNOWFLAKE_SCHEMA: vars.SNOWFLAKE_SCHEMA || process.env.SNOWFLAKE_SCHEMA || '',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Record<typeof SNOWFLAKE_KEYS[number], string>>
  const updates: Record<string, string> = {}
  for (const key of SNOWFLAKE_KEYS) {
    const val = body[key]?.trim()
    if (val && val !== '••••••••') {
      updates[key] = val
      process.env[key] = val
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided' }, { status: 400 })
  }
  writeEnvFile(updates)
  return NextResponse.json({ ok: true })
}
