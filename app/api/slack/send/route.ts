import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/data/config'

export async function POST(req: Request) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not configured in Settings' }, { status: 400 })

  const config = getConfig()
  const channel = config.slack_support_channel
  if (!channel) return NextResponse.json({ error: 'Slack channel is not configured in Settings' }, { status: 400 })

  const { message } = await req.json()
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text: message }),
  })

  const json = await res.json()
  if (!json.ok) return NextResponse.json({ error: `Slack error: ${json.error}` }, { status: 500 })

  return NextResponse.json({ ok: true })
}
