import { jiraPost, jiraFetch } from './client'
import type { EpicCache, VMCache, InitiativeCache } from '@/lib/data/roadmap-cache'

export async function fetchValueStreamFieldId(): Promise<string | null> {
  try {
    const fields = await jiraFetch<{ id: string; name: string; clauseNames?: string[] }[]>('/rest/api/3/field')
    const field = fields.find(
      (f) =>
        f.name === 'Value Stream' ||
        f.clauseNames?.some((c) => c.toLowerCase().includes('value stream'))
    )
    return field?.id ?? null
  } catch {
    return null
  }
}

interface JiraSearchResult {
  issues: JiraIssue[]
  total: number
}

interface JiraIssue {
  key: string
  fields: {
    summary: string
    status: { name: string }
    customfield_15485: string | null
    customfield_15486: string | null
    customfield_15727?: string | null
    resolutiondate?: string | null
    statuscategorychangedate?: string | null
    parent?: { key: string }
    [valueStreamField: string]: unknown
  }
}

async function searchJira(jql: string, fields: string[]): Promise<JiraIssue[]> {
  const result = await jiraPost<JiraSearchResult>('/rest/api/3/search/jql', {
    jql,
    fields,
    maxResults: 100,
  })
  return result.issues
}

export async function fetchTeamEpics(teamName: string): Promise<(EpicCache & { parentKey: string | null })[]> {
  const pmKey = process.env.JIRA_PM_PROJECT_KEY
  if (!pmKey) throw new Error('JIRA_PM_PROJECT_KEY is not set')

  const jql = `project = "${pmKey}" AND issuetype = Epic AND "Teams[Select List (multiple choices)]" = "${teamName}" ORDER BY customfield_15486 ASC, status DESC`
  const fields = ['key', 'summary', 'status', 'parent', 'customfield_15485', 'customfield_15486', 'resolutiondate', 'statuscategorychangedate']

  const issues = await searchJira(jql, fields)

  return issues.map((i) => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status.name,
    targetStart: i.fields.customfield_15485 ?? null,
    targetEnd: i.fields.customfield_15486 ?? null,
    resolvedAt: i.fields.resolutiondate ?? i.fields.statuscategorychangedate ?? null,
    parentKey: i.fields.parent?.key ?? null,
  }))
}

export async function fetchVMsByKeys(vmKeys: string[]): Promise<(VMCache & { parentKey: string | null })[]> {
  if (vmKeys.length === 0) return []

  const pmKey = process.env.JIRA_PM_PROJECT_KEY!
  const keyList = vmKeys.map((k) => `"${k}"`).join(', ')
  const jql = `project = "${pmKey}" AND key IN (${keyList}) ORDER BY customfield_15486 ASC`
  const fields = ['key', 'summary', 'status', 'parent', 'customfield_15485', 'customfield_15486', 'customfield_15727', 'resolutiondate', 'statuscategorychangedate']

  const issues = await searchJira(jql, fields)

  return issues.map((i) => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status.name,
    targetStart: i.fields.customfield_15485 ?? null,
    targetEnd: i.fields.customfield_15486 ?? null,
    recentUpdate: i.fields.customfield_15727 ?? null,
    resolvedAt: i.fields.resolutiondate ?? i.fields.statuscategorychangedate ?? null,
    epics: [],
    parentKey: i.fields.parent?.key ?? null,
  }))
}

interface ChangelogResponse {
  values: {
    created: string
    items: { field: string; toString: string | null }[]
  }[]
}

export async function fetchDevelopmentStartDate(issueKey: string): Promise<string | null> {
  try {
    const data = await jiraFetch<ChangelogResponse>(
      `/rest/api/3/issue/${issueKey}/changelog?maxResults=100`
    )
    // Find the earliest transition TO Development
    const transitions = data.values
      .filter((entry) => entry.items.some((item) => item.field === 'status' && item.toString === 'Development'))
      .map((entry) => entry.created)
    if (transitions.length === 0) return null
    transitions.sort()
    return transitions[0].slice(0, 10) // return YYYY-MM-DD
  } catch {
    return null
  }
}

export async function fetchInitiativesByKeys(
  keys: string[],
  valueStreamFieldId: string | null = null
): Promise<InitiativeCache[]> {
  if (keys.length === 0) return []

  const pmKey = process.env.JIRA_PM_PROJECT_KEY!
  const keyList = keys.map((k) => `"${k}"`).join(', ')
  const jql = `project = "${pmKey}" AND key IN (${keyList}) ORDER BY customfield_15486 ASC`
  const fields = ['key', 'summary', 'status', 'customfield_15485', 'customfield_15486', 'resolutiondate', 'statuscategorychangedate']
  if (valueStreamFieldId) fields.push(valueStreamFieldId)

  const issues = await searchJira(jql, fields)

  return issues.map((i) => {
    let valueStream: string | null = null
    if (valueStreamFieldId) {
      const raw = i.fields[valueStreamFieldId]
      if (raw && typeof raw === 'object' && 'value' in raw) {
        valueStream = (raw as { value: string }).value
      } else if (typeof raw === 'string') {
        valueStream = raw
      }
    }
    return {
      key: i.key,
      summary: i.fields.summary,
      status: i.fields.status.name,
      targetStart: i.fields.customfield_15485 ?? null,
      targetEnd: i.fields.customfield_15486 ?? null,
      resolvedAt: i.fields.resolutiondate ?? i.fields.statuscategorychangedate ?? null,
      valueStream,
      vms: [],
    }
  })
}
