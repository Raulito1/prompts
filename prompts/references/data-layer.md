# Data Layer Reference

JPA / Hibernate / Spring Data / PostgreSQL conventions and debugging.

## Entity design

- Use `Long` (boxed) for IDs, not `long`. `null` means "not yet persisted."
- Prefer `@GeneratedValue(strategy = GenerationType.IDENTITY)` with Postgres `bigserial` / `bigint generated always as identity`. Avoid `AUTO` — Hibernate will pick `SEQUENCE` and create a `hibernate_sequence` table you didn't ask for.
- Use `@Version` on anything that can be updated concurrently. Optimistic locking is cheaper than retry storms.
- Make entities non-final but constructors package-private with a protected no-arg for Hibernate. Expose factories.
- Do not put `@Data` (Lombok) on entities. `equals`/`hashCode` over all fields + lazy associations = `LazyInitializationException` or infinite loops. Use `@Getter` + explicit equals by ID (see below).

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof MyEntity that)) return false;
    return id != null && id.equals(that.id);
}
@Override public int hashCode() { return getClass().hashCode(); }
```

## Relationships

- **Default everything to `FetchType.LAZY`.** `@ManyToOne` and `@OneToOne` default to EAGER in JPA — override explicitly.
- **Avoid bidirectional relationships** unless you actually traverse both sides. They're a leading cause of Jackson loops and accidental cascade deletes.
- **Never `CascadeType.ALL` on `@ManyToMany`.** Delete a user, delete all their roles? No.
- Owning side = the side with the FK. Use `mappedBy` on the inverse.

## Repositories

- Prefer `@Query` with JPQL over derived method names once the name exceeds ~5 words. `findByCustomerIdAndStatusInAndCreatedAtAfterOrderByCreatedAtDesc` is unreadable.
- Use projections (interface-based or DTO constructor) for read endpoints. Don't fetch a 40-column entity to return 3 fields.
- For paging, always include a stable tiebreaker in the sort (`ORDER BY created_at DESC, id DESC`) — Postgres doesn't guarantee order without one, and pagination will skip/duplicate rows.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("""
        select new com.company.api.OrderSummary(o.id, o.status, o.total)
        from Order o
        where o.customerId = :customerId
          and o.status in :statuses
        """)
    List<OrderSummary> findSummariesByCustomer(Long customerId, Collection<OrderStatus> statuses);
}
```

## Transactions

- `@Transactional` on the **service** method, not controller and not repository.
- Reads that don't write should be `@Transactional(readOnly = true)` — Hibernate skips dirty checking, Postgres knows the tx is read-only.
- **Self-invocation bypasses the proxy.** `this.doOther()` inside a `@Transactional` method runs with the *caller's* transaction context. If you need REQUIRES_NEW, either split into two beans or inject `ApplicationContext` and fetch self (ugly but works).
- Checked exceptions do NOT trigger rollback by default. Add `rollbackFor = Exception.class` or throw a `RuntimeException`.

## Lazy loading / `LazyInitializationException`

Root cause: session closed (transaction ended) before the association was accessed. Fixes in order of preference:

1. **Fetch what you need upfront** with a JPQL `join fetch` or `@EntityGraph` on the repo method.
2. **Map to a DTO inside the transaction** (the service method) and return the DTO. The controller never touches the entity.
3. **Projections** — Spring Data can materialize an interface projection directly.

Do NOT use `open-in-view` (it's on by default in Spring Boot — explicitly disable with `spring.jpa.open-in-view=false`). It hides the bug and keeps DB connections open for the duration of the HTTP request.

## N+1 detection and prevention

**Detection** — turn on in a non-prod profile:
```yaml
spring.jpa.properties.hibernate.generate_statistics: true
logging.level.org.hibernate.stat: DEBUG
logging.level.org.hibernate.SQL: DEBUG
```

Look for `X collections fetched` where X equals the parent count, or a flood of `select ... where id=?` after the initial query.

**Prevention** — `@EntityGraph` on the repository method:
```java
@EntityGraph(attributePaths = {"lineItems", "customer"})
List<Order> findByStatus(OrderStatus status);
```

Or JPQL `join fetch`. For collections, beware the Cartesian product — use `distinct` or `Set` on the entity side, or split into two queries.

## Postgres-specific notes

- **`jsonb` columns** — use Hibernate 6's `@JdbcTypeCode(SqlTypes.JSON)` on a `Map<String, Object>` or a typed record. Do not write a custom `UserType`.
- **Arrays** — `@JdbcTypeCode(SqlTypes.ARRAY)` on `String[]` / `Long[]`. Or use a child table; array columns make indexing harder.
- **Enums** — store as `varchar` with `@Enumerated(EnumType.STRING)`. Never `ORDINAL` — adding an enum value shifts positions.
- **Timestamps** — use `Instant` mapped to `timestamp with time zone`. All regions store UTC; display conversion is the web layer's job.
- **`SELECT ... FOR UPDATE`** via `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the repo method when you genuinely need row locking (payment processing, idempotency keys). Keep transactions SHORT — holding pg locks across a Fargate task boundary causes cascading timeouts.

## Constraint violations

`org.postgresql.util.PSQLException: ERROR: duplicate key value violates unique constraint "xyz_idx"`

1. Grep the Liquibase changelogs for the constraint name — that tells you what it actually enforces.
2. Decide: is this a race (retry), a bug (fix), or legitimate (return 409)?
3. Catch `DataIntegrityViolationException` (Spring's translation) in the service — never let the raw `PSQLException` leak.

## Connection pool (HikariCP)

Defaults are fine until they aren't. Signs of trouble:
- `HikariPool-1 - Connection is not available, request timed out after 30000ms`
- `pool stats (total=20, active=20, idle=0, waiting=N)` in logs

Causes, in rough order of frequency:
1. A `@Transactional` method doing a long external HTTP call while holding a DB connection. Fix: do the HTTP call outside the transaction.
2. `open-in-view=true` holding connections for the full request duration. Fix: disable it.
3. Pool too small for the workload. Fargate task with 2 vCPU and `maximum-pool-size=10` might need 20 — but first confirm you don't have leak #1 or #2.
4. A leak — missing `try-with-resources` on a `Connection` obtained directly. Rare in pure JPA code.

Settings worth knowing:
```yaml
spring.datasource.hikari:
  maximum-pool-size: 20
  minimum-idle: 5
  connection-timeout: 10000      # fail fast; 30s is too long
  leak-detection-threshold: 60000
```