# Domain: Journeys and Tasks

> **Purpose**: How a candidate's journey produces tasks, how tasks behave, and how the Todo grid presents them. This is the single biggest source of bugs and features in the app.
> **Last reviewed**: 2026-04-30
> **Status of this doc**: First draft from domain knowledge. Items marked ⚠️ are unverified and need confirmation.

---

## What is a Journey?

A Journey is the structured path a candidate goes through after their offer is accepted. The journey type (e.g., support, advisor) determines which tasks get generated.

⚠️ List the actual journey types in your system. Likely includes: support, advisor, ⚠️ others?

A candidate has exactly one journey type. The journey type, combined with the Task Map, determines which tasks exist for that candidate.

---

## What is a Task?

A Task is a unit of work tied to a specific candidate, derived from a Task Map entry. Tasks have an owner (a role) — the candidate's assigned person in that role is the default actor.

```
Task {
  id
  candidate_id
  task_map_entry_id          -- which Task Map row generated it
  task_text                  -- the actual instruction (from Task Map at generation time)
  due_date                   -- computed from offset relative to journey anchor
  owner_role                 -- recruiter, specialist, professional, etc.
  task_type                  -- ⚠️ enumerate types
  is_complete                -- boolean, toggled by user
  is_snoozed                 -- boolean flag
  is_flag                    -- boolean; true means this is a flag (priority task)
  email_template_id          -- nullable
  communication_id           -- nullable
  sort_order
  ... timestamps ...
}
```

⚠️ Verify exact field names, especially around the snoozed/flag flags.

---

## Tasks vs. Flags

Flags **are** tasks — they're not a separate entity. A flag is a task with a "flag" indicator that bumps it to higher priority. The Todo grid shows flags first.

Tasks come from two sources:
- **Triggers from candidate detail inputs** — synchronous, fire when the input is set/changed
- **Scheduled batch job** — runs on a schedule, creates flags based on conditions (e.g., "candidate has been in journey >X days without completing Y")

A single trigger can create multiple tasks/flags.

⚠️ Document the batch job: what schedule, what conditions, what fields it checks.

---

## Task lifecycle

States as represented by booleans on Task:

| State | `is_complete` | `is_snoozed` | Notes |
|-------|---------------|--------------|-------|
| Active | false | false | Default — needs attention |
| Snoozed | false | true | User pushed `due_date` forward |
| Complete | true | false (or any) | Terminal — toggled when user marks done |

⚠️ Verify: when a task is completed, does `is_snoozed` matter / get cleared?

### Completion

Marking a task complete sets `is_complete = true`. ⚠️ Verify whether there's a `completed_at` timestamp and `completed_by` user reference.

**Completed tasks are frozen.** They are not modified by Task Map edits or trigger re-evaluations. (See "Task Map edits" below.)

### Snoozing

Snoozing changes the task's `due_date` to a later time and sets `is_snoozed = true`. The task remains visible in the Todo grid under the "Snoozed" filter. There is no separate snooze table; it's just a flag and a date change.

⚠️ Verify: is the original due_date preserved anywhere, or just overwritten?

---

## Task ownership

Each Task Map entry specifies an `owner` role. When a task is generated for a candidate:

- If owner = Recruiter → goes to `candidate.recruiter` (assigned individual)
- If owner = Specialist → goes to `candidate.specialist`
- If owner = Professional → goes to `candidate.professional`
- If owner = Team Lead / Recruiter Manager / Extended Team → ⚠️ verify how these are routed (region-based? round-robin? all members of role?)

The assigned person is the *default actor* but the task is visible to anyone with the same role for OOO coverage. See `DOMAIN_roles_and_access.md`.

⚠️ Verify: does `task.assigned_to` store an individual or a role?

---

## The Todo grid

The Todo grid is the primary work surface. It shows tasks across all candidates the user can see (with normal region scoping).

### Filters

Three views on the Todo grid:

- **ALL** — incomplete tasks. Sort: flags first, then snoozed, then active. ⚠️ Verify sort within each group.
- **SNOOZED** — only tasks where `is_snoozed = true`
- **FLAGS** — only tasks where `is_flag = true`

### What's NOT shown

Completed tasks (`is_complete = true`) are not shown in the Todo grid. ⚠️ Verify: is there a "Completed" view elsewhere, or is completion terminal-and-hidden?

### Region scoping

