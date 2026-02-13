# PROMPT: Build a React + RTK (RTK Query) demo UI for “Agentic Design” (Version Comparison)

## Context
You are building a **demo front-end** (no real backend required) that showcases an “Agentic Design” workflow UI:
- Users can view multiple **versions** of an agent run side-by-side (Version 1/2/3…).
- Each version has **Details**, **Prompts**, and **Outputs**.
- UI emphasizes **space efficiency**: Details + Prompts are collapsed by default; Outputs are prominent and readable without excessive scrolling.
- There is a “Show Versions” control and the **ability to name versions**.

## Tech Constraints
- React 18 + TypeScript
- Redux Toolkit
- **RTK Query for data access** (even if data is mocked using a fake baseQuery or MSW)
- Prefer **shadcn/ui** components (Accordion, Tabs, Card, Button, ScrollArea, Sheet/Drawer, Tooltip, Badge)
- Styling: Tailwind (no inline styles unless unavoidable)
- Keep code **DRY**: reusable components, shared types, selectors, and utilities
- Performance best practices: memoization where appropriate, stable callbacks, avoid unnecessary re-renders

---

## Demo Requirements (must match the screenshot’s intent)
### Layout
1. **Top bar**
   - Title: “Agentic Design”
   - Button: **Show Versions** (toggles a versions drawer/panel or reveals side-by-side columns)

2. **Left rail / sidebar (Version selector)**
   - Displays the currently selected “Version: Standard” (or user-defined name)
   - Has collapsible sections:
     - Details (collapsed by default)
     - Prompts (collapsed by default)
   - A list: “All Runs for SID12345” (run cards with timestamp, status, run id)

3. **Main comparison area**
   - Show **2–3 version columns** side-by-side (responsive: stack on small screens)
   - Each column is a **VersionCard**:
     - Header: Version name (editable), close “X”
     - Compact “Details” block (model, runs count, latest run timestamp, status)
     - “Prompts” section (Prompt 1..N)
     - “All Runs for SID12345” list
     - **Outputs** displayed in larger readable cards; prioritize Outputs (move them up / allocate more vertical space)

### Interaction
- “Show Versions” toggles the comparison view
- User can:
  - Add a version to compare
  - Remove version column
  - Rename a version (inline edit)
  - Expand/collapse Details and Prompts (default collapsed)
  - Select a run in “All Runs” and see that run’s Outputs

### Data model (mocked)
- Entity: `AgentVersion`
  - id, name, model, status, runs[]
- Entity: `Run`
  - id, startedAt, status, outputs[], prompts[]
- Entity: `Output`
  - id, title, body, createdAt

Include mocked data for:
- SID12345
- Version 2 and Version 3 (each with at least 1 run and 2 outputs)

---

## State & Architecture (DRY)
### Redux
- Use RTK Query endpoints:
  - `getVersions({ sid })`
  - `getVersion({ sid, versionId })`
  - `getRuns({ sid, versionId })`
  - (optional) `updateVersionName({ versionId, name })` mocked
- Use a UI slice for view state:
  - `selectedSid`
  - `comparisonVersionIds: string[]`
  - `selectedRunByVersionId: Record<versionId, runId>`
  - `isShowVersions: boolean`
  - `collapsedSections: { details: boolean; prompts: boolean }` (or per-version if needed)

### Reusable Components (no duplication)
- `PageHeader`
- `SidebarVersionPanel`
- `RunsList` (shared for sidebar + each version card)
- `VersionCard`
- `CollapsibleSection` (Details/Prompts)
- `OutputsPanel` (maps OutputCard)
- `InlineEditableText` (rename version)
- Shared types in `/types`
- Shared formatting utils in `/utils` (date formatting, status badge mapping)

---

## File/Folder Structure
Provide a clean, scalable structure, e.g.
- `src/app/store.ts`
- `src/features/agentic/api/agenticApi.ts` (RTK Query)
- `src/features/agentic/slice/agenticUiSlice.ts`
- `src/features/agentic/components/*`
- `src/pages/AgenticDesignDemoPage.tsx`
- `src/types/agentic.ts`
- `src/utils/format.ts`

---

## Accessibility & UX
- Keyboard accessible controls (rename, collapse, select run)
- Reasonable ARIA labels for buttons (close version, expand details, etc.)
- Status badges (“Completed”, “Running”, “Failed”)
- Empty states (no versions selected, no runs)

---

## Deliverables
1. A working demo page that visually matches the screenshot’s intent:
   - collapsed Details/Prompts
   - outputs prioritized
   - side-by-side version comparison
   - run lists for each version
2. Provide:
   - All TypeScript code files
   - Mock data approach (fake baseQuery or MSW)
   - Minimal setup instructions
3. Keep code DRY and production-quality.

## Do NOT
- Do not use inline styles heavily
- Do not duplicate run list/output rendering in multiple places
- Do not introduce non-essential libraries
- Do not implement real authentication

Now generate the complete implementation.