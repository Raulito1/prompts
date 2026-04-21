---
name: react-spec-generator
description: >
  Generate spec files (unit and component tests) for React 19 + Vite + shadcn/ui projects using
  Vitest and @testing-library/react. Use this skill whenever the user wants to write tests, spec
  files, unit tests, component tests, or coverage reports for a React + Vite codebase. Trigger
  when they mention "spec", "test", "coverage", "95%", "vitest", "testing-library", or ask to
  "test a component", "write tests for", or "improve coverage". Also trigger if they upload or
  paste a React component and ask what to do with it. This skill handles everything: initial
  Vitest setup, per-file spec generation, shadcn-aware patterns, and coverage threshold enforcement.
---

# React 19 + Vite + shadcn Spec Generator

You are an expert at writing Vitest spec files for React 19 projects. Follow this skill exactly.

## Stack Assumptions

| Layer | Tool |
|---|---|
| Test runner | Vitest |
| Component rendering | @testing-library/react |
| User interactions | @testing-library/user-event v14 |
| Matchers | @testing-library/jest-dom |
| Mocking | Vitest built-ins (`vi.fn`, `vi.mock`, `vi.spyOn`) |
| Coverage | @vitest/coverage-v8 |
| UI | shadcn/ui (Radix primitives + Tailwind) |

## Step 1 — Verify / Bootstrap Vitest Config

Before generating specs, check that the project is configured for 95% coverage.
Read `vitest.config.ts` (or `vite.config.ts`) if it exists. If coverage thresholds are missing or below 95%, output the corrected config.

### Canonical vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',        // barrel files
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Setup file: src/test/setup.ts

```ts
import '@testing-library/jest-dom'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

### Required dev dependencies (run once)

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom @vitest/coverage-v8
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Step 2 — Analyze the Component

Before writing a spec, read the source file carefully and identify:

1. **Props interface** — required vs optional, types, defaults
2. **Internal state** — `useState`, `useReducer`, `useContext`
3. **Side effects** — `useEffect`, data fetching, subscriptions
4. **Events** — onClick, onChange, onSubmit, custom callbacks
5. **Conditional rendering** — branches that affect the DOM
6. **shadcn/ui primitives used** — see shadcn patterns below
7. **External dependencies** — hooks, context providers, router, stores

Map every branch and callback to a test case. 95% branch coverage means **every `if`/ternary/`&&`** needs at least one test for the truthy path and one for the falsy path.

---

## Step 3 — Write the Spec File

### File naming
- Source: `src/components/UserCard.tsx`
- Spec:   `src/components/UserCard.spec.tsx`

Place specs **next to the source file** (not in a separate `__tests__` folder) unless the project already uses a different convention.

### Spec file template

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from './ComponentName'

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  // fill in required props with sensible defaults
}

const renderComponent = (overrides = {}) =>
  render(<ComponentName {...defaultProps} {...overrides} />)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders without crashing', () => {
      renderComponent()
      // at minimum, assert something is in the document
    })

    it('renders required content', () => {
      // assert visible text, roles, labels
    })
  })

  describe('props', () => {
    it('applies optional prop X when provided', () => { })
    it('uses default value for prop X when omitted', () => { })
  })

  describe('interactions', () => {
    it('calls onSomething when button is clicked', async () => {
      const user = userEvent.setup()
      const onSomething = vi.fn()
      renderComponent({ onSomething })
      await user.click(screen.getByRole('button', { name: /label/i }))
      expect(onSomething).toHaveBeenCalledOnce()
    })
  })

  describe('conditional rendering', () => {
    it('shows X when condition is true', () => { })
    it('hides X when condition is false', () => { })
  })

  describe('async behavior', () => {
    it('shows loading state while fetching', async () => { })
    it('shows data after successful fetch', async () => { })
    it('shows error message on fetch failure', async () => { })
  })
})
```

---

## Step 4 — shadcn/ui Patterns

shadcn components are built on Radix UI. Use these patterns to query them correctly.

### Dialog / Sheet / AlertDialog

```tsx
// shadcn Dialog is portal-rendered — use within() is not needed
// Just query from screen directly after open

it('opens dialog on trigger click', async () => {
  const user = userEvent.setup()
  render(<MyDialogComponent />)
  await user.click(screen.getByRole('button', { name: /open/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('closes dialog on cancel', async () => {
  const user = userEvent.setup()
  render(<MyDialogComponent />)
  await user.click(screen.getByRole('button', { name: /open/i }))
  await user.click(screen.getByRole('button', { name: /cancel/i }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
```

### Select (Radix)

```tsx
it('selects an option', async () => {
  const user = userEvent.setup()
  render(<MySelect />)
  await user.click(screen.getByRole('combobox'))
  await user.click(screen.getByRole('option', { name: /option label/i }))
  expect(screen.getByRole('combobox')).toHaveTextContent('Option Label')
})
```

### Checkbox / Switch