The Todo grid is filtered by the user's role and region scope (same rules as the candidate grid). A region-scoped user sees tasks for candidates in their region, plus tasks on candidates explicitly assigned to them.

⚠️ Verify the exact filtering logic — does it filter by candidate visibility, by task ownership, or both?

---

## Task generation: the flow

When does a task come into existence?

1. **Journey starts** — candidate's offer is accepted, journey type is set. The system generates tasks from all Task Map entries matching that journey type. Due dates computed from offsets relative to a journey anchor (e.g., start_date).

2. **Trigger fires from candidate detail input** — recruiter/team fills in a candidate input that has a trigger. Task(s)/flag(s) are created immediately.

3. **Scheduled batch job** — runs on schedule, evaluates conditions across active candidates, creates flags.

⚠️ Document the journey anchor — is it `offer_accepted_at`, `start_date`, something else?

---

## Task Map edits and propagation

This is the trickiest part of the domain. When a Task Map entry is edited, existing derived tasks need to update.

### Rules (intended behavior — ⚠️ verify against current code)

| Existing task state | What happens on Task Map edit |
|--------------------|-------------------------------|
| Active (incomplete, not snoozed) | Updates: text, due_date offset, owner, etc. |
| Snoozed | ⚠️ Currently intended to unsnooze (because the task changed). **Open question: should this be conditional on which fields changed?** |
| Complete | **Frozen.** Never modified by Task Map edits. |
| Hidden (trigger no longer matches) | Deleted or hidden. ⚠️ Verify which. |

### The "should this happen" caveat

⚠️ The user has noted that *intended* propagation rules may not match *actual* current behavior. Specifically: "completed tasks should stay frozen — not sure if this happens." Verify this against current code as priority. If actual behavior diverges, file a bug.

### Why this matters

If Task Map propagation is broken or inconsistent, every Task Map edit is a potential silent corruption of candidate-level task state. This is the highest-leverage area to get right.

---

## Common gotchas

1. **Flags are tasks.** Code that handles "tasks" must include flags. There is no separate flag table. A query for `WHERE is_flag = true` is a query for a subset of tasks.

2. **Completed tasks are immutable.** Don't write code that updates completed tasks via Task Map propagation. The completion is the user's signed record that they did the work.

3. **Snoozing is a date change + flag, not a separate state machine.** Don't introduce a separate `snoozed` state column unless you're refactoring the whole thing intentionally.

4. **Multiple tasks per trigger.** A single candidate input can fire a trigger that creates several tasks/flags. Code that assumes 1:1 between trigger and task will miss this.

5. **The grid sort order matters.** Flags first, snoozed, active — users rely on this. Don't break it without intent.

6. **Region-scoped Todo grid is a query join.** Tasks → Candidates → Region. Make sure indexes exist; this query runs on every page load for hundreds of users.

7. **Batch job and synchronous triggers can collide.** If both fire for the same candidate around the same time, you can create duplicate tasks. ⚠️ Verify: is there idempotency / dedup logic? If not, this is latent bug territory.

8. **"Owned by role" vs "assigned to person" semantics.** The Task Map says owner = role; the candidate has an assigned person for that role; the actual task's `assigned_to` is some combination. Get this query pattern documented and reuse it; don't reinvent per feature.

---

## Where Journeys and Tasks are touched in code

⚠️ Fill in actual paths. Likely:
- Task entity / repository
- Task generation service (called on journey start)
- Task Map propagation service (called on Task Map edit)
- Trigger evaluation service (called on candidate input change)
- Scheduled batch job for flag generation
- Todo grid query
- Task complete / snooze endpoints

---

## Related docs

- `DOMAIN_candidates.md` — the parent entity
- `DOMAIN_roles_and_access.md` — who owns tasks
- `DOMAIN_task_map.md` — the configuration that drives generation

---

## Open questions

- [ ] Exact journey types and what differentiates them
- [ ] Journey anchor field name (`offer_accepted_at`? `start_date`?)
- [ ] Does the batch job check for existing tasks before creating flags (idempotency)?
- [ ] On snoozed task + Task Map edit: unsnooze always, or only if material fields changed?
- [ ] When trigger no longer matches existing task: delete vs hide?
- [ ] Is there a "completed tasks" view, or is completion strictly hidden after?
- [ ] How are role-owned tasks (Team Lead, etc.) routed — region? individual? all members?
