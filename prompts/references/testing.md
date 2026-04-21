# Testing Reference

Test strategy for a multi-module Spring Boot app with real Postgres behavior.

## Rule of thumb — pick the smallest slice

| Need | Use |
|---|---|
| Pure business logic, no Spring | Plain JUnit + Mockito |
| Repository queries, JPA mappings, Liquibase | `@DataJpaTest` + Testcontainers Postgres |
| Controller routing, validation, JSON, filters | `@WebMvcTest` + MockMvc |
| Full wiring, cross-layer flow | `@SpringBootTest` + Testcontainers (sparingly) |

Every full `@SpringBootTest` you add costs ~5–15 seconds of CI time. Use slices aggressively.

## Testcontainers base setup

Put this in a shared test module or under `src/test/java` in the `persistence` module, and extend from it.

```java
@Testcontainers
public abstract class PostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withReuse(true);   // requires ~/.testcontainers.properties with testcontainers.reuse.enable=true

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        r.add("spring.liquibase.enabled", () -> "true");
    }
}
```

`withReuse(true)` is a massive speedup for local — same container reused across runs. CI typically has fresh containers each run.

## `@DataJpaTest` pattern

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)   // don't swap in H2
@Import(JpaConfig.class)                              // if you have custom JPA config
class OrderRepositoryTest extends PostgresIntegrationTest {

    @Autowired OrderRepository orders;
    @Autowired TestEntityManager em;

    @Test
    void findsByCustomerWithEntityGraph() {
        var order = em.persist(new Order(/* ... */));
        em.flush(); em.clear();

        var found = orders.findSummariesByCustomer(order.getCustomerId(), Set.of(OrderStatus.OPEN));
        assertThat(found).hasSize(1);
    }
}
```

Important: `@DataJpaTest` runs each test in a rolled-back transaction by default, which hides bugs where your code relies on explicit transaction commit (e.g., `@Modifying` queries with deferred effects). For those, annotate the test with `@Transactional(propagation = NOT_SUPPORTED)` or use `@Rollback(false)` and clean up manually.

## `@WebMvcTest` pattern

```java
@WebMvcTest(OrderController.class)
@Import(WebSecurityConfig.class)   // if you have security
class OrderControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean OrderService service;   // Spring Boot 3.4+, older: @MockBean

    @Test
    void returns404WhenNotFound() throws Exception {
        when(service.findById(99L)).thenThrow(new OrderNotFoundException(99L));

        mvc.perform(get("/orders/99"))
           .andExpect(status().isNotFound())
           .andExpect(jsonPath("$.error").value("ORDER_NOT_FOUND"));
    }
}
```

- Don't reach for `@SpringBootTest` to test a controller.
- Mock the service. If the service is complex to mock, that's a signal the service is doing too much.
- Include your `@RestControllerAdvice` / exception handler via `@Import` so error mapping is exercised.

## Full `@SpringBootTest` — only when you must

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureMockMvc
class OrderFlowIntegrationTest extends PostgresIntegrationTest {
    // Full context, real repos, real services, real web layer. Slow.
}
```

Use cases:
- End-to-end test of a critical flow (order placement → payment → inventory).
- Verifying Spring Security wiring across layers.
- Testing transaction boundaries across multiple services.

Target: fewer than 10 of these for the whole codebase.

## Shared container across a test run (big speedup)

Testcontainers supports sharing containers across test classes when they use the same configuration. With the abstract base class pattern above and `withReuse(true)`, a single Postgres container serves all tests in the JVM.

For CI (no reuse across runs), consider:
- Running integration tests in one Maven invocation (`mvn verify`), not separate per-module runs, to share the JVM.
- Or use Testcontainers' `@Testcontainers(disabledWithoutDocker = true)` and run integration tests only on CI agents with Docker.

## Don't use H2

H2 lies about Postgres behavior:
- No `jsonb`, no array types, no `ON CONFLICT` syntax.
- Different locking semantics — deadlocks on Postgres pass on H2.
- Different SQL dialect quirks — `CURRENT_DATE` differs, sequence behavior differs.

Every time H2 is introduced as "a faster test DB," someone loses a day debugging a prod bug that passed CI. Testcontainers + `withReuse` closes the speed gap enough.

## Testing multi-region behavior

If regional differences exist in code (ideally they don't), test them with profile-activated tests:

```java
@SpringBootTest
@ActiveProfiles({"test", "eu"})
class EuComplianceTest extends PostgresIntegrationTest {
    // Verifies EU-specific behavior (e.g., data retention rules)
}
```

Run the same test class with different profile activations if the difference is a toggle. But reread `architecture.md` first — profile-dependent behavior should be rare.

## Testing Liquibase changesets

A `@DataJpaTest` with `spring.liquibase.enabled=true` (default) already runs all changelogs against the Testcontainer. If that passes, changesets apply cleanly in isolation.

For **rollback testing** (important for risky changesets):
```bash
mvn -pl persistence liquibase:rollback -Dliquibase.rollbackCount=1
```
Run this against a Testcontainer in CI before merging changesets that claim to be reversible.

## Flaky tests — the usual suspects

1. **Time-dependent** — test uses `Instant.now()` and compares with equals. Use a `Clock` bean, inject `Clock.fixed(...)` in tests.
2. **Order-dependent** — test A creates a row test B relies on. Never do this. Each test seeds its own data.
3. **Auto-increment ID assumptions** — test asserts `id == 1`. IDs are not deterministic across Testcontainer runs (especially with `withReuse`). Assert on business fields.
4. **Async** — a `@Scheduled` or `@Async` method fires during a test. Disable scheduling in tests (`@TestConfiguration` without `@EnableScheduling`), or use Awaitility.
5. **Shared mutable state** — a static field leaks between tests. Grep for `static` in test utilities.