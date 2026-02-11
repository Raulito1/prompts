# UI Cleanup Plan (React + ShadCN) — De-bloat Existing Code

## Objectives
- Remove duplicated UI patterns (dialogs/forms/tables/page shells)
- Eliminate inline styles and inconsistent spacing/layout
- Standardize loading/error/empty states
- Reduce component complexity and rerenders
- Create a small `uix/` layer so future work stays DRY

---

## Cleanup Principles (Non-Negotiable)
1. **Refactor in slices**: small PRs, one concern at a time.
2. **Net deletion** is the goal: every refactor should remove lines or simplify behavior.
3. **Behavior must not change** unless explicitly intended.
4. **Prefer composition** (wrappers + slots) over rewriting pages.
5. **RTK Query owns server state**; components should not re-fetch or re-store server data.

---

## Phase 0 — Baseline & Inventory (1 PR)
### A) Create tracking checklist
Create `docs/ui-cleanup-inventory.md` and track:
- Files with `style={{}}`
- Pages with repeated modal/table/form patterns
- Repeated “loading/error/empty” blocks
- Repeated layout wrappers (`flex flex-col gap-* p-*` etc.)
- Components > 250 lines (likely candidates)

### B) Add quick detection commands
- Search inline styles:
  - `style={{` (global search)
- Find repeated layout patterns:
  - `flex flex-col gap-`
  - `justify-between`
  - `p-6` / `px-6` / `py-4`
- Find repeated loading patterns:
  - `isLoading` blocks duplicated
  - `error &&` blocks duplicated

Deliverable: inventory list + links to the worst offenders.

---

## Phase 1 — Introduce the “uix” Layer (No App Logic Changes)
Create:
- `components/uix/` (app wrappers)
- `components/layout/` (Stack/Inline/Grid/PageShell)
- `components/feedback/` (EmptyState/InlineError/SkeletonBlock)

### Minimal initial components (high ROI)
1. `PageShell` — consistent padding + title + actions slot
2. `Stack` / `Inline` — spacing primitives
3. `InlineError` — consistent error UI + retry slot
4. `EmptyState` — consistent empty UI
5. `SkeletonBlock` — consistent loading UI
6. `ConfirmDialog` — one standard confirm pattern

Deliverable: wrappers exist and are used in 1–2 places as examples.

---

## Phase 2 — Remove Inline Styles (Mechanical Refactor Pass)
### Rule
- Replace inline style with either:
  1) Tailwind utilities, or
  2) layout primitives (`Stack`, `Inline`, `PageShell`), or
  3) CSS variables (rare dynamic needs)

### Execution
- Start with top 10 files from inventory that have the most `style={{}}`.
- For each file:
  - Remove inline layout styles first (margin/padding/flex/width/height)
  - Keep behavior identical
  - Avoid “improving” logic at the same time

Deliverable: PRs that reduce `style={{}}` occurrences steadily.

---

## Phase 3 — Standardize Async UI (Loading/Error/Empty) for RTK Query Screens
Create `AsyncBoundary` (or equivalent wrapper) that handles:
- loading (skeleton)
- error (InlineError)
- empty (EmptyState)
- success (children)

### Refactor approach
For each data page:
1. Replace custom loading/error/empty blocks with the standard ones.
2. Ensure retry uses RTK Query `refetch`.

Deliverable: consistent UX + less repeated conditional JSX.

---

## Phase 4 — Collapse Duplicated UI Patterns
Focus on the biggest repetition areas first:

### A) Dialogs
- Identify pages with similar Dialog footers (Cancel/Save)
- Replace with `ConfirmDialog` or `AppDialog` wrapper
- Standardize button placement and variants

### B) Forms
- Introduce `AppFormField` wrapper (label + control + message)
- Replace repeated label/error markup
- Centralize validation (if applicable)

### C) Tables / Lists
- Create `DataViewShell` or `TableShell`
  - header + filters + actions + body
  - empty/loading/error handled inside
- Extract repeated toolbar logic (search, filters, export, etc.)

Deliverable: fewer bespoke implementations; more shared primitives.

---

## Phase 5 — Component Complexity Reduction (Performance + Readability)
### Targets
- Any component > 250 lines
- Any component with 5+ `useEffect`s
- Any component managing both server state and complex UI state

### Tactics
- Extract UI-only logic into hooks:
  - `useDialogState`, `useFilters`, `usePagination`
- Extract presentational components:
  - “container” handles data, “view” renders UI
- Use RTK Query `selectFromResult` for performance
- Memoize expensive derived data

Deliverable: smaller components with clear responsibilities.

---

## Phase 6 — Enforce Guardrails (So It Stays Clean)
### Add ESLint rules / constraints
- Disallow inline styles (`style` prop) except documented allowlist
- Encourage reuse of `uix/` components
- Prevent duplicate imports of raw shadcn primitives where wrappers exist

### Add PR checklist
- No new UI pattern without checking `uix/`
- No inline styles
- RTK Query only for server calls
- Standard async states used

Deliverable: drift prevention.

---

## Suggested PR Sequence (Low Risk)
1) Add `uix/` + layout + feedback primitives (no rewrites)
2) Replace inline styles in top 5 offenders
3) Standardize async UI for 2–3 key pages
4) Extract common Dialog + FormField
5) Consolidate tables/lists
6) Complexity reduction for biggest components
7) Add enforcement (lint + PR checklist)

---

## Definition of Done (Cleanup)
- Inline styles reduced by >80% (or eliminated except rare cases)
- 1 standard approach for dialogs/forms/async UI
- `uix/` layer adopted by all new work
- Duplicated UI patterns removed (net deletion)
- Data pages rely on RTK Query patterns consistently