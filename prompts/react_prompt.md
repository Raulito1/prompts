# Project Context — React 19 + Vite + Node Express BFF

## Stack
### Client
- Language: TypeScript (strict mode)
- Framework: React 19
- Build tool: Vite
- State management: RTK Query (Redux Toolkit)
- Routing: React Router
- UI Components: shadcn/ui (base) + UIX layer (custom primitives) — see UIX section below
- Styling: Tailwind CSS
- Testing: Vitest + React Testing Library
- Package manager: npm

### Server (BFF)
- Runtime: Node.js
- Framework: Express
- Role: Handles Human-to-App auth and acts as a proxy to the Python FastAPI microservice
- Package manager: npm

## Monorepo Structure
```
client/
  assets/          # Static files
  components/
    ai/            # AI-specific components
    charts/        # Chart components
    layout/        # App layout components
    profile/       # Profile-related components
    reports/       # Report components
    ui/            # shadcn/ui generated files — NEVER modify directly
    uix/           # UIX layer — ALWAYS check here before building anything new
      stack.tsx          # Vertical layout with consistent spacing
      inline.tsx         # Horizontal layout with consistent spacing
      page-shell.tsx     # Standard page wrapper (title, description, actions)
      async-boundary.tsx # Handles loading + error states for async data
      empty-state.tsx    # Standard empty state display
      inline-error.tsx   # Inline error display
      error-boundary.tsx # React error boundary
      protected-route.tsx # Auth-protected route wrapper
      index.ts           # Barrel export — always import from @/components/uix
    error-boundary.tsx
    protected-route.tsx
  hooks/           # Custom React hooks
  lib/             # Shared utilities, helpers, shadcn/ui config
  pages/           # Route-level components, compose from components
  routes/          # React Router route definitions
  store/           # RTK Query services and Redux slices
  App.tsx
  main.tsx
  index.css        # Tailwind base styles
  index.html
  vite.config.ts
  tsconfig.app.json
  .env.local
  .env.production

server/
  middleware/      # Express middleware (auth, logging, error handling)
  routes/          # Express route definitions
  services/        # Business logic, proxy calls to Python FastAPI
  utils/           # Shared utilities
  dist/            # Build output — never edit directly
  index.ts         # Express app entry point
  .env
  .env.dev
  .env.local
  .env.prod
  .env.test
  .env.example
  tsconfig.json
  README.md
```

## Architecture — Read This Before Touching Anything
```
Browser
  → React 19 Client (RTK Query manages all server state)
  → Node Express BFF (server/)
      handles Human-to-App authentication
      proxies requests to Python FastAPI microservice
      never contains business logic — that lives in FastAPI
  → Python FastAPI microservice
      all data, RBAC, and business logic lives here
```

## UIX Layer — MANDATORY, Read Before Writing Any UI
The UIX layer (`components/uix/`) is a set of reusable primitives built on top of shadcn/ui.
It exists to enforce consistency and eliminate duplication across the app.

### BEFORE writing any layout, loading state, error state, empty state, or page wrapper — check UIX first.

### Available UIX Primitives
```
<Stack spacing={4}>
  Import: import { Stack } from '@/components/uix'
  Use for: ALL vertical layouts with consistent spacing
  Props: spacing (0-16), align (start|center|end|stretch), as (div|section|article|main|aside), className

<Inline spacing={2} justify="between" align="center">
  Import: import { Inline } from '@/components/uix'
  Use for: ALL horizontal layouts with consistent spacing
  Props: spacing (0-16), align, justify, wrap (boolean), as (div|section|nav|header|footer), className

<PageShell title="Dashboard" description="..." actions={<Button>}>
  Import: import { PageShell } from '@/components/uix'
  Use for: EVERY page-level component wrapper — title, description, and action slots built in

<AsyncBoundary>
  Import: import { AsyncBoundary } from '@/components/uix'
  Use for: ALL async data loading — handles loading skeleton + error state automatically
  Never manually recreate loading/error state patterns when AsyncBoundary exists

<EmptyState>
  Import: import { EmptyState } from '@/components/uix'
  Use for: ALL empty state displays — no custom empty state components

<InlineError>
  Import: import { InlineError } from '@/components/uix'
  Use for: ALL inline error displays — no custom inline error components

<ErrorBoundary>
  Import: import { ErrorBoundary } from '@/components/uix'
  Use for: Wrapping feature areas that need isolated error handling

<ProtectedRoute>
  Import: import { ProtectedRoute } from '@/components/uix'
  Use for: ALL auth-protected routes — never roll your own auth guard
```

