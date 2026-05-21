# Contributing to Capacity Planner

A Next.js capacity planning app. Setup steps below.

---

## Prerequisites

- Node.js 20+
- A Jira account with API token access (for testing Jira-dependent features)

## Install

```bash
npm install
```

## Configure

Create `.env.local` at the repo root:

```env
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_api_token

# Optional — enables on-call page
ROOTLY_API_KEY=your_rootly_key

# Optional — enables Slack send on Support page
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Optional — enables Features and Query pages
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USER=your.email@company.com
SNOWFLAKE_TOKEN=your_programmatic_access_token
```

Copy the example config and edit it to match your team:

```bash
cp data/config.example.json data/teams/default/config.json
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |

---

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for a full breakdown of directories, data flow, and design decisions.

The short version:
- Pages live in `app/` — each folder is a route
- Business logic lives in `lib/` — keep it framework-agnostic
- Data I/O goes through `lib/data/` — don't read files directly in pages or API routes
- Jira API calls go through `lib/jira/client.ts`

---

## Making Changes

### Adding a new page

1. Create `app/{route}/page.tsx`
2. Add an entry to the sidebar in `components/nav/Sidebar.tsx`
3. If the page needs server data, add a route handler under `app/api/`

### Adding a new API route

1. Create `app/api/{path}/route.ts`
2. Data reads/writes go through `lib/data/` — don't use `fs` directly in route handlers
3. External API calls go through a dedicated client module in `lib/`

### Changing the capacity model

The core math is in `lib/capacity/calculations.ts`. The `buildCapacityMatrix` function is the main entry point — it takes sprints, config, absences, and a working-days map and returns a `SprintCapacity[]`. It must stay pure (no I/O, no async).

### Adding a new country's holidays

Add a function to `lib/holidays.ts` that returns public holidays for that country, and register it in `getHolidaysInSprintForCountry`. Member country codes are set per member in config (e.g. `"PT"`, `"US"`).

---

## Code Standards

TypeScript strict mode (`strict: true` in `tsconfig.json`). Keep it that way — fix type errors rather than casting them away.

No linter config is checked in. Follow the patterns already in the codebase: functional React components, Tailwind for styling, `@/` path aliases for imports, Phosphor icons (`@phosphor-icons/react`, duotone weight) with the `*Icon` suffix (e.g. `CalendarIcon`).

---

## Gitignored Files

| Pattern | Why |
|---------|-----|
| `data/*` | Team-specific runtime data |
| `.next/` | Next.js build output |
| `node_modules/` | Dependencies |
| `.env.local` | Secrets |
| `*.local.md` | Local workspace notes |

`data/config.example.json` is the only data file committed — it serves as a schema reference.

---

## Branch and Commit Conventions

No enforced convention. Use short, descriptive commit messages that say what changed (see `git log --oneline` for the existing style). Work directly on `main` or open a branch and merge via pull request.
