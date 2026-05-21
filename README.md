# Capacity Planner

A sprint capacity planning tool for engineering managers. Pulls data from Jira and Rootly, computes team capacity, allocation targets, and velocity trends — and connects to Snowflake to track feature adoption metrics and run ad-hoc analytics queries. Replaces manual spreadsheets and context-switching between tools.

Built with Next.js, TypeScript, and Tailwind CSS.

<p align="center">
  <img src="docs/team-capacity-dashboard.png" width="80%" alt="Capacity Planner Dashboard" />
</p>

---

## What's inside

The app is organised around the engineering manager's recurring rhythm. Each section in the sidebar maps to a piece of that rhythm:

| Section | Use case |
|---------|----------|
| [Dashboard](#dashboard----dashboard) | One-glance view of the active sprint |
| [Capacity](#capacity----capacity) | Plan SP per sprint with per-member breakdown |
| [Absences](#absences----absences) | Track days off and public holidays |
| [Velocity](#velocity----velocity) | Trend chart of committed vs delivered SP |
| [Sprint Goals](#sprint-goals----sprint-goals) | View and edit sprint goals from Jira |
| [Roadmap](#roadmap----roadmap) | Value milestones synced from Jira |
| [On-Call](#on-call----oncall) | On-call shifts from Rootly |
| [Team](#team----team) | Team member config and SP/day rates |
| [Allocation](#allocation----allocation) | Tune the % split between work categories |
| [Notes](#notes----notes) | Persistent freeform notes and action items |
| [Support](#support----support) | Active support tickets with Slack send |
| [Features](#features----snowflakefeatures) | Track feature adoption metrics from Snowflake |
| [Query](#query----snowflakequery) | Run ad-hoc SQL queries against Snowflake |
| [Settings](#settings----settings) | Configure integrations and run syncs |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure integrations

Create `.env.local` in the repo root:

```env
# Jira (required)
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_api_token

# Rootly (optional — enables on-call page)
ROOTLY_API_KEY=your_rootly_key

# Slack (optional — enables send-to-channel on Support page)
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Snowflake (optional — enables Features and Query pages)
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USER=your.email@company.com
SNOWFLAKE_TOKEN=your_programmatic_access_token
```

- Jira API token: https://id.atlassian.com/manage-profile/security/api-tokens
- Snowflake PAT: Snowflake UI → your avatar → Profile → Authentication → Programmatic access tokens → Generate token

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on the dashboard.

### 4. First-time setup

Go to **Settings** to configure your Jira project key and team details, or visit `/setup` for a guided setup flow. Then click **Sync from Jira** to populate sprint data.

---

## Pages and use cases

### Dashboard — `/dashboard`

**Purpose.** A one-glance view of how the active sprint is going.

**Use cases.**
- Open the app and see the current sprint's capacity, suggested SP, scope change, and who's out.
- Jot down sprint notes that persist across sessions.
- Skim aggregate team metrics for the quarter — average velocity, deliver-≥-commit %, over-commit %, under-deliver %.
- Click **Sync from Jira** to pull the latest sprint data.

### Capacity — `/capacity`

**Purpose.** Per-member SP capacity per sprint, broken down by allocation category.

**Use cases.**
- Plan upcoming sprints: see how many SP each person can handle given vacations and public holidays.
- Switch between the current quarter and next quarter to look ahead.
- See team-level metrics (over-commit %, under-deliver %) for closed sprints in the selected quarter.

### Absences — `/absences`

**Purpose.** Per-member days-off input per sprint, with public holidays auto-deducted.

**Use cases.**
- Enter vacation days for each team member per sprint.
- See which public holidays fall in each sprint (PT and US supported, computed automatically).
- Changes flow immediately into the capacity calculation.

### Velocity — `/velocity`

**Purpose.** How the team's actual delivery compares to what it committed to.

**Use cases.**
- Show the chart in retros: initial commit vs final commit vs delivered SP per closed sprint.
- Click **Sync from Jira** to refresh the latest sprint data.
- Spot trends — chronic over-commit, dipping velocity after a heavy on-call rotation, etc.

### Sprint Goals — `/sprint-goals`

**Purpose.** Sprint goals for all recent and upcoming sprints, synced from Jira.

**Use cases.**
- Review or update the sprint goal for the active sprint without opening Jira.
- See goal history across past sprints at a glance.

### Roadmap — `/roadmap`

**Purpose.** Value milestones from Jira with target start/end dates and current status.

**Use cases.**
- Track ongoing value milestones assigned to you, sorted by target end date.
- Reorder milestones manually within a status group to reflect priority.
- Filter by value stream to focus on a specific area.

### VM Timeline — `/vm-timeline`

**Purpose.** Value milestones laid out on a horizontal timeline.

**Use cases.**
- Get a visual sense of what's landing when across the quarter.
- Spot overlapping commitments or gaps in delivery.

### Gantt — `/gantt`

**Purpose.** Gantt chart view of value milestones.

**Use cases.**
- Share a timeline-style view with stakeholders in planning or review meetings.
- See duration and overlap across multiple milestones at once.

### On-Call — `/oncall`

**Purpose.** On-call shifts for the team, pulled from Rootly.

**Use cases.**
- See who is on call each week and factor that into capacity planning.
- Review on-call coverage before committing to sprint scope.

Set `ROOTLY_API_KEY` in `.env.local` and configure the schedule ID in Settings to enable this page.

### Team — `/team`

**Purpose.** Roster of team members with per-person inputs that drive every other page.

**Use cases.**
- Add, remove, or rename team members.
- Set per-member SP/day rate and country for holiday calculations.
- Configure Jira account IDs to link members to Jira data.

### Allocation — `/allocation`

**Purpose.** Configure the percentage split across work categories. Suggested SP on the Capacity page is derived from these numbers.

**Use cases.**
- Re-balance allocation at the start of a new quarter.
- Temporarily shift more % into debts during a stabilisation push and see suggested SP update everywhere.

### Notes — `/notes`

**Purpose.** A persistent scratchpad for freeform text blocks and action item checklists.

**Use cases.**
- Capture meeting notes, retro takeaways, or planning thoughts without leaving the app.
- Track action items with checkboxes — mark them done as you work through them.
- Notes auto-save and persist across sessions in `data/teams/{id}/notes.json`.

### Support — `/support`

**Purpose.** Live view of active support tickets assigned to the team, with a Slack send action.

**Use cases.**
- See all open support tickets (from Jira) in one place, with status and priority badges.
- Draft a Slack standup message summarising the ticket list and send it to the configured channel.
- Each team member's Slack user ID (set in Team settings) links them to their ticket for easy @-mention in the message.

Set `SLACK_BOT_TOKEN` in `.env.local` and configure `slack_support_channel` in Settings to enable sending.

### Features — `/snowflake/features`

**Purpose.** Track adoption and usage metrics for specific product features, powered by Snowflake queries.

**Use cases.**
- Create a feature config with a name, description, and one or more SQL queries — each query becomes a chart.
- Choose between line charts (for time-series data) and pie charts (for distribution data, shown with percentages).
- Assign a Snowflake connection profile per feature so each feature queries the right database and warehouse.
- Charts load automatically when you select a feature.

**Connection profiles** are configured in Settings → Snowflake Connections. Each profile has a name, database, warehouse, and optional schema. You can define multiple profiles and switch between them per feature or per ad-hoc query.

**Authentication.** Uses a Programmatic Access Token (PAT). If you see a "Network policy is required" error, go to [Snowflake](https://app.snowflake.com) → your avatar → Profile → Authentication → Programmatic access tokens, click **…** on your token, and choose **Bypass requirement for network policy**.

### Query — `/snowflake/query`

**Purpose.** Run ad-hoc SQL queries against Snowflake and see results in a table.

**Use cases.**
- Explore data before turning a query into a feature chart.
- Run one-off queries without leaving the app.
- Select which connection profile to use from the dropdown at the top.
- Run with the **Run** button or ⌘+Enter.

### Settings — `/settings`

**Purpose.** Configure integrations and run syncs.

**Use cases.**
- Set your Jira project key, Rootly API key, and other credentials.
- Run individual syncs (Jira sprint data, Jira roadmap, on-call shifts).
- See last-synced timestamp per source.
- Configure Snowflake credentials (account, API token) and manage named connection profiles (database, warehouse, schema).

### Multi-team

Use the team switcher in the sidebar to create additional teams. Each team has its own Jira project key, config, absences, and Jira cache stored under `data/teams/{teamId}/`.

---

## Capacity Model

**Available days** = working days − days off − public holidays

**Capacity SP** = available days × SP/day rate

**Suggested SP** = capacity SP × (features % + discovery % + debts %)

Public holidays are computed automatically per member's country (PT and US). Local/company holidays are configurable per team in Settings.

## Velocity Metrics

| Column | Definition |
|--------|-----------|
| Initial Commit | SP in the sprint when it began (from Jira's velocity chart endpoint) |
| Final Commit | Total SP in the sprint at end (all statuses) |
| Delivered | SP completed during the sprint (Done + Waiting for Release) |

## Team Metrics (Capacity page)

Computed from closed sprints in the selected quarter only. Active and future sprints are excluded.

| Metric | Definition |
|--------|-----------|
| Over-commit | % of sprints where initial commitment exceeded team capacity |
| Under-deliver | % of sprints where delivered SP < initial commitment |
| Deliver ≥ Commit | % of sprints where delivered SP met or exceeded initial commitment |
| Avg velocity | Mean suggested SP across all sprints in the quarter |

## Configuration Files

| File | Purpose |
|------|---------|
| `data/teams/{id}/config.json` | Team members, SP/day rate, allocation percentages |
| `data/teams/{id}/absences.json` | Days off per member per sprint |
| `data/teams/{id}/jira-cache.json` | Cached sprint data from Jira |
| `data/teams/{id}/sprint-comments.json` | Manager notes per sprint |
| `data/teams/{id}/notes.json` | Freeform notes and action items |
| `data/teams.json` | List of all teams |
| `data/active-team.json` | Currently active team ID |
| `data/snowflake-features.json` | Saved feature configs (name, description, SQL charts) |
| `data/snowflake-connections.json` | Named Snowflake connection profiles |

See `data/config.example.json` for the config schema. All data files are gitignored.
