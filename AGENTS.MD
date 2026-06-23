# AGENTS.md — Capacity Planner

This file provides guidance to Claude Code when working with code in this repository.

---

## What This Repo Is

A locally-hosted Next.js app — the **Capacity Planner** — that pulls sprint data from Jira and on-call shifts from Rootly to compute team capacity and story-point allocations.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system diagrams, external integrations, and the architectural tenets that govern the app's design.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup steps, environment variables, dev commands, and gitignored file conventions.

---

## Key Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies (first time) |
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |

There is no test runner or linter configured in this repo.

---

## Directory Structure

```
manager-notebook/
├── app/                         # Next.js App Router: pages and API routes
│   └── api/                     # Route handlers (thin — business logic lives in lib/)
├── lib/                         # All business logic
│   ├── capacity/                # Capacity math (pure, no I/O)
│   ├── jira/                    # Jira client, sprint sync, velocity, roadmap
│   ├── oncall/                  # Rootly on-call client
│   ├── snowflake/               # Snowflake connection and query runner
│   ├── holidays.ts              # Portuguese and US public holiday computation
│   └── data/                   # Read/write helpers for all JSON data files
├── components/                  # React components
│   ├── nav/                     # Sidebar and team switcher
│   ├── ui/                      # Generic UI primitives (Button, Card, Input)
│   └── velocity/                # Velocity chart component
├── data/                        # ⚠ gitignored runtime data (JSON cache files)
│   └── teams/{id}/              # Per-team data directory
├── docs/                        # Screenshots
└── memory/                      # workspace.local.md — local Jira context (gitignored)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/jira/client.ts` | Jira HTTP client (`jiraFetch`, `jiraPost`, `jiraPut`) |
| `lib/jira/sprints.ts` | Board discovery and sprint listing |
| `lib/jira/velocity.ts` | Initial committed SP from Jira's velocity chart endpoint |
| `lib/jira/roadmap.ts` | Value Milestone queries |
| `lib/oncall/rootly.ts` | Rootly on-call API client |
| `lib/capacity/calculations.ts` | Core capacity math (`buildCapacityMatrix`, `getTeamMetrics`) |
| `lib/holidays.ts` | Portuguese and US public holiday computation |
| `lib/data/teams.ts` | Multi-team management and `teamDataDir` path resolution |
| `lib/data/config.ts` | Team config read/write (`getConfig`, `saveConfig`) |
| `lib/data/notes.ts` | Notes and action items read/write |
| `lib/snowflake/client.ts` | Snowflake connection setup and `runQuery` |
| `app/api/eom/sync/route.ts` | EOM team sync — fetch direct reports, merge into config, download avatars |
| `app/api/eom/env/route.ts` | Read/write `EOM_TOKEN` (returns masked value on GET) |
| `app/api/avatars/[id]/route.ts` | Serve cached avatar PNGs from `data/teams/{id}/avatars/` |
| `data/config.example.json` | Team config schema reference |

---

## Data Model

All runtime data is stored under `data/teams/{id}/` (gitignored). Files are read/written through `lib/data/` helpers — never directly from route handlers or pages.

| File | Purpose |
|------|---------|
| `data/teams/{id}/config.json` | Team members, SP/day rate, allocation percentages |
| `data/teams/{id}/absences.json` | Days off per member per sprint |
| `data/teams/{id}/jira-cache.json` | Cached sprint data from Jira |
| `data/teams/{id}/sprint-comments.json` | Manager notes per sprint |
| `data/teams/{id}/notes.json` | Freeform notes and action items |
| `data/teams.json` | List of all teams |
| `data/active-team.json` | Currently active team ID |

---

## Domain Terminology

| Term | Meaning |
|------|---------|
| **Capacity SP** | Story points a team can handle in a sprint: `Σ (availableDays × spPerDay)` across all members |
| **Suggested SP** | Capacity SP × (features % + discovery % + debts %) — excludes risk and support allocation |
| **Available days** | Working days (Mon–Fri) in the sprint − days off − public holidays per member |
| **Initial Commit** | SP committed to a sprint when it started, from Jira's velocity chart endpoint (`/rest/greenhopper/1.0/rapid/charts/velocity`) |
| **Final Commit** | Total SP in the sprint at close (all statuses) |
| **Delivered** | SP with status Done or Waiting for Release at sprint end |
| **Over-commit** | Sprint where initial commitment exceeded team capacity SP |
| **Under-deliver** | Sprint where delivered SP < initial commitment |
| **syncedAsClosed** | Boolean flag on a cached sprint entry — set when a closed sprint was fully synced (velocity + delivered SP). The sync route skips re-fetching closed sprints that already have this flag and non-zero SP data |

---

*Last updated: 2026-06-23*
