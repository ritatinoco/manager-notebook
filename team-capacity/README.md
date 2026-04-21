# Capacity Planner

A sprint capacity planning tool for engineering managers. Replaces manual spreadsheets by pulling sprint data directly from Jira and computing team capacity, allocation targets, and velocity trends.

Built with Next.js 14, TypeScript, and Tailwind CSS.

<p align="center">
  <img src="docs/team-capacity-dashboard.png" width="80%" alt="Capacity Planner Dashboard" />
</p>

## Features

- **Dashboard** — active sprint overview with goal, SP metrics, and recent sprint history
- **Capacity** — team availability in days and suggested SP per sprint, broken down by allocation category; tabs for current and next quarter
- **Absences** — days-off input per member per sprint, with Portuguese public holidays auto-deducted
- **Velocity** — initial commit, final commit, and delivered SP per sprint with a trend chart
- **Team** — team member configuration and SP/day rates
- **Allocation** — configurable allocation percentages across features, discovery, risk, debts, and support

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Jira

Create a `.env.local` file in this directory:

```env
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_api_token
```

Generate an API token at https://id.atlassian.com/manage-profile/security/api-tokens.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the dashboard.

### 4. Sync from Jira

Click **Sync from Jira** on the dashboard or velocity page. This fetches the last 10 closed/active sprints plus all future sprints from your RAR scrum board. Subsequent syncs are incremental — closed sprints with data are not re-fetched.

## Configuration

Team members, SP/day rates, and allocation percentages are managed through the **Team** and **Allocation** pages in the UI. Data is persisted in `data/config.json`.

| File | Purpose |
|------|---------|
| `data/config.json` | Team members, SP/day rate, allocation percentages |
| `data/absences.json` | Days off per member per sprint |
| `data/jira-cache.json` | Cached sprint data from Jira |

## Capacity Model

**Available days** = working days − days off − Portuguese public holidays

**Capacity SP** = available days × SP/day rate

**Suggested SP** = capacity SP × (features % + discovery % + debts %)

Portuguese national holidays are automatically computed (including moveable holidays like Good Friday and Corpus Christi) and shown in the absences table.

## Velocity Metrics

| Column | Definition |
|--------|-----------|
| Initial Commit | SP in the sprint when it began (from Jira's velocity chart) |
| Final Commit | Total SP in the sprint at end (all statuses) |
| Delivered | SP completed during the sprint (Done + Waiting for Release) |

## Team Metrics (Capacity page)

Computed from closed sprints in the selected quarter only (active and future sprints excluded).

| Metric | Definition |
|--------|-----------|
| Over-commit | % of sprints where initial commitment exceeded team capacity |
| Under-deliver | % of sprints where delivered SP < initial commitment |
| Deliver ≥ Commit | % of sprints where delivered SP met or exceeded initial commitment |
| Avg velocity | Average suggested SP across all sprints in the quarter |
