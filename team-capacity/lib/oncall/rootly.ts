export interface RootlyShift {
  id: string
  attributes: {
    schedule_id: string
    starts_at: string
    ends_at: string
  }
  relationships: {
    user: {
      data: {
        id: string
      }
    }
  }
}

export interface RootlyUser {
  id: string
  type: 'users'
  attributes: {
    name: string
  }
}

export interface RootlyResponse {
  data: RootlyShift[]
  included: RootlyUser[]
}

function splitInto30DayWindows(from: Date, to: Date): { from: string; to: string }[] {
  const windows: { from: string; to: string }[] = []
  let current = new Date(from)
  const end = new Date(to)

  while (current < end) {
    const next = new Date(current)
    next.setDate(current.getDate() + 30)
    const windowEnd = next > end ? end : next
    windows.push({ from: current.toISOString(), to: windowEnd.toISOString() })
    current = new Date(windowEnd)
  }
  return windows
}

async function fetchShifts(
  token: string,
  scheduleId: string,
  from: string,
  to: string
): Promise<RootlyResponse> {
  const url = new URL(`https://api.rootly.com/v1/schedules/${scheduleId}/shifts`)
  url.searchParams.set('include', 'user')
  url.searchParams.set('from', from)
  url.searchParams.set('to', to)

  const res = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/vnd.api+json',
    },
  })

  if (!res.ok) {
    throw new Error(`Rootly API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getOnCallShifts(
  token: string,
  scheduleId: string,
  from: Date,
  to: Date
): Promise<RootlyResponse> {
  const windows = splitInto30DayWindows(from, to)
  const results = await Promise.all(
    windows.map((w) => fetchShifts(token, scheduleId, w.from, w.to))
  )
  return {
    data: results.flatMap((r) => r.data),
    included: results.flatMap((r) => r.included),
  }
}
