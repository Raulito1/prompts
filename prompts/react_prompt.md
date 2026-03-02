# Project Context — React 19 + Vite + Node Express BFF

## Stack
### Client
- Language: TypeScript (strict mode)
- Framework: React 19
- Build tool: Vite
- State management: RTK Query (Redux Toolkit)
- Routing: React Router
- UI Components: shadcn/ui (base component library — do not replace or install alternatives)
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
  components/      # Reusable UI components, built on shadcn/ui base
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

## Client Patterns — MANDATORY
- Functional components only. No class components.
- Never fetch data directly in a component. All API calls go through RTK Query services in store/.
- RTK Query is the single source of truth for all server state. Do not use useEffect for data fetching.
- Custom hooks in hooks/ abstract complex logic out of components. If a component exceeds ~150 lines, extract logic to a hook.
- Pages in pages/ compose from components in components/. No business logic in pages.
- Route definitions live in routes/ only. Do not define routes inline in App.tsx or pages.
- shadcn/ui components are the base for all UI. Always check components/ for an existing component before creating a new one.
- Never install a new UI component library. If shadcn/ui does not have it, build it from shadcn/ui primitives.
- Tailwind utility classes only. No inline styles. No CSS-in-JS. No new CSS files unless absolutely necessary.
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
- Always use shadcn/ui components as the base. Never build a button, input, dialog, or form from scratch.
- Do not modify files in components/ui/ (shadcn/ui generated files) — extend them via wrapper components instead.
- New shadcn/ui components are added via the CLI: npx shadcn@latest add <component>. Never copy-paste shadcn code manually.
- If a shadcn/ui component needs customisation, create a wrapper component in components/ that composes from the base.

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
- NEVER fetch data directly in a component — always RTK Query.
- NEVER put business logic in the BFF — it belongs in FastAPI.
- NEVER call FastAPI directly from the client — always proxy through the BFF.
- NEVER modify components/ui/ shadcn files directly — wrap them instead.
- NEVER install a new UI library without asking — state why shadcn/ui cannot solve it.
- NEVER install any new npm package without asking — state the package, size, and reason.
- NEVER modify vite.config.ts or tsconfig.app.json without asking.
- NEVER modify server/index.ts without asking.
- NEVER change existing RTK Query endpoint names — this is a breaking change, flag it instead.
- NEVER commit .env, .env.prod, or any file with real credentials or secrets.
- NEVER define routes outside of routes/ — not in App.tsx, not in pages.

## Testing Rules
- Test behaviour not implementation. Never test internal state or implementation details.
- Every new component needs at minimum: renders without crashing, key user interactions, loading state, error state.
- RTK Query endpoints are mocked using msw or RTK Query's built-in mocking — never mock fetch directly.
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

5. Component / Page
   Is the component reading from the correct RTK Query hook?
   Is loading/error state being handled correctly?
```

### What NOT to Do When Debugging
- Do not add console.log to production code and leave it in — use debug-level logging.
- Do not bypass the BFF to call FastAPI directly as a debugging shortcut.
- Do not disable TypeScript strict checks to make an error go away.
- Do not clear the RTK Query cache globally to fix a stale data issue — fix the cache tags instead.
- Do not modify shadcn/ui base files as a debugging shortcut.

## Git
- Branch: feat/<TICKET-ID>-<short-description> or fix/<TICKET-ID>-<short-description>
- Commit: "<TICKET-ID>: <imperative verb> <what changed>"
- Commits should be scoped where possible: "<TICKET-ID>: [client] add user list component" or "<TICKET-ID>: [server] add user proxy route"
- Never commit .env, .env.prod, or any secrets.
- Never commit dist/ output.
