import { jiraFetch } from './client'

const SP_FIELDS = Array.from(new Set([
  process.env.JIRA_SP_FIELD ?? 'customfield_10004',
  'customfield_10004',
  'customfield_10016',
  'customfield_10028',
]))

interface JiraIssue {
  fields: Record<string, unknown>
}

export interface SprintVelocity {
  jiraSprintId: number
  initialCommittedSP: number
  committedSP: number
  deliveredSP: number
  doneSP: number
  waitingForReleaseSP: number
  workloadByName: Record<string, number>
}

export interface BoardVelocityEntry {
  estimated: number  // work in sprint when it began (excludes mid-sprint additions)
  completed: number  // work completed during sprint
}

interface SprintReport {
  contents?: {
    completedIssuesInitialEstimateSum?: { value?: number }
    issuesNotCompletedInitialEstimateSum?: { value?: number }
  }
}

function getStoryPoints(fields: Record<string, unknown>): number {
  for (const field of SP_FIELDS) {
    const val = fields[field]
    if (typeof val === 'number' && val > 0) return val
  }
  return 0
}

// Fetches the same data Jira's velocity chart uses — one call for all sprints.
// Returns sprintId → { estimated (initial commitment at sprint start), completed }.
export async function getBoardVelocity(boardId: number): Promise<Map<number, BoardVelocityEntry>> {
  try {
    const data = await jiraFetch<{
      velocityStatEntries: Record<string, { estimated: { value: number }; completed: { value: number } }>
    }>(`/rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId=${boardId}`)

    const map = new Map<number, BoardVelocityEntry>()
    for (const [key, val] of Object.entries(data.velocityStatEntries ?? {})) {
      map.set(parseInt(key), {
        estimated: val.estimated?.value ?? 0,
        completed: val.completed?.value ?? 0,
      })
    }
    return map
  } catch {
    return new Map()
  }
}

export async function getSprintVelocity(
  sprintId: number,
  boardId: number,
  velocityEntry?: BoardVelocityEntry
): Promise<SprintVelocity> {
  // Fast path: Greenhopper sprint report gives us initial estimate sums quickly
  let reportInitial = 0
  try {
    const report = await jiraFetch<SprintReport>(
      `/rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=${boardId}&sprintId=${sprintId}`
    )
    if (report.contents) {
      reportInitial =
        (report.contents.completedIssuesInitialEstimateSum?.value ?? 0) +
        (report.contents.issuesNotCompletedInitialEstimateSum?.value ?? 0)
    }
  } catch {
    // ignore — will fall back to JQL value
  }

  // Single JQL scan: get all issues in sprint with SP > 0, compute committed + delivered + workload
  const fieldsParam = [...SP_FIELDS, 'status', 'assignee'].join(',')
  const jql = encodeURIComponent(`sprint=${sprintId} AND "Story Points" > 0`)
  const data = await jiraFetch<{ issues: JiraIssue[]; total: number }>(
    `/rest/api/3/search/jql?jql=${jql}&fields=${fieldsParam}&maxResults=500`
  )

  let committedSP = 0
  let doneSP = 0
  let waitingForReleaseSP = 0
  const workloadByName: Record<string, number> = {}

  for (const issue of data.issues ?? []) {
    const sp = getStoryPoints(issue.fields)
    committedSP += sp
    const statusName = (issue.fields.status as { name: string } | null)?.name ?? ''
    const statusCategoryKey =
      (issue.fields.status as { statusCategory?: { key?: string } } | null)?.statusCategory?.key
    const isWFR = statusName === 'Waiting for Release'
    const isDone = !isWFR && statusCategoryKey === 'done'
    if (isDone || isWFR) {
      if (isWFR) waitingForReleaseSP += sp
      else doneSP += sp
      const assignee = issue.fields.assignee as { displayName: string } | null
      if (assignee?.displayName) {
        workloadByName[assignee.displayName] = (workloadByName[assignee.displayName] ?? 0) + sp
      }
    }
  }

  return {
    jiraSprintId: sprintId,
    // Board velocity "estimated/completed" matches Jira's velocity chart (authoritative for closed sprints).
    // Fall back to Greenhopper sum / JQL count when not available.
    initialCommittedSP: velocityEntry?.estimated || reportInitial || committedSP,
    committedSP,
    // Use Jira's velocity chart completed value as the canonical deliveredSP — it reflects
    // what was done when the sprint closed, unlike a JQL scan of current issue statuses.
    deliveredSP: velocityEntry?.completed || (doneSP + waitingForReleaseSP),
    doneSP,
    waitingForReleaseSP,
    workloadByName,
  }
}
