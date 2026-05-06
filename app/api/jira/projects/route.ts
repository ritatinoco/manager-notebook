import { NextResponse } from 'next/server'

const MANAGED_ENV_PATH = `${process.cwd()}/.env.local`

function readEnvVar(key: string): string {
  try {
    const fs = require('fs') as typeof import('fs')
    if (!fs.existsSync(MANAGED_ENV_PATH)) return process.env[key] ?? ''
    for (const line of fs.readFileSync(MANAGED_ENV_PATH, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      if (trimmed.slice(0, eq) === key) return trimmed.slice(eq + 1)
    }
  } catch { /* ignore */ }
  return process.env[key] ?? ''
}

interface JiraBoard {
  id: number
  name: string
  type: string
  location?: {
    projectKey?: string
    projectName?: string
  }
}

export async function GET() {
  const baseUrl = readEnvVar('JIRA_BASE_URL')
  const email = readEnvVar('JIRA_EMAIL')
  const token = readEnvVar('JIRA_API_TOKEN')

  if (!baseUrl || !email || !token) {
    return NextResponse.json({ error: 'Jira credentials not saved yet.' }, { status: 400 })
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')

  try {
    const res = await fetch(`${baseUrl}/rest/agile/1.0/board?maxResults=50`, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Jira returned ${res.status}. Check your URL and credentials.`, detail: text },
        { status: res.status }
      )
    }

    const data = (await res.json()) as { values: JiraBoard[] }
    const seen = new Set<string>()
    const projects = data.values
      .map((b) => ({
        key: b.location?.projectKey ?? '',
        name: b.location?.projectName ?? b.name,
        boardId: b.id,
      }))
      .filter((p) => { if (!p.key || seen.has(p.key)) return false; seen.add(p.key); return true })

    return NextResponse.json({ projects })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
