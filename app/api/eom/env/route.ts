import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const ENV_PATH = path.join(process.cwd(), '.env.local')

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
  const token = vars.EOM_TOKEN || process.env.EOM_TOKEN || ''
  return NextResponse.json({ hasToken: !!token, EOM_TOKEN: token ? '••••••••' : '' })
}

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token: string }
  const trimmed = token?.trim()
  if (!trimmed || trimmed === '••••••••') {
    return NextResponse.json({ error: 'No token provided' }, { status: 400 })
  }
  writeEnvFile({ EOM_TOKEN: trimmed })
  process.env.EOM_TOKEN = trimmed
  return NextResponse.json({ ok: true })
}
