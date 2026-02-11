# React + ShadCN UI Guardrails (Anti-Bloat)

Use this document as the single source of truth for building UI in this repo. The goals are:
- DRY, consistent UI patterns
- Minimal inline styling
- Reuse before creating anything new
- RTK Query for server state

---

## Golden Path (Do This First)

### 1) Reuse before you build
Before writing code:
1. Search for an existing component in:
   - `components/uix/*` (preferred)
   - `components/ui/*` (shadcn primitives)
   - `features/**/components/*`
2. If a component exists that is **80%** correct, extend it (props/slots) instead of duplicating it.

**Rule:** No new component if an equivalent already exists.

---

## Folder Structure (Recommended)

- `components/ui/` — shadcn primitives (Button, Dialog, Tabs, etc.)
- `components/uix/` — app wrappers (preferred to use in product code)
- `components/layout/` — layout primitives (Stack/Inline/Grid/PageShell)
- `components/feedback/` — EmptyState, InlineError, SkeletonBlock
- `features/<domain>/` — feature pages + feature components
- `services/api/` — RTK Query API slices
- `lib/` — `cn`, constants, helpers

**Rule:** Product code should prefer `components/uix/*` over raw `components/ui/*`.

---

## Styling Rules (Prevent Inline Style Sprawl)

### ✅ Allowed
- Tailwind utility classes via `className`
- `cn()` helper for conditional class names
- Layout primitives (Stack/Inline/Grid) for spacing and structure

### ❌ Not allowed (without an explicit exception)
- `style={{ ... }}` inline styles
- Hand-built layout wrappers repeated across files:
  - `className="flex flex-col gap-4 p-6"` copied everywhere
- New custom CSS files without a clear cross-app need

### Inline style exceptions (rare)
Allowed only if:
- A value must be computed at runtime and cannot be expressed with Tailwind utilities.
- Prefer CSS variables:
  - `style={{ '--row-height': rowHeight } as React.CSSProperties }`
  - Then use Tailwind/CSS to consume it.

---

## Layout Guardrails (Reduce Repetition)

### Use layout primitives
Prefer:
- `<Stack gap="4">...</Stack>` for vertical flow
- `<Inline gap="2">...</Inline>` for horizontal alignment
- `<PageShell title="..." actions={...}>...</PageShell>`
- `<Section>...</Section>` for consistent padding

**Rule:** If you see the same `flex/space/gap/padding` pattern 3+ times, extract it.

---

## Component Reuse Rules (Stop Recreating Functionality)

### When to create a new component
Create a reusable component ONLY if:
- It will be used in **2+ places**, or
- It replaces repeated code (net deletion of lines), or
- It enforces a cross-app standard (buttons/forms/loading)

If it's truly one-off: keep it local to the feature.

### Prefer composition over duplication
- Use `children`, `render props`, or `slots` patterns.
- Add small props to existing components rather than cloning.

---

## State Management Rules

### Server state: RTK Query
All API calls must use RTK Query.
- No `axios/fetch` inside components.
- Use `providesTags/invalidatesTags` for cache correctness.
- Prefer `selectFromResult` to reduce rerenders.

### UI-only state
Use local component state for:
- modal open/close
- tabs
- input ephemeral state (if not in form lib)

**Rule:** Avoid duplicating server state in component state.

---

## Loading / Error / Empty (Consistency Rules)

### Required standard UI
All data-driven screens must show:
- Loading state (skeleton or spinner)
- Error state (InlineError with retry)
- Empty state (EmptyState with next step)

**Rule:** Do not hand-roll new loading/error/empty designs per page.

---

## Forms (Consistency Rules)

- Use a standard field wrapper (label + control + error).
- Do not manually duplicate label/error markup per input.
- Validation should be centralized (e.g., zod schema) if applicable.

**Rule:** If a form repeats patterns, extract a reusable `AppFormField`.

---

## Performance Guardrails

### Prevent re-render bloat
- Do not inline large objects/arrays in JSX props.
- Memoize derived values (`useMemo`) when it reduces work.
- Prefer stable callbacks (`useCallback`) for frequently re-rendered children.

### Lists and tables
- Ensure stable `key`s
- Avoid heavy computation inside render loops
- Virtualize large lists where needed

---

## Code Review Checklist (PR Must Pass)

- [ ] Reused existing component(s) instead of duplicating UI patterns
- [ ] No inline styles (`style={{...}}`) unless justified and documented
- [ ] Uses `components/uix/*` wrappers where available
- [ ] All API calls are RTK Query (no axios/fetch in components)
- [ ] Standard loading/error/empty states used
- [ ] Net line count decreased or stayed minimal (no unnecessary boilerplate)
- [ ] No new library added unless explicitly requested

---

## AI / Codex Prompt Guardrails (Copy/Paste)

When using GPT/Codex on this repo, include:

- Reuse components from `components/uix/*` first, then `components/ui/*`.
- Do not introduce inline styles; use Tailwind + `cn()` and layout primitives.
- Do not add new libraries.
- Keep the diff small and delete duplication.
- Use RTK Query for all server calls; no axios/fetch in components.
- If creating a new component, it must be reusable and used in 2+ places.

---

## Common Refactor Targets (High ROI)

Extract into `components/uix/` when repeated:
- Page header + actions (`PageShell`)
- Confirm dialogs (`ConfirmDialog`)
- Async boundary (`AsyncBoundary`)
- Form field wrapper (`AppFormField`)
- Empty/error/loading blocks (`EmptyState`, `InlineError`, `SkeletonBlock`)
- Table toolbar + pagination wrapper (`DataTableShell`)

---

## Definition of Done (UI)

A UI change is done when:
- It follows the Golden Path (reuse > extend > create)
- It uses consistent loading/error/empty patterns
- It avoids inline styles and copy/paste layout code
- It reduces maintenance cost (DRY, readable, predictable)