### UIX Anti-Patterns — Never Do These
- NEVER use raw `div className="flex flex-col gap-4"` for layout — use `<Stack spacing={4}>`
- NEVER use raw `div className="flex items-center gap-2"` for layout — use `<Inline spacing={2}>`
- NEVER manually recreate loading states with `isLoading && <Skeleton />` — use `<AsyncBoundary>`
- NEVER create a custom empty state component — use `<EmptyState>`
- NEVER create a custom inline error component — use `<InlineError>`
- NEVER wrap a page without `<PageShell>` — it provides the standard title/description/actions layout
- NEVER mix UIX components with raw Tailwind flex/grid patterns for the same layout concern
- NEVER modify files inside `components/uix/` directly — if the primitive needs extending, ask first

### UIX Rules for New Features
- Every new page MUST use `<PageShell>` as the outermost wrapper
- Every async data boundary MUST use `<AsyncBoundary>` — not manual isLoading checks
- Every list/grid that can be empty MUST use `<EmptyState>` for the empty case
- All layout spacing MUST use `<Stack>` or `<Inline>` — not raw Tailwind flex classes
- If a UIX primitive doesn't support a needed prop, ask before modifying it or working around it

## Client Patterns — MANDATORY
- Functional components only. No class components.
- Never fetch data directly in a component. All API calls go through RTK Query services in store/.
- RTK Query is the single source of truth for all server state. Do not use useEffect for data fetching.
- Custom hooks in hooks/ abstract complex logic out of components. If a component exceeds ~150 lines, extract logic to a hook.
- Pages in pages/ compose from components in components/. No business logic in pages.
- Route definitions live in routes/ only. Do not define routes inline in App.tsx or pages.
- shadcn/ui components are the base for all UI. Always check components/uix/ then components/ before creating anything new.
- Never install a new UI component library. If shadcn/ui or UIX does not have it, build it from existing primitives.
- Tailwind utility classes only for non-layout concerns (colour, typography, borders). Use UIX for all layout and spacing.
- lib/ contains shadcn/ui config and shared utilities. Do not put API logic or hooks here.

## Server (BFF) Patterns — MANDATORY
- The BFF handles auth and proxying only. No business logic lives here.
- All auth (Human-to-App) is handled in server/middleware/. Never handle auth in routes or services.
- Routes in server/routes/ call services in server/services/. No logic in route handlers.
- Services in server/services/ handle proxying to the Python FastAPI microservice.
- Never call the Python FastAPI microservice directly from the client — always go through the BFF.
- Never duplicate business logic from FastAPI in the BFF. If logic is needed, it belongs in FastAPI.
- Environment-specific config comes from the appropriate .env file — never hardcode URLs, secrets, or API endpoints.

## RTK Query Rules
- All API service definitions live in store/.
- Each domain has its own RTK Query service file (e.g. usersApi.ts, ordersApi.ts).
- Never mix RTK Query cache management with local useState for the same piece of server state.
- Use RTK Query tags for cache invalidation — never manually refetch unless there is no alternative.
- Optimistic updates must be discussed and confirmed before implementation — they are complex and easy to get wrong.

## TypeScript Rules
- Strict mode is on. No implicit any, no ts-ignore without a comment explaining why.
- Never use any. Use unknown and narrow it, or define a proper type.
- All API response types must be defined before writing the RTK Query service.
- Use interface for object shapes, type for unions and intersections.
- Types shared between client and server should be discussed — confirm approach before creating shared type packages.

## shadcn/ui Rules
- Always use shadcn/ui components as the base for interactive elements (Button, Input, Dialog, Form etc).
- Do not modify files in components/ui/ (shadcn/ui generated files) — extend them via wrapper components instead.
- New shadcn/ui components are added via the CLI: npx shadcn@latest add <component>. Never copy-paste shadcn code manually.
- If a shadcn/ui component needs customisation, create a wrapper component in the appropriate components/ subfolder.

