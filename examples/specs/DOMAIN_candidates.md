# Domain: Candidates

> **Purpose**: How the Candidate entity works in new-hire-experience. The central entity of the app — almost everything else hangs off it.
> **Last reviewed**: 2026-04-30
> **Status of this doc**: First draft from domain knowledge. Items marked ⚠️ are unverified against current code and need confirmation.

---

## What is a Candidate?

A Candidate is a person being considered for or going through the hiring/onboarding journey. The grid view on app load is the central UI surface — it lists all candidates the current user can see, filtered by region.

Candidates have two broad phases:
- **Pre-offer**: in the database, may or may not become active. If the offer isn't accepted, they remain archived (soft-deleted, recoverable).
- **In-journey**: offer accepted, journey started, tasks being generated and assigned.

---

## Core entity (conceptual)

```
Candidate {
  id
  candidate_status         -- state machine, see below
  region                   -- assigned by recruiter
  market                   -- assigned by recruiter
  journey_type             -- e.g., support, advisor (drives task generation)

  -- Assigned people (max 1 of each):
  recruiter_id             -- the recruiter assigned to this candidate
  specialist_id            -- the specialist assigned
  professional_id          -- the professional assigned

  -- Lifecycle timestamps:
  created_at
  offer_accepted_at        -- nullable
  archived_at              -- nullable; soft-delete marker

  -- Detail inputs (large set, fill out over journey):
  ... many fields ...      -- some of these trigger task/flag creation when set
}
```

⚠️ Verify exact field names against current schema; this is the conceptual model.

---

## Candidate status (state machine)

The `candidate_status` field drives lifecycle. ⚠️ Confirm exact enum values.

Likely states (verify):
- **new** — added to system, not yet in journey
- **in_journey** — offer accepted, tasks being generated
- **completed** — finished journey
- **archived** — soft-deleted (offer not accepted, or other reason)

### Re-engagement

Candidates can return from archived — this is **soft-delete only**, never hard-delete. A previously archived candidate may be re-engaged for a future role. UI hides them from the grid; data persists.

⚠️ Document the exact mechanism for re-engagement: is it a status change, or are there other fields involved?

---

## Region and Market

Every candidate has a region and market, set by the recruiter at creation.

- **Region** is the primary access boundary. Most users see only candidates in their assigned region(s).
- **Market** is a sub-grouping within region. Used for routing and reporting; does not affect access.

A user's region scope can be:
- **One region** (e.g., recruiter assigned to Southeast)
- **Multi-region** (e.g., team lead covering all of East)
- **All regions** (admin-equivalent roles)

See `DOMAIN_roles_and_access.md` for who has what scope.

---

## Assigned roles on a candidate

A candidate has at most one of each:
- 1 Recruiter
- 1 Specialist
- 1 Professional

These are individuals (not just roles). Recruiter, Specialist, and Professional users can filter the grid by "candidates assigned to me."

When a task is owned by one of these roles, **the assigned person on that candidate gets the task**. If the assigned person is unavailable (out of office), another user with the same role can step in — the task is visible to anyone with that role, but typically actioned by the assigned person.

⚠️ Verify: is the task technically assigned to the *individual*, or to the *role* with the candidate's assigned person as default? This affects how task ownership is queried.

---

## Loading and filtering

On app load, the candidate grid loads candidates the current user is authorized to see.

- Region-scoped users: load candidates in their assigned region(s)
- All-region users: load all candidates
- Status filter: ⚠️ verify default — does the grid show only active candidates, or include archived by default with a filter to hide?

### Performance note

Region-scoped users typically see 100s of candidates; all-region users may see 1000s+. The grid load must remain performant at the upper end — pagination, virtualization, and indexed region queries matter here.

⚠️ Document current query patterns and any known performance hotspots.

---

## Common gotchas

(Capture lessons here as you encounter them. Starter list:)

1. **Region-scoped users CAN see other regions when needed.** A specialist whose colleague is out can be assigned a candidate outside their normal region. Don't write code that *prevents* cross-region visibility — just defaults to filtering by region in the grid.

2. **Soft-delete is the only delete.** Never hard-delete a candidate. Code that "removes" a candidate must set `archived_at`, not `DELETE FROM`.

3. **Assigned-person fields can be null.** A new candidate may have no recruiter yet, or a candidate whose recruiter left the company has a dangling assignment until reassigned. Code that walks `candidate.recruiter_id → user` must null-check.

4. **Filtering "my candidates" requires role awareness.** A recruiter's "my candidates" filter checks `recruiter_id`. A specialist's checks `specialist_id`. Same UI, different field — easy place to introduce bugs.

5. **Region change has cascade effects.** If a candidate's region is updated, this may affect who can see them, who's assigned, and which tasks should exist. ⚠️ Document the actual behavior — do tasks re-evaluate? Do assignments stay or clear?

---

## Where Candidates are touched in code

⚠️ Fill in actual paths from your codebase. Likely areas:
- Candidate entity / repository
- Grid query (with region filtering)
- Candidate detail page (with input forms that trigger flags/tasks)
- Archive / re-engage endpoints
- Reporting queries

When adding behavior, prefer extending the central candidate service rather than scattering logic.

---

## Related docs

- `DOMAIN_roles_and_access.md` — who can see and do what
- `DOMAIN_journeys_and_tasks.md` — what happens after offer accepted
- `DOMAIN_task_map.md` — the configuration that drives task generation

---

## Open questions

- [ ] Exact `candidate_status` enum values
- [ ] Does the grid hide archived by default, or show with a filter?
- [ ] What happens to a candidate's tasks if their region changes mid-journey?
- [ ] Is task assignment to individuals or to roles (with default = assigned individual)?
- [ ] What's the exact re-engagement flow from archived back to active?
