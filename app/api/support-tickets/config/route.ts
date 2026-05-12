import { NextResponse } from 'next/server'
import { getConfig, saveConfig } from '@/lib/data/config'

export async function POST(req: Request) {
  try {
    const { slackChannel } = await req.json()
    const config = getConfig()
    config.slack_support_channel = slackChannel ?? ''
    saveConfig(config)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
