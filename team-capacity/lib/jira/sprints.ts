import { jiraFetch } from './client'

interface JiraBoard {
  id: number
  name: string
  type: string
}

interface JiraSprint {
  id: number
  name: string
  state: 'active' | 'closed' | 'future'
  startDate?: string
  endDate?: string
  goal?: string
}

export async function getRARBoardId(): Promise<number> {
  const projectKey = process.env.JIRA_PROJECT_KEY
  if (!projectKey) throw new Error('JIRA_PROJECT_KEY is not set in .env.local')
  const data = await jiraFetch<{ values: JiraBoard[] }>(
    `/rest/agile/1.0/board?projectKeyOrId=${projectKey}&maxResults=10`
  )
  if (!data.values.length) throw new Error(`No board found for project ${projectKey}`)
  const scrum = data.values.find((b) => b.type === 'scrum')
  return (scrum ?? data.values[0]).id
}

export async function getBoardSprints(boardId: number): Promise<JiraSprint[]> {
  const all: JiraSprint[] = []
  let startAt = 0
  while (true) {
    const data = await jiraFetch<{ values: JiraSprint[]; isLast: boolean }>(
      `/rest/agile/1.0/board/${boardId}/sprint?state=active,closed,future&maxResults=50&startAt=${startAt}`
    )
    all.push(...data.values)
    if (data.isLast) break
    startAt += data.values.length
  }
  return all
}

export type { JiraSprint }
