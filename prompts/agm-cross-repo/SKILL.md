---
name: agm-cross-repo
description: Use when implementing or debugging an AGM feature that spans agm-api (FastAPI/Snowflake) and agm-webapp (React + Express BFF), including modifying SQL templates, updating YAML data sources, adding RTK Query types, or tracing bugs across the BFF boundary.
---
 
# AGM Cross-Repo Workflow
 
Two repos:
- **agm-api**: FastAPI + Snowflake. Endpoints driven by Jinja2 SQL templates + YAML registry.
- **agm-webapp**: React 19 SPA + Express BFF. BFF at `:3001` proxies `/api/v1/*` to API at `:8000`.
## Modifying what an existing endpoint returns (most common)
 
agm-api is config-driven — most changes don't require Python edits.
 
1. **agm-api**: Edit the Jinja2 SQL template in `app/sql/<domain>/`.
2. **agm-api**: Update matching YAML in `app/core/data_sources/configs/` (`agm/`, `ai4tech/`, or `_shared.yaml`). `data_source_registry.py` wires SQL + YAML together.
3. **agm-api**: If response shape changes, update Pydantic schema in `app/schemas/`.
4. **agm-api**: Run `make run` (port 8080), test with curl. Set `LOG_SQL_TO_TERMINAL=true` to see executed SQL.
5. **agm-webapp**: Update TS types in `client/store/types/index.ts` to match new shape (especially `SearchDataSource` if using unified API).
6. **agm-webapp**: If using legacy RTK Query service, update there. If `searchDataApi`, types may be the only change.
7. **agm-webapp**: Run `npm run dev`, verify in UI.
8. Commit agm-api first (UI depends on it), then agm-webapp.
## Adding a new endpoint (less common)
 
1. **agm-api**: New SQL template in `app/sql/<domain>/`.
2. **agm-api**: New YAML entry in appropriate `configs/` file.
3. **agm-api**: New Pydantic schemas in `app/schemas/`.
4. **agm-api**: New service method in `app/services/` if business logic / RBAC needed.
5. **agm-api**: New repo method in `app/repos/` if not auto-generated.
6. **agm-api**: New router or extension in `app/routers/`.
7. Check rate limiting (`slowapi`) — see existing decorators.
8. **agm-webapp**: Prefer adding to unified `searchDataApi` over a new RTK Query service. Add new `SearchDataSource` entry in types.
9. **agm-webapp**: BFF usually no change — `routes/api-proxy.ts` forwards `/api/v1/*` generically.
## Debugging across the boundary
 
Bug in UI — work outward:
 
1. **Browser devtools**: capture failing request — URL, method, payload, response, status.
2. **Response shape wrong?** Bug in agm-api. Check YAML column declarations (likely culprit), then SQL template.
3. **Response shape right but values wrong?** SQL template logic bug. Run query directly in Snowflake to inspect. Check RBAC WHERE clauses in `app/services/rbac_service.py` — field mappings vary by query context (profile vs. previous_sprints vs. current_sprint).
4. **4xx response?**
   - 401 → auth: BFF `middleware/auth.ts` or JWT validation in agm-api `JWTAuthMiddleware`.
   - 403 → RBAC: check user role and `viewId` mapping.
   - 404 → endpoint registration: YAML entry exists? `data_source_registry.py` picking it up?
   - 422 → Pydantic validation: schema mismatch between request payload and `app/schemas/`.
5. **5xx response?**
   - Snowflake error → check SQL template, warehouse status (paused warehouse = cold start hang), connection pool in `app/clients/snowflake_pool.py`.
   - Set `LOG_SQL_TO_TERMINAL=true` in agm-api `.env` to see the actual query.
6. **Request never reached agm-api?** BFF proxy issue — check `server/routes/api-proxy.ts`, `PYTHON_API_URL` env var, BFF logs.
7. **camelCase vs snake_case confusion?** `CamelCaseMiddleware` in agm-api converts both directions. Don't manually convert in service/repo code. If shape mismatch, check this middleware fired.
## Common failure modes
 
- **YAML/SQL drift**: SQL returns column not declared in YAML (silently dropped), or YAML declares column not in SELECT (null/error). Always update both.
- **Type drift**: agm-api response shape changes, webapp `client/store/types/index.ts` not updated. UI silently breaks or shows wrong data.
- **RBAC field mappings**: Query context-specific mappings in `rbac_service.py` are easy to miss when adding a new query type.
- **Snowflake warehouse paused**: First request after idle hangs/times out. Resume warehouse before testing.
- **Auth token expiry**: BFF `base-query.ts` auto-reauths on 401 — if loop happens, check OAuth refresh logic in BFF auth middleware.
- **Production-only auth issues**: `LOCAL_AUTH=true` skips pool warmup locally; production hits real C2C OAuth via IDA.
## Running both locally
 
Terminal 1 (agm-api):
 
```
cd agm-api
make run                  # uvicorn on :8080
```
 
Terminal 2 (agm-webapp):
 
```
cd agm-webapp
npm run dev               # Vite :5173, BFF :3001
```
 
Browser → `http://localhost:5173`. Webapp BFF proxies to agm-api at `PYTHON_API_URL`. Note: BFF expects API at `:8000` by default; agm-api `make run` uses `:8080`. **Set `PYTHON_API_URL=http://localhost:8080` in webapp `.env` for local dev**, or override agm-api port.
 
Make sure Snowflake warehouse is resumed before testing API calls.
 
## Useful debugging commands
 
```
# Hit local API directly (bypass BFF)
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/<endpoint>
 
# Hit through BFF (full stack)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/<endpoint>
 
# Run single agm-api test
poetry run pytest tests/test_<file>.py::<TestClass>::<test_method> -v
 
# See SQL agm-api executed
LOG_SQL_TO_TERMINAL=true make run
```
 
## Branch/PR coordination
 
Both repos: `feature/*` → `develop` → `release/dev` → `release/test` → `master`. PRs target `develop`. For cross-repo features, mention the paired PR in each description so reviewers can check compatibility.
 