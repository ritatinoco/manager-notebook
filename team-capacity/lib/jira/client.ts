const BASE_URL = process.env.JIRA_BASE_URL ?? ''
const EMAIL = process.env.JIRA_EMAIL ?? ''
const API_TOKEN = process.env.JIRA_API_TOKEN ?? ''

const authHeader = 'Basic ' + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64')

export async function jiraFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error ${res.status} for ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function jiraPut<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error ${res.status} for ${path}: ${text}`)
  }
  // 204 No Content — return empty object
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}
