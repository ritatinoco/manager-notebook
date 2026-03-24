# Bootstrap — First-Time Setup

Run this when setting up the notebook for the first time, or when mandatory files are missing or empty.

---

## Part 1 — Workspace Identity

**File:** `memory/workspace.local.md` (gitignored)

1. Check if the file exists and the Identity section is filled.
   - If complete: skip to Part 2.
   - If missing or incomplete: collect the following, one at a time.

   | Field | Question to ask |
   |-------|----------------|
   | Owner | What is your name? |
   | Company | What company do you work at? |
   | Team name | What is your team called? |
   | Number of direct reports | How many direct reports do you have? |
   | Team Jira project key | What is your team's Jira project key? (e.g. RAR) |
   | Product Management Jira project key | What is the product/roadmap Jira project key? (e.g. RPOR) |

2. Write `memory/workspace.local.md` using the template below.

3. Use the Jira MCP to fetch active Value Milestones and append them under `## Known Active VMs`. Use the JQL template from `memory/jira_context.md`.

4. Remind the user the file is gitignored — re-run on each new machine or clone.

### Template — `memory/workspace.local.md`

```markdown
# Local Workspace Context (not committed)

---

## Identity

**Owner:** {name}
**Company:** {company}
**Teams:** {n} team ({team name}), {n} direct reports
**Team JIRA Project/Space Key**: {team key}
**Product Management JIRA Project/Space Key**: {pm key}

---

## Known Active VMs (as of {today})

{table fetched from Jira}

> Snapshot from {today}. Re-query for current state.
```

---

## Part 2 — Writing Style

**File:** `me/writing_style.md` (committed)

1. Check if `me/writing_style.md` exists and has real content in the Writing Samples section.
   - If samples exist: skip this part.
   - If the file is missing or samples are empty: run the interview below.

2. **Start with samples — they anchor everything else.** Ask the user to paste 2–4 real pieces of writing they've sent, covering different contexts if possible:

   | # | Prompt |
   |---|--------|
   | 1 | Paste a Slack message you sent to your team — ideally a technical update or investigation. |
   | 2 | Paste something you wrote for a self-assessment or performance review. |
   | 3 | Paste a message to a cross-functional group, a peer, or an executive (optional). |
   | 4 | Paste any other example that feels like "this sounds like me" (optional). |

3. Once samples are collected, ask the shorter profile questions:

   | Field | Question |
   |-------|---------|
   | Tone spectrum | On a scale from Very Formal to Very Casual, where do you sit? (1=formal, 5=casual) |
   | Directness | Very Direct (1) to Very Cautious (5)? |
   | Warmth | All Business (1) to Highly Personal (5)? |
   | Words you never use | Any words or phrases that immediately feel wrong or fake when you see them? |
   | Signature/opener habits | How do you typically open a Slack message? How do you close emails? |

4. Write the samples verbatim into `me/writing_samples.local.md` (not committed). Write `me/writing_style.md` using the template below, filling in answers and inferring tone characteristics, sentence patterns, and phrases from the samples — don't ask for what you can observe.

### Template — `me/writing_style.md`

```markdown
# Writing Style Guide

This document captures your authentic voice so Claude can write in a way that sounds like you—not like AI.

---

## Tone Profile

### Formality
```
Very Formal [ ] [ ] [ ] [ ] [ ] Very Casual   ← mark with X
```

### Verbosity
```
Very Concise [ ] [ ] [ ] [ ] [ ] Very Verbose
```

### Directness
```
Very Direct [ ] [ ] [ ] [ ] [ ] Very Cautious
```

### Warmth
```
All Business [ ] [ ] [ ] [ ] [ ] Highly Personal
```

### Confidence
```
Tentative [ ] [ ] [ ] [ ] [ ] Assertive
```

---

## Voice Characteristics

### I Sound Like Someone Who...
- {inferred from samples}

### Sentence Patterns
- {inferred from samples}

---

## Words and Phrases I Actually Use

### Openers I Use
- {from samples and answers}

### Transitions I Use
- {from samples}

### Ways I Express Achievement/Ownership
- {from samples}

### How I Close Messages
- {from samples and answers}

### Phrases I Use Frequently
- {from samples}

---

## Words and Phrases to AVOID

### Generic AI-Sounding Words
- "Delve" / "delve into"
- "Utilize"
- "Leverage" as a verb
- "Synergy"
- "Circle back"
- "Touch base"
- "Going forward"
- "Deep dive"
- "Robust"
- "Seamless"

### Phrases That Sound Fake
- "I'm thrilled to..."
- "I'm excited to share..."
- "I wanted to reach out..."
- "Happy to help!"
- "Great question!"
- "Absolutely!"

### Words I Personally Never Use
- {from answers}

---

## Context-Specific Adjustments

### Slack/Chat Style
- {inferred from samples}

### Email Style
- {inferred from samples or ask}

### Document Style
- {inferred from samples}

---

## Writing Samples

{paste samples verbatim, labelled by context}

---

## Anti-Patterns

### Never Do This
- {inferred from avoid list + samples}

### Red Flags That It's Not My Voice
- {inferred from samples}

---

## Instructions for Claude

When drafting anything for me:
1. Read this document first
2. Use my actual phrases from the samples
3. Avoid all words on the avoid list — no exceptions
4. Match context: Slack vs email vs doc vs self-assessment
5. Always include specific data/metrics when discussing performance
6. Don't add enthusiasm I wouldn't add

---

*Last updated: {today}*
```

---

*Run this file as a prompt: "Follow the instructions in BOOTSTRAP.md"*
