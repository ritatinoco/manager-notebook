import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getConfig, saveConfig } from '@/lib/data/config'

const ENV_PATH = path.join(process.cwd(), '.env.local')

const MANAGED_KEYS = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'] as const

function readEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {}
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n')
  const result: Record<string, string> = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
  return result
}

function writeEnvFile(vars: Record<string, string>) {
  const existing = readEnvFile()
  const merged = { ...existing, ...vars }
  const content = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n'
  fs.writeFileSync(ENV_PATH, content, 'utf8')
}

export async function GET() {
  const vars = readEnvFile()
  const config = getConfig()
  return NextResponse.json({
    JIRA_BASE_URL: vars.JIRA_BASE_URL ?? process.env.JIRA_BASE_URL ?? '',
    JIRA_EMAIL: vars.JIRA_EMAIL ?? process.env.JIRA_EMAIL ?? '',
    JIRA_API_TOKEN: vars.JIRA_API_TOKEN ? '••••••••' : (process.env.JIRA_API_TOKEN ? '••••••••' : ''),
    JIRA_PROJECT_KEY: config.jira_project_key ?? '',
    hasToken: !!(vars.JIRA_API_TOKEN || process.env.JIRA_API_TOKEN),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, string>

  const toWrite: Record<string, string> = {}
  for (const key of MANAGED_KEYS) {
    const val = body[key]?.trim()
    if (!val) continue
    if (key === 'JIRA_API_TOKEN' && val === '••••••••') continue
    toWrite[key] = val
  }

  writeEnvFile(toWrite)

  // Apply to current process so sync works immediately without restart
  for (const [k, v] of Object.entries(toWrite)) {
    process.env[k] = v
  }

  // Save project key to team config (per-team setting)
  const projectKey = body['JIRA_PROJECT_KEY']?.trim()
  if (projectKey) {
    const config = getConfig()
    saveConfig({ ...config, jira_project_key: projectKey })
  }

  return NextResponse.json({ ok: true })
}
