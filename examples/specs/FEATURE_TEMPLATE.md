# Feature Spec: [Feature Name]

> **Status**: Draft | In Review | Approved | In Progress | Shipped
> **Owner**: [Your name]
> **Last updated**: YYYY-MM-DD
> **Related domain docs**: [link to relevant DOMAIN_*.md files]

---

## 1. Summary

One or two sentences. What is this and why does it exist? If you can't write this clearly, you're not ready to build it.

---

## 2. Problem & Context

- **What problem does this solve?** (User pain, business need, bug, tech debt)
- **Who's affected?** (Roles, regions, candidates, etc.)
- **Why now?** (Optional but useful for prioritization)
- **Related work**: Links to tickets, prior specs, Slack threads

---

## 3. Goals & Non-Goals

### Goals
- Specific, testable outcomes
- What success looks like

### Non-Goals
- What this explicitly does NOT do
- Prevents scope creep and over-building

---

## 4. User Stories / Scenarios

Walk through 2-5 concrete scenarios. Use real examples with real role names from your system.

**Scenario 1: Happy path**
> [Specific user, specific role, specific actions, specific outcome]

**Scenario 2: Edge case**
> [What happens at the boundaries]

**Scenario 3: Error case**
> [What happens when something goes wrong]

---

## 5. Data Model

### Entities & Schema

For each new or modified entity:

```
EntityName {
  field_name: type
  ...
}
```

### Migrations
- New tables, new columns, indexes, constraints
- Backfill strategy if needed
- Rollback plan

### Validation Rules
- Field-level rules
- Cross-field invariants

> **Reference**: See `DOMAIN_*.md` for existing entity definitions. Don't redefine — extend.

---

## 6. API Contract

For each endpoint:

```
METHOD /api/v1/path
Auth: [who can call this]

Request: { ... }
Response 2xx: { ... }
Errors: 4xx codes and meanings
```

---

## 7. UI / UX

### Screens / Components affected
- New components vs. modified

### Behavior
- Click, hover, error, loading states
- The three forgotten states: empty, loading, error
- Keyboard / accessibility

### Mockups
- Link to Figma, attach screenshots, or sketch in ASCII

---

## 8. Technical Approach

### Backend
- Affected services / repositories / endpoints
- Transactional boundaries
- Caching considerations

### Frontend
- New components / hooks
- State management (React Query keys, etc.)
- API client updates

### Dependencies
- New libraries (justify each one)
- External services
- Internal services

### Performance
- Expected load
- Query patterns
- Pagination strategy

> **Reference conventions in `CLAUDE.md`. Don't redefine the stack here.**

---

## 9. Testing Strategy

- **Unit tests**: What logic needs unit coverage
- **Integration tests**: What flows need end-to-end coverage
- **Manual QA**: What requires human eyes
- **Edge cases**: Empty states, large datasets, concurrent edits, timezones, region-scoping

---

## 10. Rollout & Observability

- **Feature flag?** Yes/no, name of flag
- **Migration order**: backend → frontend, or both at once
- **Monitoring**: New metrics, logs, alerts
- **Rollback plan**: How do we undo this if it breaks production?

---

## 11. Open Questions

Things you don't know yet. Document rather than silently guess.

- [ ] Question 1
- [ ] Question 2

---

## 12. Out of Scope (revisit later)

Ideas that came up but aren't in this spec. Capture so they don't get lost.

- Idea 1
- Idea 2
