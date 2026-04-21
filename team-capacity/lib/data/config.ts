import path from 'path'
import fs from 'fs'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json')

export interface LocalHoliday {
  date: string  // MM-DD
  name: string
}

export interface MemberConfig {
  name: string
  sp_per_day: number
  jira_account_id: string | null
  country?: string  // "PT" or "US"
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
  team_members: [
    { name: 'Carlos Xavier', sp_per_day: 1.4, jira_account_id: null, country: 'PT' },
    { name: 'David Pires', sp_per_day: 1.4, jira_account_id: null, country: 'PT' },
    { name: 'Pedro Quintas', sp_per_day: 1.4, jira_account_id: null, country: 'PT' },
    { name: 'Tiago M. Pereira', sp_per_day: 1.4, jira_account_id: null, country: 'PT' },
    { name: 'Laura Beata', sp_per_day: 1.4, jira_account_id: null, country: 'PT' },
  ],
  local_holidays: [
    { date: '06-13', name: 'Santo António (Lisbon)' },
  ],
}

function ensureDataDir() {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getConfig(): Config {
  ensureDataDir()
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2))
    return DEFAULT_CONFIG
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Config
}

export function saveConfig(config: Config): void {
  ensureDataDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}