## Environment Config
- Client: .env.local for local, .env.production for production. Vite exposes vars prefixed with VITE_.
- Server: .env.local, .env.dev, .env.prod, .env.test. Never commit .env or .env.prod.
- Never hardcode environment-specific values (URLs, ports, API keys) anywhere in code.
- Never commit .env, .env.prod, or any file containing real secrets.

## Naming Conventions
- Components: PascalCase (UserCard.tsx)
- Hooks: camelCase with use prefix (useUserData.ts)
- RTK Query services: camelCase with Api suffix (usersApi.ts)
- Pages: PascalCase with Page suffix (UserListPage.tsx)
- Routes: camelCase descriptive (userRoutes.tsx)
- Types/Interfaces: PascalCase (UserResponse, CreateUserPayload)
- Test files: co-located with component (UserCard.test.tsx)
- Server services: camelCase with Service suffix (userProxyService.ts)

## Guardrails
- NEVER recreate a pattern that exists in components/uix/ — always use the UIX primitive.
- NEVER use raw Tailwind flex/grid classes for layout — use Stack or Inline.
- NEVER manually handle loading/error state — use AsyncBoundary.
- NEVER create a custom empty state or inline error — use EmptyState and InlineError.
- NEVER fetch data directly in a component — always RTK Query.
- NEVER put business logic in the BFF — it belongs in FastAPI.
- NEVER call FastAPI directly from the client — always proxy through the BFF.
- NEVER modify components/ui/ shadcn files directly — wrap them instead.
- NEVER modify components/uix/ files without asking first — these are shared primitives.
- NEVER install a new UI library without asking — state why shadcn/ui and UIX cannot solve it.
- NEVER install any new npm package without asking — state the package, size, and reason.
- NEVER modify vite.config.ts or tsconfig.app.json without asking.
- NEVER modify server/index.ts without asking.
- NEVER change existing RTK Query endpoint names — this is a breaking change, flag it instead.
- NEVER commit .env, .env.prod, or any file with real credentials or secrets.
- NEVER define routes outside of routes/ — not in App.tsx, not in pages.

## Testing Rules
- Test behaviour not implementation. Never test internal state or implementation details.
- Every new component needs at minimum: renders without crashing, key user interactions, loading state via AsyncBoundary, error state via AsyncBoundary.
- RTK Query endpoints are mocked using msw or RTK Query built-in mocking — never mock fetch directly.
- Use screen queries in priority order: getByRole → getByLabelText → getByText → getByTestId.
- Test files are co-located with their component or hook.
- Server routes are tested with supertest against the Express app.
- Never use snapshot tests — they break too easily and test nothing meaningful.

## Debugging
### Triage Order
```
1. Client — Network tab
   Is the request leaving the browser correctly?
   Is it hitting the BFF or accidentally calling FastAPI directly?

2. BFF — server/middleware/
   Is auth middleware passing or blocking the request?
   Is the correct user identity being forwarded to FastAPI?

3. BFF — server/services/
   Is the proxy call to FastAPI constructed correctly?
   Is the correct endpoint, method, and payload being sent?

4. RTK Query — store/
   Is the cache returning stale data instead of fetching fresh?
   Are cache tags set up correctly for invalidation?

5. UIX / Component layer
   Is the correct UIX primitive being used?
   Is AsyncBoundary wrapping the async data correctly?
   Is the component reading from the correct RTK Query hook?
   Is loading/error state being handled by AsyncBoundary or manually (it should be AsyncBoundary)?
```

### What NOT to Do When Debugging
- Do not add console.log to production code and leave it in — use debug-level logging.
- Do not bypass the BFF to call FastAPI directly as a debugging shortcut.
- Do not disable TypeScript strict checks to make an error go away.
- Do not clear the RTK Query cache globally to fix a stale data issue — fix the cache tags instead.
- Do not modify shadcn/ui base files or UIX primitives as a debugging shortcut.
- Do not replace a UIX component with raw HTML/Tailwind to work around a layout issue — fix the UIX usage instead.

## Git
- Branch: feat/<TICKET-ID>-<short-description> or fix/<TICKET-ID>-<short-description>
- Commit: "<TICKET-ID>: <imperative verb> <what changed>"
- Commits should be scoped: "<TICKET-ID>: [client] add user list component" or "<TICKET-ID>: [server] add user proxy route"
- Never commit .env, .env.prod, or any secrets.
- Never commit dist/ output.