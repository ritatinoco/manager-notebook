import path from 'path'
import fs from 'fs'
import { getActiveTeamId, teamDataDir } from './teams'

function getConfigPath() {
  return path.join(teamDataDir(getActiveTeamId()), 'config.json')
}

export interface LocalHoliday {
  date: string  // MM-DD
  name: string
}

export interface MemberConfig {
  name: string
  sp_per_day: number
  jira_account_id: string | null
  country?: string  // "PT", "UK", "ES", "US"
  email?: string
  employee_number?: number
  supervisor?: string
  /** EOM person ID — used to resolve the avatar served by /api/avatars/[id] */
  eom_id?: number
}

/** Profile for the manager themselves — used to filter EOM direct reports */
export interface ManagerProfile {
  first_name?: string
  last_name?: string
  email?: string
  employee_number?: number
  country?: string
  supervisor?: string
  eom_id?: number
  pto_days_per_year?: number
  /** Name of the team member who covers capacity when the manager is on-call */
  oncall_substitute?: string
}

export interface Config {
  sp_per_day: number
  allocations: {
    features: number
    discovery: number
    risk: number
    debts: number
    sre: number
    support: number
  }
  team_members: MemberConfig[]
  local_holidays?: LocalHoliday[]
  bootstrapped?: boolean
  jira_project_key?: string
  oncall_schedule_id?: string
  oncall_department?: string
  oncall_supervisor?: string
  manager_profile?: ManagerProfile
  /** ISO timestamp of the last successful EOM sync */
  eom_last_synced?: string
  /** Team average velocity in SP per sprint — used on the allocation page */
  team_avg_velocity?: number
}

const DEFAULT_CONFIG: Config = {
  sp_per_day: 1.4,
  allocations: {
    features: 0.65,
    discovery: 0.05,
    risk: 0.05,
    debts: 0.20,
    sre: 0.00,
    support: 0.05,
  },
  team_members: [],
  local_holidays: [],
}

export function getConfig(): Config {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2))
    return DEFAULT_CONFIG
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config
  config.team_members = [...config.team_members].sort((a, b) => a.name.localeCompare(b.name))
  return config
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}
