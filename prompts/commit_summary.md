You are a senior engineer. Enhance an existing endpoint that returns commits for Jira issues to produce a Sprint Dashboard summary (daily bubbles + totals + modal drill-down) with ZERO codebase bloat.

CONTEXT
- The endpoint(s) already return raw commit records per Jira issue (I will paste the current response and code).
- Keep architecture unchanged. No new layers. No new dependencies.
- The UI needs: totals per issue + commits grouped by day + top committers + unique repos count.
- Must remain backward compatible: existing `commits: [...]` response stays unchanged.

OBJECTIVE
Add an OPTIONAL computed field `summary` (or `issueCommitSummary`) built from the existing commit list:
- totals: commits, repos, fileChanges, linesAdded, linesDeleted (if available)
- committers: top N committers by count
- perDay: map YYYY-MM-DD → {commits, linesAdded, fileChanges}
- commitsByDay: map YYYY-MM-DD → commits[] for fast modal rendering
This must be O(n) per issue and use a single-pass reducer.

STRICT RULES (ANTI-BLOAT)
- Add at most ONE small pure function: `aggregate_commits(commits) -> summary`
- Reuse existing DTOs/mappers; do not create new classes unless required by typing.
- Do not add new modules unless a utils folder already exists.
- Do not add logging or refactors unrelated to this change.
- If any fields are missing (fileChanges/LOC), compute only what’s available and keep the summary schema stable.

OUTPUT FORMAT
1) Chosen response shape (final JSON)
2) Minimal patch-style diff only (unified diff)
3) One unit test for the pure aggregation function
4) Notes on bubble sizing (how UI should derive size from perDay)

INPUTS I WILL PROVIDE
- Current endpoint code
- Current commit DTO/shape (example JSON)
- Sprint date range and how sprint issues are queried
Proceed once inputs are pasted.