

# Floating AI Button + 50% Sheet (ShadCN) — Implementation Prompt

## Role
Act as a senior React + TypeScript engineer specializing in ShadCN UI, Redux Toolkit patterns, and maintainable UI architecture.

## Goal
Implement a **persistent floating AI button** anchored to the **bottom-right** of the app at all times. When clicked, it should open a **ShadCN `Sheet`** that slides in from the **left or right** and occupies **50% of the viewport width**. The sheet should support two modes:
- **AI Summary**
- **AI Insights**

The sheet content should be **inline/assistive** (not a full chat modal). The floating button should be lightweight and always available.

## Current Stack / Assumptions
- React + TypeScript
- Tailwind CSS
- ShadCN UI components installed (Button, Sheet, etc.)
- Redux Toolkit exists and there is an existing `ui` slice available

## State Management Requirement
Use the existing **UI slice** to manage global UI primitives. Store only what is needed:
- open/close state
- side (left/right)
- mode (summary/insights)
- optional context payload (entityType/entityId) for future use

Do **not** store layout measurements or transient UI-only internal details in Redux.

## Non‑Negotiable Constraints
- **NO inline styles**
- Prefer ShadCN primitives over custom re-implementations
- Avoid bloat: minimal files, minimal state, minimal abstractions
- **Sheet** (not Dialog) for the sliding panel
- One global host for the sheet mounted once in AppShell/Layout
- Floating button should only dispatch actions (no duplicated sheet logic)
- Keep code DRY and performance-friendly

## UX Requirements
- Floating action button (FAB) is fixed bottom-right with safe spacing and high z-index
- Clicking the FAB opens the sheet on the configured side
- The sheet width is **50%** (`w-1/2` or `w-[50vw]`), with optional max width clamp for large screens
- The sheet has a header showing the current mode and a close button
- Provide two actions:
  - **AI Summary** opens the sheet in `summary` mode
  - **AI Insights** opens the sheet in `insights` mode
- Provide ESC/overlay close using default Sheet behavior

## File/Folder Targets
Add the following files (or integrate into your existing structure cleanly):

- `src/store/uiSlice.ts` (or the existing UI slice file)
- `src/components/ai/AIFloatingAIButton.tsx`
- `src/components/ai/AISheetHost.tsx`

(If you already have these, update them rather than duplicating.)

## Required Data Model (UI Slice)
Add an `aiSheet` section to your UI slice:

```ts
export type AISheetMode = "summary" | "insights";
export type AISheetSide = "left" | "right";

export interface AISheetContext {
  entityType?: string;
  entityId?: string;
}

export interface AISheetState {
  open: boolean;
  side: AISheetSide;
  mode: AISheetMode;
  context?: AISheetContext;
}
```

Initial state example:
```ts
aiSheet: {
  open: false,
  side: "right",
  mode: "summary",
  context: undefined,
}
```

## Required UI Slice Actions
Implement these Redux Toolkit actions:

- `openAISheet(payload: { mode: AISheetMode; side?: AISheetSide; context?: AISheetContext })`
- `closeAISheet()`
- `setAISheetMode(mode: AISheetMode)` (optional but acceptable)
- `setAISheetSide(side: AISheetSide)` (optional but acceptable)

Rules:
- `openAISheet` must set `open=true` and set the mode (and side/context if provided)
- `closeAISheet` must set `open=false`

## Component 1 — Floating Button
Create `AIFloatingAIButton.tsx`:

Requirements:
- Fixed bottom-right container: `fixed bottom-6 right-6 z-50`
- Use ShadCN `Button` with `size="icon"` and circular shape (`rounded-full`)
- Clicking shows **two action buttons** (Summary/Insights)
- Use ShadCN `Popover` OR a minimal inline menu (Popover recommended)
- Each action dispatches `openAISheet({ mode: "summary" | "insights" })`

Implementation notes:
- Keep this component dumb: no sheet rendering inside
- Avoid extra libraries

## Component 2 — Global Sheet Host
Create `AISheetHost.tsx` and mount it **once** in your root layout (AppShell).

Requirements:
- Subscribe to Redux `aiSheet` state using typed selectors
- Render ShadCN `Sheet` and set `open` + `onOpenChange`
- When `onOpenChange(false)` fire, dispatch `closeAISheet()`
- Use `SheetContent` with `side` from state

Width requirement:
- Use Tailwind classes only (no inline styles)
- Must be ~50% width:
  - preferred: `w-1/2`
  - optionally better responsiveness: `w-[50vw] max-w-[900px] min-w-[360px]`

Example:
- `className="w-1/2 sm:w-[50vw] max-w-[900px]"`

## Sheet Content
In `AISheetHost`, render content based on `mode`:
- If `summary`: render `<AISummaryPanel />` placeholder
- If `insights`: render `<AIInsightsPanel />` placeholder

For now, implement placeholders inline in the host file (or as tiny components) with minimal markup:
- Title
- A short description
- A stub area where AI results will appear later

Do NOT implement backend calls in this iteration.

## Placement
In your App layout/root:
- Render `<AISheetHost />` and `<AIFloatingAIButton />` at the top level so they persist across routes.

Example (pseudo):
```tsx
export function AppShell() {
  return (
    <>
      <Header />
      <main>...</main>
      <AISheetHost />
      <AIFloatingAIButton />
    </>
  );
}
```

## Accessibility & Behavior
- Ensure buttons have `aria-label`s where appropriate
- Ensure the popover menu is keyboard accessible (ShadCN Popover covers this)
- Do not block page scroll unnecessarily

## Performance Guardrails
- Memoize selectors if needed, but keep it simple
- Avoid re-rendering the entire app when toggling the sheet: keep state scoped to `ui.aiSheet`
- Avoid recreating callbacks excessively; use `useCallback` only if needed

## Output Requirements
Return:
1. The updated UI slice code (only the relevant `aiSheet` additions and actions)
2. Full code for `AIFloatingAIButton.tsx`
3. Full code for `AISheetHost.tsx`
4. A short note showing exactly where to mount both components in the AppShell

## Prohibited
- No inline CSS
- No custom portals
- No new state libraries
- No duplication of ShadCN components
- No "over-architecting" (no event buses, no complex abstractions)

## Final Self-Check
Before responding, ensure:
- The FAB always shows
- The sheet opens at 50% width from left/right
- Mode switching works
- Redux state remains minimal
- Code is clean and copy/paste usable