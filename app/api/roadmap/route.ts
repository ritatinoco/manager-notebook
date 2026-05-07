import { NextResponse } from 'next/server'
import { getRoadmapCache } from '@/lib/data/roadmap-cache'
import { fetchCurrentUser } from '@/lib/jira/roadmap'

export async function GET() {
  const [cache, currentUser] = await Promise.all([
    getRoadmapCache(),
    fetchCurrentUser(),
  ])
  return NextResponse.json({
    ...cache,
    jiraBaseUrl: process.env.JIRA_BASE_URL ?? '',
    currentUser,
  })
}
