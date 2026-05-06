import { NextResponse } from 'next/server'
import { getRoadmapCache } from '@/lib/data/roadmap-cache'

export async function GET() {
  return NextResponse.json({
    ...getRoadmapCache(),
    jiraBaseUrl: process.env.JIRA_BASE_URL ?? '',
  })
}