```tsx
it('toggles checkbox', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<MyCheckbox onCheckedChange={onChange} />)
  await user.click(screen.getByRole('checkbox'))
  expect(onChange).toHaveBeenCalledWith(true)
})
```

### Form (react-hook-form + shadcn)

```tsx
it('shows validation error when field is empty', async () => {
  const user = userEvent.setup()
  render(<MyForm />)
  await user.click(screen.getByRole('button', { name: /submit/i }))
  expect(await screen.findByText(/field is required/i)).toBeInTheDocument()
})

it('submits form with valid data', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<MyForm onSubmit={onSubmit} />)
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' }))
})
```

### Toast (sonner or shadcn toast)

```tsx
// Mock the toast import
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from 'sonner'

it('shows success toast on submit', async () => {
  const user = userEvent.setup()
  render(<MyForm />)
  // ... fill form ...
  await user.click(screen.getByRole('button', { name: /submit/i }))
  await waitFor(() => expect(toast.success).toHaveBeenCalled())
})
```

### Table (shadcn DataTable)

```tsx
it('renders all rows', () => {
  render(<DataTable data={mockData} columns={columns} />)
  expect(screen.getAllByRole('row')).toHaveLength(mockData.length + 1) // +1 for header
})

it('filters rows by search input', async () => {
  const user = userEvent.setup()
  render(<DataTable data={mockData} columns={columns} />)
  await user.type(screen.getByPlaceholderText(/search/i), 'Alice')
  expect(screen.getAllByRole('row')).toHaveLength(2) // header + 1 result
})
```

---

## Step 5 — Mocking Patterns

### Module mock (before imports)

```ts
vi.mock('@/lib/api', () => ({
  fetchUser: vi.fn(),
}))
```

### Router (React Router v6)

```tsx
import { MemoryRouter } from 'react-router-dom'

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>)
```

### Context provider

```tsx
const renderWithContext = (ui: React.ReactElement) =>
  render(<AuthProvider value={mockAuthValue}>{ui}</AuthProvider>)
```

### Async data fetching (MSW optional, vi.mock preferred for unit tests)

```ts
import { fetchUser } from '@/lib/api'
vi.mock('@/lib/api')

it('loads user data', async () => {
  vi.mocked(fetchUser).mockResolvedValueOnce({ id: '1', name: 'Alice' })
  render(<UserCard userId="1" />)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
})

it('shows error on fetch failure', async () => {
  vi.mocked(fetchUser).mockRejectedValueOnce(new Error('Network error'))
  render(<UserCard userId="1" />)
  expect(await screen.findByText(/error/i)).toBeInTheDocument()
})
```

---

## Step 6 — Coverage Gap Analysis

After generating the spec, perform a mental coverage pass:

1. List every `if`, ternary (`?`), and `&&` in the source
2. Confirm each has a test for the `true` branch and `false` branch
3. List every exported function / callback prop — confirm each is tested
4. List every `useEffect` — confirm side effects and cleanup are covered
5. If any gap exists, add the missing test case before finishing

To run coverage and see the gap report:

```bash
npm run test:coverage
# or
npx vitest run --coverage
```

The HTML report is at `coverage/index.html` — open it to see uncovered lines highlighted in red.

### Resolving threshold failures

If coverage falls below 95% after running:

```
ERROR: Coverage for lines (87.5%) does not meet global threshold (95%)
```

1. Open `coverage/index.html` and click the failing file
2. Red lines = uncovered; yellow = partially covered branch
3. Add a test case targeting each red/yellow line
4. Common gaps: error paths, empty state, disabled states, edge-case props

---

## Step 7 — Output Checklist

Before delivering the spec file, verify:

- [ ] File is named `*.spec.tsx` and placed next to the source
- [ ] Uses `userEvent.setup()` (not `userEvent` directly) for all interactions
- [ ] Uses `await` with all `userEvent` calls
- [ ] Uses `screen.findBy*` for async assertions (not `getBy*` + `waitFor`)
- [ ] No snapshot tests (brittle; avoid unless user asks)
- [ ] No `act()` wrappers manually — RTL handles this
- [ ] Mocks are cleared in `beforeEach(() => vi.clearAllMocks())`
- [ ] Every branch in the component has a corresponding test
- [ ] `vitest.config.ts` has all four thresholds set to 95

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `Unable to find role "dialog"` | Dialog may not be open yet — use `await user.click()` first |
| `Not wrapped in act(...)` | Switch to `await user.event()` and `findBy*` queries |
| `Cannot find module '@/...'` | Add `resolve.alias` in vitest.config.ts |
| `ReferenceError: document is not defined` | Set `environment: 'jsdom'` in vitest.config.ts |
| Coverage below 95% | See Step 6 above |
| `vi.mock` hoisting error | Move `vi.mock()` before all imports, or use `vi.doMock()` inside the test |
| Radix Select not responding | Radix uses pointer events — ensure `userEvent.setup()` is used |