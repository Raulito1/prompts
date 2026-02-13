# Prompt: Build “Prompt Compare (3-way)” UI using Monaco DiffEditor (DRY + No Bloat)

## CONTEXT
You are working inside an existing React + TypeScript app that already uses Monaco in at least one place.
The app uses Redux Toolkit and RTK Query for server state.
You are adding a new feature: **Prompt Compare** to compare 3 prompts (A/B/C) and show **line differences** using Monaco’s **DiffEditor**.

## OBJECTIVE
Implement a clean, maintainable, DRY “Prompt Compare” feature that:
- Lets users edit **Prompt A / Prompt B / Prompt C**
- Lets users choose a **Base** prompt (A | B | C)
- Renders two diff views:
  - **Base vs B**
  - **Base vs C**
- Uses Monaco’s DiffEditor for diffs (no custom diff logic unless required)

## GUARDRAILS (MUST FOLLOW)
- **No bloat**: do not generate unnecessary abstractions, demo code, or extra features.
- **DRY**: no duplicated JSX for editors/diff panels; use small reusable components/config-driven rendering.
- **Keep typing fast**: prompt text stays in **local component state** (not Redux).
- **Redux usage**: use RTK Query only for async/persisted data (save/load prompt sets, optional run endpoints).
- **No inline styles** except small layout necessities; prefer existing CSS/Tailwind utilities already used in the repo.
- **No new libraries** besides what is required for Monaco integration (already present).
- Respect existing folder structure, lint rules, and component conventions.

## REQUIRED OUTPUTS
1. A short file plan (paths + what each file contains).
2. Production-ready code for:
   - `PromptComparePage.tsx` (page container)
   - `PromptEditorPanel.tsx` (reusable editor for A/B/C)
   - `PromptDiffPanel.tsx` (reusable DiffEditor wrapper)
   - `usePromptCompareState.ts` (small hook to centralize base selection + prompt state, DRY)
   - (Optional) `promptSetsApi.ts` RTK Query endpoints ONLY if you need persistence
3. Any minimal routing/nav changes if needed (do not rewrite the router).

## FEATURE SPEC (DO NOT DEVIATE)
### UI
- Header: Title “Prompt Compare”, Base selector (A/B/C)
- Editors section: three Monaco Editors for A/B/C (same language: `markdown` by default)
- Diff section:
  - Diff 1: Base vs B (if Base is B, show Base vs A instead)
  - Diff 2: Base vs C (if Base is C, show Base vs A instead)
- Each panel has a small label (e.g., “Base: A”, “Compare: B”)
- Add a “Copy Prompt” button per prompt (A/B/C) (minimal, no heavy UI)

### State Rules
- `prompts = { a, b, c }` in local state
- `baseKey = 'a' | 'b' | 'c'`
- Derived comparisons:
  - Determine `compareKey1` and `compareKey2` based on baseKey:
    - If baseKey = A -> compareKey1=B, compareKey2=C
    - If baseKey = B -> compareKey1=A, compareKey2=C
    - If baseKey = C -> compareKey1=A, compareKey2=B

### Monaco Rules
- Use existing Monaco wrapper/pattern used elsewhere in the repo.
- Use DiffEditor for diffs; set options for readability (wordWrap on, readOnly true on diff panels).
- Support sync scroll between diff panels if trivial; otherwise omit (no complexity).

## CONSTRAINTS
- TypeScript strict.
- No `any`.
- Components must be testable and not tightly coupled to global store.
- Avoid over-engineering: no “factory patterns”, no excessive generic types, no unnecessary context providers.

## DELIVERABLE QUALITY BAR
- Minimal and clean.
- DRY rendering via mapping over prompt keys/metadata.
- Clear types.
- Comments only where they prevent confusion (avoid noise).

## INPUTS YOU CAN ASSUME
- Monaco already installed and configured somewhere in the app.
- RTK Query is available.
- You can create new files under an existing feature folder (e.g., `src/features/prompts/compare/`).

## OUTPUT FORMAT
- First: **File plan** as a bulleted list.
- Then: Each file in its own code fence with the full content.
- No additional commentary outside those sections.