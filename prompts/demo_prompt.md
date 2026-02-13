# Prompt: Build “Prompt Compare (3-way)” UI with Stepper + Upload-to-Monaco (DRY + No Bloat)

## CONTEXT
You are working inside an existing React + TypeScript app that already uses Monaco.
The app uses Redux Toolkit and RTK Query for server state.
You are adding a new feature: **Prompt Compare** to compare prompts and show **line differences** using Monaco **DiffEditor**.

## OBJECTIVE
Implement a clean, maintainable, DRY “Prompt Compare” feature that:
- Guides the user through **steps** (visible progress)
- Step 1: Upload/select the **Base prompt** (used as comparison baseline)
- Step 2: Upload/select **two prompts to compare** (Compare 1 + Compare 2)
- Step 3: Show editors + diffs:
  - Monaco editors for Base / Compare 1 / Compare 2 (editable)
  - Two diff views using Monaco DiffEditor:
    - Base vs Compare 1
    - Base vs Compare 2
- The uploaded content populates the Monaco editors automatically.

## GUARDRAILS (MUST FOLLOW)
- **No bloat**: do not add extra features beyond spec.
- **DRY**: avoid duplicated JSX; use small reusable components and config-driven rendering.
- **Local state for typing**: prompt text stays in local component state (not Redux).
- **Redux usage**: RTK Query only for persisted/async (optional). Upload parsing happens client-side.
- **No inline styles** except minimal layout; prefer existing styling system used in the repo.
- **No new libraries** unless strictly necessary; if needed, pick a lightweight option.
- Respect existing folder structure, lint rules, and component conventions.
- TypeScript strict, no `any`.

## REQUIRED OUTPUTS
1. Short file plan (paths + responsibility).
2. Production-ready code for:
   - `PromptCompareWizardPage.tsx` (page container with steps)
   - `PromptUploadStep.tsx` (reusable upload UI for step 1 and step 2)
   - `PromptCompareWorkspace.tsx` (editors + diff panels)
   - `PromptEditorPanel.tsx` (Monaco Editor wrapper)
   - `PromptDiffPanel.tsx` (Monaco DiffEditor wrapper)
   - `usePromptCompareWizard.ts` (hook that owns wizard state + DRY step logic)
   - `fileParsing.ts` (safe file parsing helpers)
3. Minimal routing/nav changes only if needed.

## FEATURE SPEC (DO NOT DEVIATE)

### Terminology
- `base` = the baseline prompt
- `compare1` and `compare2` = the two prompts compared against base
- Keys: `base | compare1 | compare2`

### Stepper (3 steps)
- Step 1: **Upload Base Prompt**
  - UI: file picker + optional drag-and-drop area
  - Accept: `.txt`, `.md`, `.json`
  - After upload, parse file → set `prompts.base`
  - Show a small preview snippet (first ~200 chars)
  - “Next” enabled only when base is present (non-empty)

- Step 2: **Upload Prompts to Compare**
  - Two upload slots: “Compare Prompt 1” and “Compare Prompt 2”
  - Each slot accepts `.txt`, `.md`, `.json`
  - After upload, parse file → set `prompts.compare1` / `prompts.compare2`
  - “Next” enabled only when at least **one** compare prompt is present
    - If only one provided, still proceed; show second editor empty (user can type)

- Step 3: **Review & Compare**
  - Show 3 Monaco editors (Base / Compare 1 / Compare 2)
  - Show 2 Monaco DiffEditors:
    - Base vs Compare 1
    - Base vs Compare 2
  - Provide a back button to return to uploads without losing state

### Upload Parsing Rules
- `.txt` / `.md`: treat as plain text
- `.json`: support these shapes (in priority order):
  1) `{ "prompt": "..." }`
  2) `{ "content": "..." }`
  3) `{ "text": "..." }`
  4) any JSON → pretty-print as text (2-space indent) as fallback
- Enforce max file size (e.g., 200KB) to prevent performance issues.
- If parse fails, show a user-friendly error message (no stack traces).

### Editor Behavior
- Monaco language default: `markdown` (configurable constant).
- Editing is allowed in Step 3 (user can tweak prompts).
- Add “Copy” buttons per editor panel (Base/Compare1/Compare2).
- Add a “Reset to Uploaded” button per panel (optional, minimal) ONLY if easy:
  - Store `uploadedPrompts` separately from `draftPrompts`
  - Reset restores from uploaded snapshot (DRY approach)

### Diff Behavior (Monaco DiffEditor)
- Diffs are read-only.
- Options: wordWrap on, renderSideBySide true, minimap off (if consistent with app).
- No custom diff algorithm; use Monaco DiffEditor.

## STATE SHAPE (MUST USE)
```ts
type PromptKey = "base" | "compare1" | "compare2";

type PromptCompareState = {
  step: 1 | 2 | 3;
  prompts: Record<PromptKey, string>;          // current drafts shown in editors
  uploadedPrompts: Record<PromptKey, string>;  // last uploaded versions (for reset)
  errors: Partial<Record<PromptKey, string>>;  // upload/parse errors
};