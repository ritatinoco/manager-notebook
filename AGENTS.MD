# AGENTS.md — Capacity Planner

*This file tells agents how to work with this codebase.*

---

## About This App

A sprint capacity planning tool for engineering managers. Pulls sprint data from Jira and computes team capacity, allocation targets, and velocity trends.

Built with Next.js 14, TypeScript, and Tailwind CSS.

> Jira connection details (project keys, board IDs) are in `memory/workspace.local.md` (not committed).

---

## Running the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Jira Setup

Create `.env.local` in the repo root:

```env
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_api_token
```

---

## Project Structure

```
app/           # Next.js pages and API routes
components/    # UI components (nav/, ui/, velocity/)
lib/           # Business logic
  capacity/    # Capacity calculations
  data/        # File-based data layer (config, absences, cache)
  jira/        # Jira API client, sprint sync, roadmap
  oncall/      # Rootly on-call integration
data/          # Persisted data (gitignored except config.example.json)
docs/          # Screenshots
memory/        # workspace.local.md — Jira keys (not committed)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/jira/client.ts` | Jira API client |
| `lib/jira/sprints.ts` | Sprint sync logic |
| `lib/capacity/calculations.ts` | Capacity and SP calculations |
| `lib/holidays.ts` | Portuguese public holidays |
| `data/config.example.json` | Team config schema reference |
| `memory/workspace.local.md` | Jira project keys (gitignored) |

---

## Data Model

- `data/config.json` — team members, SP/day rates, allocation percentages (gitignored)
- `data/absences.json` — days off per member per sprint (gitignored)
- `data/jira-cache.json` — cached sprint data from Jira (gitignored)

---

*Last updated: 2026-05-06*
