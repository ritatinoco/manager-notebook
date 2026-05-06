# Capacity Planner

A sprint capacity planning tool for engineering managers. Pulls data directly from Jira and Rootly, then computes team capacity, allocation targets, velocity trends, and the recurring artefacts a manager needs — replacing manual spreadsheets.

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
| [Settings](#settings----settings) | Configure integrations and run syncs |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Jira

Create `.env.local` in the repo root:

```env
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_api_token
```

Generate a Jira API token at https://id.atlassian.com/manage-profile/security/api-tokens.

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

### Settings — `/settings`

**Purpose.** Configure integrations and run syncs.

**Use cases.**
- Set your Jira project key, Rootly API key, and other credentials.
- Run individual syncs (Jira sprint data, Jira roadmap, on-call shifts).
- See last-synced timestamp per source.

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
| `data/teams.json` | List of all teams |
| `data/active-team.json` | Currently active team ID |

See `data/config.example.json` for the config schema. All data files are gitignored.
