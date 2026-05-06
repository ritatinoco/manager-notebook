import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const TEAMS_PATH = path.join(DATA_DIR, 'teams.json')
const ACTIVE_PATH = path.join(DATA_DIR, 'active-team.json')

export interface Team {
  id: string
  name: string
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function teamDataDir(teamId: string): string {
  return path.join(DATA_DIR, 'teams', teamId)
}

export function getTeams(): Team[] {
  ensureDir(DATA_DIR)
  if (!fs.existsSync(TEAMS_PATH)) return []
  return JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf8')) as Team[]
}

export function saveTeams(teams: Team[]): void {
  ensureDir(DATA_DIR)
  fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 2))
}

/** On first run: migrate existing flat data/*.json into data/teams/default/ */
function migrate(): string {
  const teamId = 'default'
  const teamDir = teamDataDir(teamId)
  ensureDir(teamDir)

  for (const file of ['config.json', 'absences.json', 'jira-cache.json', 'sprint-comments.json']) {
    const src = path.join(DATA_DIR, file)
    const dst = path.join(teamDir, file)
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst)
  }

  // Try to read a team name from the existing config
  let teamName = 'My Team'
  const cfgPath = path.join(teamDir, 'config.json')
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      if (cfg.team_name) teamName = cfg.team_name
    } catch { /* ignore */ }
  }

  saveTeams([{ id: teamId, name: teamName }])
  fs.writeFileSync(ACTIVE_PATH, JSON.stringify({ teamId }, null, 2))
  return teamId
}

export function getActiveTeamId(): string {
  ensureDir(DATA_DIR)
  if (!fs.existsSync(TEAMS_PATH)) return migrate()
  if (!fs.existsSync(ACTIVE_PATH)) {
    const id = getTeams()[0]?.id ?? 'default'
    fs.writeFileSync(ACTIVE_PATH, JSON.stringify({ teamId: id }, null, 2))
    return id
  }
  return (JSON.parse(fs.readFileSync(ACTIVE_PATH, 'utf8')) as { teamId: string }).teamId
}

export function setActiveTeamId(id: string): void {
  ensureDir(DATA_DIR)
  fs.writeFileSync(ACTIVE_PATH, JSON.stringify({ teamId: id }, null, 2))
}

export function getActiveTeam(): Team | null {
  const id = getActiveTeamId()
  return getTeams().find((t) => t.id === id) ?? null
}

export function createTeam(name: string): Team {
  const teams = getTeams()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const id = `${slug}-${Date.now()}`
  const team: Team = { id, name }
  teams.push(team)
  saveTeams(teams)
  ensureDir(teamDataDir(id))
  return team
}

export function renameTeam(id: string, name: string): void {
  const teams = getTeams().map((t) => (t.id === id ? { ...t, name } : t))
  saveTeams(teams)
}
