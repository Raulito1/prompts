# Domain: Roles and Access

> **Purpose**: Who can see what, who can do what. Access control bugs are the worst kind — silent and dangerous. This doc is the source of truth.
> **Last reviewed**: 2026-04-30
> **Status of this doc**: First draft from domain knowledge. Items marked ⚠️ are unverified and need confirmation.

---

## Roles in the system

Six roles, all with the same *functional* access (can see candidates, complete tasks, etc.). The differences are in **scope** (which candidates they see) and **task ownership** (who tasks get assigned to).

| Role | Region scope | Can be assigned to candidate? |
|------|--------------|-------------------------------|
| Recruiter | Single region | Yes (1 per candidate) |
| Specialist | Single region | Yes (1 per candidate) |
| Professional | Single region | Yes (1 per candidate) |
| Team Lead | Multi-region (e.g., all East) | No |
| Recruiter Manager | Multi-region | No |
| Extended Team | All regions | No |

⚠️ Verify: does "Extended Team" cover all regions, or is it functionally similar to Team Lead with different reporting lines?

---

## Access principles

1. **Same functional access for all roles.** Every role can view candidates, complete tasks, edit details (within their scope). The role doesn't restrict *what* they can do; it restricts *which candidates* they see.

2. **Region is the primary scope filter.** A user's region(s) determines which candidates appear in their grid by default.

3. **Cross-region visibility IS allowed.** A region-scoped user can be assigned to a candidate outside their region (e.g., covering for someone OOO). The grid filtering is a default, not a hard wall — when a candidate is explicitly assigned to a user, they can see that candidate regardless of region.

4. **Task ownership flows from role + assignment.** When a Task Map entry's `owner` is "Recruiter," the candidate's assigned recruiter receives that task. Anyone with the Recruiter role *can* see and action it (for OOO coverage), but the candidate's assigned recruiter is the default actor.

⚠️ Verify the technical mechanism: is the task `assigned_to` field set to the individual, or to the role with the assigned person inferred at query time?

---

## Region scope examples

To make this concrete:

> **Raul** is a Recruiter in Southeast.
> Default grid: candidates with `region = Southeast`.
> Can also see: any candidate where Raul is the assigned recruiter, even if region ≠ Southeast.

> **Jane Doe** is a Professional in Northeast.
> Default grid: candidates with `region = Northeast`.
> Can also see: any candidate where Jane is the assigned professional, even if region ≠ Northeast.

> **Matt** is a Team Lead for all East regions.
> Default grid: candidates in any East region (Northeast, Southeast, etc.).
> Cannot be "assigned" to a candidate (Team Leads aren't on the assignment list).

> **Extended Team** members
> Default grid: all candidates, all regions.

---

## "Filter by my candidates"

Recruiter, Specialist, and Professional users can filter the grid to "candidates assigned to me." This filter checks the relevant field on Candidate:

- Recruiter → `candidate.recruiter_id = current_user.id`
- Specialist → `candidate.specialist_id = current_user.id`
- Professional → `candidate.professional_id = current_user.id`

Same UI, different underlying field per role. Easy place to introduce bugs — generalize carefully.

⚠️ Team Lead, Recruiter Manager, Extended Team likely don't have this filter (since they're not assigned). Confirm.

---

## Authorization patterns in code

⚠️ Fill in your actual patterns. Common questions:

- Where does region filtering happen? (Repository layer? Service layer? Controller?)
- How does the system know a user's region(s)?
- How is the override checked when a user accesses a candidate outside their default scope?
- Is there a single `canAccessCandidate(user, candidate)` predicate, or scattered checks?

The single-predicate approach is highly recommended. If your code has scattered region checks, that's tech debt and a likely source of bugs.

---

## Common gotchas

1. **"Same access" doesn't mean "same scope."** A bug like "I assumed all roles could see all candidates" is the most common mistake. Functional access is uniform; region scope is not.

2. **The OOO override is real.** Don't write code that assumes "if user.region != candidate.region, deny access." Always check the assignment fields too.

3. **Task ownership ≠ task visibility.** Anyone with the role can see role-owned tasks (for coverage), but only one person is the default actor. Don't conflate these in queries.

4. **Multi-region users.** Team Lead and Recruiter Manager have multiple regions. Code that treats `user.region` as a single value will break for them. ⚠️ Verify: is this stored as `user.regions[]` or some other structure?

5. **Role checks vs. feature checks.** Don't write `if (user.role == "extended_team")` — that bakes in role-specific logic that breaks when org structure changes. Use capability checks where possible (`if (user.canSeeAllRegions)`).

---

## Where access control is touched in code

⚠️ Fill in actual paths. Likely areas:
- Auth middleware
- Candidate repository / query layer
- Task assignment service
- Grid filtering logic

---

## Related docs

- `DOMAIN_candidates.md` — region/market on candidates
- `DOMAIN_journeys_and_tasks.md` — task ownership and assignment
- `DOMAIN_task_map.md` — owner field on Task Map entries

---

## Open questions

- [ ] Is "Extended Team" technically distinct from Team Lead/Recruiter Manager in access?
- [ ] How are user regions stored (single vs. multi)?
- [ ] Is task `assigned_to` an individual or a role?
- [ ] Single authorization predicate or scattered checks in code?
- [ ] Is there an audit log for cross-region access?
