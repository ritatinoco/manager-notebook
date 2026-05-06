import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const VS_PATH = path.join(DATA_DIR, 'value-streams.json')

export interface ValueStream {
  name: string
  color: string
}

export interface ValueStreamConfig {
  streams: ValueStream[]
  assignments: Record<string, string> // initiativeKey → streamName
}

const EMPTY: ValueStreamConfig = { streams: [], assignments: {} }

export function getValueStreamConfig(): ValueStreamConfig {
  if (!fs.existsSync(VS_PATH)) return EMPTY
  try {
    const raw = JSON.parse(fs.readFileSync(VS_PATH, 'utf8')) as Partial<ValueStreamConfig>
    return {
      streams: raw.streams ?? [],
      assignments: raw.assignments ?? {},
    }
  } catch {
    return EMPTY
  }
}

export function saveValueStreamConfig(config: ValueStreamConfig): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(VS_PATH, JSON.stringify(config, null, 2))
}
