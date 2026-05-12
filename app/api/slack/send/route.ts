import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not set in .env.local' }, { status: 400 })
  }

  try {
    const { channel, message } = await req.json()
    if (!channel) return NextResponse.json({ error: 'channel is required' }, { status: 400 })
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text: message }),
    })

    const json = await res.json() as { ok: boolean; error?: string }
    if (!json.ok) {
      return NextResponse.json({ error: json.error ?? 'Slack API error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
