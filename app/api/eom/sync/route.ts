import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getConfig, saveConfig } from '@/lib/data/config'
import type { MemberConfig } from '@/lib/data/config'
import { getActiveTeamId, teamDataDir } from '@/lib/data/teams'

function readEnvVar(key: string): string {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return process.env[key] ?? ''
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === key) return trimmed.slice(eq + 1)
  }
  return process.env[key] ?? ''
}

const EOM_API_BASE = 'https://apps.outsystems.app/EOM/rest/v1'

function avatarsDir(): string {
  const dir = path.join(teamDataDir(getActiveTeamId()), 'avatars')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function fetchAndSaveAvatar(personId: number, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${EOM_API_BASE}/people/${personId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return false
    const data = (await res.json()) as { PictureBase64?: string }
    const b64 = data.PictureBase64
    if (!b64) return false
    const buf = Buffer.from(b64, 'base64')
    fs.writeFileSync(path.join(avatarsDir(), `${personId}.png`), buf)
    return true
  } catch {
    return false
  }
}

interface EomPerson {
  ID: number
  Name: string
  Email: string
  IsActive: boolean
  Location: string  // e.g. "PT - Remote", "UK - Remote"
  Department: string
  ReportingTo: {
    ID: number
    Name: string
    Email: string
  } | null
}

/** Parse "PT - Remote" → "PT", "UK - Office" → "UK", etc. */
function locationToCountryCode(location: string): string | undefined {
  if (!location) return undefined
  const match = location.match(/^([A-Z]{2})\s*[-–]/i)
  if (match) return match[1].toUpperCase()
  return undefined
}

function resolveEomPeople(raw: unknown): EomPerson[] {
  if (Array.isArray(raw)) return raw as EomPerson[]
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as EomPerson[]
    if (Array.isArray(obj.people)) return obj.people as EomPerson[]
    if (Array.isArray(obj.items)) return obj.items as EomPerson[]
  }
  return []
}

export async function POST() {
  const token = readEnvVar('EOM_TOKEN')
  if (!token) {
    return NextResponse.json(
      { error: 'EOM_TOKEN not configured. Add it to .env.local or set it in Settings → EOM.' },
      { status: 401 }
    )
  }

  const config = getConfig()
  const managerName = config.oncall_supervisor?.trim() ?? ''
  if (!managerName) {
    return NextResponse.json(
      { error: 'Manager name not configured. Set it in Settings → Manager first.' },
      { status: 400 }
    )
  }

  const peopleRes = await fetch(`${EOM_API_BASE}/people`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!peopleRes.ok) {
    if (peopleRes.status === 401 || peopleRes.status === 403) {
      return NextResponse.json(
        { error: 'EOM token is invalid or expired. Generate a new one at https://apps.outsystems.app/EOM/TokenGeneration' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: `EOM API error ${peopleRes.status}` },
      { status: 500 }
    )
  }

  const rawPeople = await peopleRes.json()
  const allPeople = resolveEomPeople(rawPeople)

  const teamPeople = allPeople.filter(
    (p) =>
      p.IsActive &&
      p.ReportingTo?.Name?.toLowerCase().trim() === managerName.toLowerCase().trim()
  )

  if (teamPeople.length === 0) {
    return NextResponse.json(
      {
        error: `No active team members found with supervisor "${managerName}" in EOM.`,
        hint: `Fetched ${allPeople.length} people total. Check that the manager name in Settings matches EOM exactly.`,
        managerName,
      },
      { status: 404 }
    )
  }

  // Build lookup maps to preserve app-specific fields during merge
  const existingByEmail = new Map(
    config.team_members
      .filter((m) => m.email)
      .map((m) => [m.email!.toLowerCase().trim(), m])
  )
  const existingByName = new Map(
    config.team_members.map((m) => [m.name.toLowerCase().trim(), m])
  )

  const updatedMembers: MemberConfig[] = teamPeople.map((p) => {
    const existing =
      existingByEmail.get(p.Email.toLowerCase().trim()) ??
      existingByName.get(p.Name.toLowerCase().trim())

    return {
      name: p.Name.trim(),
      sp_per_day: existing?.sp_per_day ?? config.sp_per_day,
      jira_account_id: existing?.jira_account_id ?? null,
      country: locationToCountryCode(p.Location) ?? existing?.country,
      email: p.Email || undefined,
      employee_number: existing?.employee_number,
      supervisor: p.ReportingTo?.Name ?? existing?.supervisor,
      eom_id: p.ID,
    }
  })

  // Fetch avatars — failures are non-fatal
  const idsToFetch = [
    ...updatedMembers.map((m) => m.eom_id).filter((id): id is number => id != null),
  ]
  const avatarResults = await Promise.all(
    idsToFetch.map((id) => fetchAndSaveAvatar(id, token)),
  )
  const avatarsSaved = avatarResults.filter(Boolean).length

  const now = new Date().toISOString()
  config.eom_last_synced = now
  config.team_members = updatedMembers
  saveConfig(config)

  return NextResponse.json({
    synced: updatedMembers.length,
    members: updatedMembers,
    avatars_saved: avatarsSaved,
    synced_at: now,
    manager: managerName,
  })
}
