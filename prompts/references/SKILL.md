---
name: springboot-multi-region
description: Use this skill for any work on multi-module Spring Boot applications on Java 21 using Maven, Spring MVC, Spring Data JPA, PostgreSQL, and Liquibase, deployed to AWS ECS Fargate across multiple regions (EU, AP, US) via Harness CI/CD. Trigger whenever the user mentions Spring Boot, Spring MVC, JPA, Hibernate, JpaRepository, Liquibase changelogs/changesets, ECS Fargate, task definitions, Harness pipelines, multi-region deploys, region-specific configuration, or is debugging issues like LazyInitializationException, N+1 queries, transactional proxy problems, connection pool exhaustion, failed Liquibase migrations, ECS task failures, or region drift. Also trigger for adding a new module, wiring cross-module dependencies, designing repository/service/controller layers, writing integration tests with Testcontainers, or any question about where code should live in the module hierarchy.
---

# Spring Boot Multi-Region Skill

A skill for working on a multi-module Java 21 / Spring Boot / Spring MVC / Spring Data JPA application backed by PostgreSQL, versioned with Liquibase, built with Maven, deployed to AWS ECS Fargate across EU / AP / US regions through Harness CI/CD.

## How to use this skill

1. **Classify the request.** Most requests fall into one of these buckets — figure out which before doing anything else:
   - *Structural* — new module, new entity, new endpoint, where-does-this-go questions
   - *Data layer* — JPA mapping, repository query, Liquibase changeset, migration ordering
   - *Runtime bug* — exception, slow query, memory pressure, transactional weirdness
   - *Infra / deploy* — ECS task failing, region-specific behavior, Harness pipeline, config drift
   - *Testing* — slice tests, Testcontainers, mocking strategy

2. **Pull the relevant reference file(s)** from `references/` before writing code. Each bucket has a dedicated file. Do not answer from memory for the data, infra, or testing buckets — the references encode project conventions that matter.

3. **Respect the module boundaries** (see `references/architecture.md`). Violating these is the single most common source of pain in this codebase.

4. **When debugging**, always ask/confirm which region the problem reproduces in. "Works in US, fails in EU" is a completely different problem from "fails everywhere."

## Reference files

| File | When to read |
|---|---|
| `references/architecture.md` | Structural questions, new modules, where code should live, POM/dependency issues |
| `references/data-layer.md` | JPA entities, repositories, queries, transactions, N+1, lazy loading, Postgres specifics |
| `references/liquibase.md` | Any changelog/changeset work, migration ordering, rollbacks, multi-region migration timing |
| `references/debugging.md` | Runtime exceptions, performance issues, thread dumps, connection pool problems |
| `references/ecs-fargate.md` | Task definition changes, container health, region-specific config, secrets, networking |
| `references/harness-cicd.md` | Pipeline changes, promotion between regions, build failures, deployment rollback |
| `references/testing.md` | Test slices, Testcontainers setup, mocking JPA vs real DB |

## Golden rules (apply always)

1. **JPA entities never leave the persistence module.** Map to DTOs/records at the service boundary. This is the #1 source of serialization loops, `LazyInitializationException` at the controller, and accidental API breakage from schema changes.

2. **`@Transactional` goes on the service layer, not the controller and not the repository.** Self-invocation (calling `this.otherMethod()` inside the same bean) bypasses the proxy and silently loses the transaction — if you need a nested transaction, split into two beans or inject self.

3. **Every schema change is a Liquibase changeset.** Never `ddl-auto=update` in any environment, including local. Set `spring.jpa.hibernate.ddl-auto=validate` and let Liquibase own the schema.

4. **Region-specific config lives in Spring profiles + SSM Parameter Store / Secrets Manager, not in code.** No `if (region.equals("eu"))` branches in business logic. If regional behavior genuinely differs, inject a strategy bean selected by profile.

5. **Every PR that touches the data layer needs a `@DataJpaTest` with Testcontainers Postgres.** H2 does not behave like Postgres (different SQL dialect, no `jsonb`, different locking semantics) — do not use it.

6. **Java 21 virtual threads are enabled** (`spring.threads.virtual.enabled=true`). Do not use `synchronized` on hot paths — it pins virtual threads to the carrier. Use `ReentrantLock` instead.

## Quick diagnostic decision tree

Use this to route fast before loading a reference file:

- `LazyInitializationException` → `references/data-layer.md` § Lazy loading
- `could not execute statement` + constraint name → `references/data-layer.md` § Constraint violations, then `references/liquibase.md` to check migration state
- N+1 suspected (list endpoint slow, lots of `select ... where id=?` in logs) → `references/data-layer.md` § N+1
- `HikariPool ... Connection is not available` → `references/debugging.md` § Connection pool
- Task flapping on ECS, healthy locally → `references/ecs-fargate.md` § Health checks
- Liquibase lock stuck (`DATABASECHANGELOGLOCK`) → `references/liquibase.md` § Stuck lock
- Works in us-east-1 but not eu-west-1 → `references/ecs-fargate.md` § Region drift, then `references/harness-cicd.md` § Promotion
- Harness pipeline green but service unhealthy → `references/harness-cicd.md` § Post-deploy verification
- Bean not found across modules → `references/architecture.md` § Component scanning

## Useful commands

```bash
# Run a single module's tests
mvn -pl persistence -am test

# Run the app against a regional profile locally (reads from local SSM mock or .env)
mvn -pl app spring-boot:run -Dspring-boot.run.profiles=local,eu

# Generate a Liquibase diff against a Testcontainer (useful before writing a changeset)
mvn -pl persistence liquibase:diff -Dliquibase.diffChangeLogFile=pending-changes.xml

# Remote debug a running Fargate task (after enabling ECS exec on the service)
aws ecs execute-command --cluster <cluster> --task <task-id> --container app --interactive --command "/bin/sh"

# Show the effective Spring config for a running region
curl http://localhost:8080/actuator/configprops | jq '.contexts.application.beans | to_entries | map(select(.key | test("datasource|jpa|liquibase")))'
```

## When in doubt

- Reproduce locally with Testcontainers before theorizing about region-specific causes
- Check `DATABASECHANGELOG` in the affected region's DB before blaming code
- Compare the ECS task definition revision across regions (`aws ecs describe-task-definition`) — config drift is very common
- Read the Harness pipeline execution logs, not just the green/red status — promotions can "succeed" while skipping a stage