import { NextResponse } from 'next/server'
import { jiraPost } from '@/lib/jira/client'
import { getConfig } from '@/lib/data/config'

const JQL = '(project = RAR AND type = "Support Case" OR project = RDINC AND Teams in ("Client Runtime")) AND statusCategory != Done ORDER BY Rank ASC'

interface JiraIssue {
  key: string
  fields: {
    summary: string
    status: { name: string }
    assignee: { displayName: string } | null
    priority: { name: string } | null
  }
}

interface JiraSearchResult {
  issues: JiraIssue[]
}

export async function GET() {
  if (!process.env.JIRA_BASE_URL || !process.env.JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira not configured' }, { status: 400 })
  }

  try {
    const data = await jiraPost<JiraSearchResult>('/rest/api/3/search/jql', {
      jql: JQL,
      fields: ['summary', 'status', 'assignee', 'priority'],
      maxResults: 100,
    })

    const config = getConfig()
    const members = config.team_members

    const tickets = data.issues.map((issue) => {
      const displayName = issue.fields.assignee?.displayName ?? null
      const member = displayName ? members.find((m) => m.name === displayName) : undefined
      return {
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        assignee: displayName,
        slackUserId: member?.slack_user_id ?? null,
        priority: issue.fields.priority?.name ?? null,
      }
    })

    return NextResponse.json({
      tickets,
      fetchedAt: new Date().toISOString(),
      jiraBaseUrl: process.env.JIRA_BASE_URL,
      slackChannel: config.slack_support_channel ?? '',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
