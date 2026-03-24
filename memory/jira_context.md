# Jira Context

Reference for querying Jira in the context of this notebook.

---

## Projects

> Project keys and team names are in `memory/workspace.local.md` (not committed).

---

## Value Milestones

**Issue type:** `Value Milestone`

### Date Fields

| Field | Custom Field ID | Notes |
|-------|----------------|-------|
| Target Start | `customfield_15485` | Use this, not `startdate` |
| Target End | `customfield_15486` | Use this, not `duedate` |
| Recent Update | `customfield_15727` | Plain text status update, e.g. `"[Mar 19 2026] Releasing the last improvements on this"` |
| Ballpark | `customfield_16494` | T-shirt sizing value: S, M, L, XL |
| Value Stream | `customfield_15370` | Multi-select, e.g. `["Team A", "Team B"]` |

> `duedate` is not used. Always use Target Start / Target End.

### Default Query Behaviour

- **Only show ongoing VMs** — exclude `status = Done` and `status = Cancelled`
- Show Done/Cancelled only when explicitly asked

### JQL Template — Active VMs sorted by Target End

```jql
project = {PM_PROJECT_KEY}
  AND issuetype = "Value Milestone"
  AND assignee = currentUser()
  AND status NOT IN (Done, Cancelled)
ORDER BY customfield_15486 ASC
```

### Fields to Request

```
key, summary, status, customfield_15485, customfield_15486
```

---

> For VM snapshots and other live data, see `memory/workspace.local.md` (not committed).

*Last updated: 2026-03-26*
