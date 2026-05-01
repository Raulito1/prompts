# Domain: Task Map

> **Purpose**: The configuration system that defines what tasks exist. Every task in the system descends from a Task Map entry. Editing the Task Map propagates to existing tasks.
> **Last reviewed**: 2026-04-30
> **Status of this doc**: First draft from domain knowledge. Items marked ⚠️ are unverified and need confirmation.

---

## What is the Task Map?

The Task Map is the master configuration table that defines all possible tasks in the system. Each row is a *template* that, when its trigger conditions are met, generates concrete Task records on candidates.

Think of it as the recipe book; tasks on candidates are the meals.

---

## Task Map entry fields

Each Task Map entry has:

| Field | Purpose |
|-------|---------|
| `trigger` | Condition that determines when this task should exist on a candidate |
| `task_text` | The instruction shown to the user on the task |
| `offset` | Days relative to journey anchor for due date computation |
| `sort` | Display order in Todo grid (within priority group) |
| `owner` | Role responsible (Recruiter, Specialist, Professional, etc.) |
| `task_journey` | Which journey type(s) this applies to (support, advisor, etc.) |
| `email_template` | Optional email template tied to this task |
| `communication` | Optional communication record / template |
| `task_type` | ⚠️ Enumerate types |

⚠️ Verify exact field names and types in current schema.

---

## How triggers work

The `trigger` field defines the condition under which this Task Map entry generates a task on a candidate.

Two evaluation paths:

1. **Synchronous (on candidate input change)** — when a recruiter/team member fills in or updates a candidate detail field, triggers referencing that field are re-evaluated. Matching triggers create tasks/flags immediately.

2. **Scheduled batch job** — runs on schedule across active candidates, evaluates trigger conditions, creates flags where appropriate.

A single trigger can produce multiple tasks/flags from one Task Map entry. ⚠️ Verify: or is it one Task Map entry → one task? Re-read this with the user; was "one trigger creates multiple tasks" referring to multiple Task Map entries firing from the same input, or one entry creating multiple tasks?

⚠️ Document the trigger DSL or expression syntax. What operators? What properties can be referenced?

---

## Task generation flow

When a trigger evaluates true for a candidate:

1. Look up the Task Map entry's owner role
2. Look up the candidate's assigned person in that role (if applicable)
3. Compute due date: journey anchor + offset
4. Create a Task record with text, owner, due_date, sort, etc.
5. If task_type indicates a flag, set `is_flag = true`

⚠️ Verify the journey anchor. Likely `offer_accepted_at` or a similar timestamp.

---

## Editing the Task Map (propagation)

When a Task Map entry is edited, existing tasks derived from that entry should update. This is the most subtle part of the system.

### Intended rules

⚠️ Confirm against current code.

| Existing task state | Edit propagation behavior |
|--------------------|---------------------------|
| Active (incomplete, not snoozed) | Update text, offset (recompute due_date), owner, sort |
| Snoozed | Unsnooze (clear `is_snoozed`, recompute due_date). **Open: should this be conditional?** |
| Complete | **Frozen.** Never modified. |
| Trigger no longer matches | Delete or hide. ⚠️ Verify which. |

### Material-field question

The user has flagged uncertainty about completed-task immutability ("not sure if this happens"). This is worth verifying as priority — if completed tasks ARE being modified by Task Map edits, that's a serious correctness bug.

The "unsnooze on edit" rule is also worth reconsidering. If a recruiter snoozed a task because they had a plan to handle it Friday, and an admin edits the Task Map text Tuesday, auto-unsnoozing surprises the recruiter. Two design options:

- **Option A** (current intent): always unsnooze on edit
- **Option B**: only unsnooze if material fields changed (text, owner, due offset by more than X days)

Decide explicitly; document the decision.

---

## Task Map editing access

⚠️ Verify: who can edit the Task Map? Is this admin-only, or any role? If admin-only, which roles count as admin for this purpose?

This is sensitive — Task Map edits propagate to potentially thousands of candidate tasks. Should require:
- Confirmation modal showing impact ("this will update N existing tasks")
- Audit log entry per edit
- Probably restricted to a small set of users

⚠️ Document the actual current behavior.

---

## Common gotchas

1. **Editing the Task Map is high-blast-radius.** A typo in `task_text` could rewrite the instruction across hundreds of candidate tasks. Treat Task Map edits as carefully as schema migrations.

2. **The "completed tasks frozen" rule is the most important invariant.** If broken, you've corrupted user-signed records. Test this on every change to propagation logic.

3. **Trigger evaluation has two paths.** Sync (input change) and async (batch). They can race. Idempotency matters — if the same trigger evaluates true in both paths simultaneously, you should NOT get duplicate tasks. ⚠️ Verify dedup logic.

4. **`task_journey` filters propagation.** A Task Map entry only applies to candidates with matching journey type. Edits affect only those candidates. Don't write propagation code that walks all candidates.

5. **Offset is relative, not absolute.** Changing offset on a Task Map entry recomputes due_dates for all derived active tasks. If multiple candidates have different journey anchors, they get different new due dates from the same offset change. This is correct, but counterintuitive.

6. **Email templates and communications are referenced, not embedded.** A Task Map entry points to an email_template_id. Editing the email template does NOT count as editing the Task Map — different propagation semantics. ⚠️ Verify this is the actual model.

---

## Where the Task Map is touched in code

⚠️ Fill in actual paths. Likely:
- TaskMap entity / repository
- Task Map admin UI (CRUD)
- Trigger evaluation service (reads Task Map)
- Propagation service (called on Task Map update)
- Task generation service (called on journey start)

---

## Related docs

- `DOMAIN_candidates.md` — the entities tasks attach to
- `DOMAIN_journeys_and_tasks.md` — what tasks become
- `DOMAIN_roles_and_access.md` — owner field semantics

---

## Open questions

- [ ] Exact field names and types in current schema
- [ ] Trigger DSL: what operators, what properties accessible?
- [ ] Does one Task Map entry → one task, or potentially multiple per candidate?
- [ ] What is the journey anchor field?
- [ ] Are completed tasks actually frozen on Task Map edit, or is this a bug?
- [ ] Snoozed task on edit: always unsnooze, or only on material change?
- [ ] When trigger no longer matches existing task: delete or hide?
- [ ] Who can edit Task Map (which roles)?
- [ ] Is there an audit log for Task Map changes?
- [ ] Idempotency between sync and batch trigger evaluation?
