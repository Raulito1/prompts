# Debugging Reference

Runtime diagnostics for the app in dev, staging, and production (ECS Fargate).

## First-pass checklist for any runtime bug

1. **What region(s)?** US-only, EU-only, all? Region-specific bugs are almost always config drift or data drift.
2. **What task definition revision?** `aws ecs describe-services --services <svc> --cluster <cluster> --region <r>`. Compare to other regions.
3. **When did it start?** Correlate with Harness deploys. Was there a Liquibase migration near that time?
4. **Can you reproduce locally with Testcontainers?** If yes, you're 80% done. If no, it's environment/data.
5. **What do the actuator endpoints say?** `/actuator/health`, `/actuator/info`, `/actuator/env` (protected), `/actuator/metrics`.

## Enabling remote debugging on a Fargate task

Requires ECS Exec enabled on the service (`enableExecuteCommand: true` in task definition).

```bash
aws ecs execute-command \
  --cluster prod-eu \
  --task <task-arn> \
  --container app \
  --interactive \
  --command "/bin/sh"
```

Inside the container:
```sh
# Heap dump
jcmd 1 GC.heap_dump /tmp/heap.hprof

# Thread dump
jcmd 1 Thread.print > /tmp/threads.txt

# Flight recorder (1 minute capture)
jcmd 1 JFR.start duration=60s filename=/tmp/profile.jfr
```

Then `aws s3 cp` them out via the task role (make sure the role has write to a diagnostics bucket). Do NOT try to scp — Fargate won't let you.

## Reading a thread dump

- **Virtual threads appear as `VirtualThread[#N]`** in Java 21. They park, they don't block carrier threads — unless pinned.
- **Pinning** — look for `VirtualThread ... carrier` with a carrier thread holding a monitor. Means a `synchronized` block is holding a virtual thread hostage. Replace with `ReentrantLock`.
- **BLOCKED on a Hikari monitor** — connection pool exhaustion. See `data-layer.md` § Connection pool.
- **Lots of threads in `java.net.Socket.read`** on the same external host — that service is slow or down, and your timeouts are too long.

## Connection pool

Fast diagnostic — hit actuator:
```
GET /actuator/metrics/hikaricp.connections.active
GET /actuator/metrics/hikaricp.connections.pending
GET /actuator/metrics/hikaricp.connections.usage
```

If `pending` > 0 sustained, pool is undersized OR connections are being held too long. Check the 99th percentile of `hikaricp.connections.usage` — if it's near or above your statement timeout, you have a slow query or a transaction holding across I/O.

## Slow endpoint

1. Enable SQL logging in staging:
   ```yaml
   logging.level.org.hibernate.SQL: DEBUG
   logging.level.org.hibernate.orm.jdbc.bind: TRACE   # parameter values
   spring.jpa.properties.hibernate.generate_statistics: true
   ```
2. Hit the endpoint once. Read the log.
3. Count the queries. If > 1 per returned entity, it's N+1 — see `data-layer.md`.
4. If it's one big query and still slow, grab the SQL and `EXPLAIN ANALYZE` it against the region's DB (a read replica if prod).
5. Missing index? Add it in a Liquibase changeset. Concurrent index creation for prod: `CREATE INDEX CONCURRENTLY` — but note Liquibase's default runs it in a transaction, which CONCURRENTLY forbids. Use `<sql splitStatements="false"><![CDATA[...]]></sql>` with `<modifySql><replace replace="BEGIN;" with=""/></modifySql>` or set `runInTransaction="false"` on the changeSet.

## OutOfMemoryError

On Fargate, container memory and JVM heap are different numbers. With Java 21, the JVM is container-aware by default, but explicit is better:

```
JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=75.0 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heap.hprof
```

Fargate task ephemeral storage is 20 GB by default — fine for a heap dump, but configure the container to write to `/tmp`, not the working dir, to avoid read-only FS issues if you've gone that route.

When OOM hits:
- Fargate kills the task, heap dump is lost unless you wrote it to an EFS mount or copied it out.
- Mitigation: periodic JFR uploads to S3 from a sidecar, or a pre-death hook. More commonly, just reproduce in staging with the same memory limit.

## "It works in one region but not another"

Checklist, in order:
1. **Task definition diff** — `aws ecs describe-task-definition` in both regions, diff the env vars, secrets, image tag.
2. **SSM / Secrets Manager diff** — regional parameter stores drift. Compare expected keys.
3. **Database schema** — `SELECT * FROM DATABASECHANGELOG ORDER BY DATEEXECUTED DESC LIMIT 10` in each region. Missing changesets?
4. **Data shape** — the affected region might have data the others don't (legacy import, different customer base).
5. **Latency to dependencies** — an external service might be cross-region in one setup and same-region in another. Check VPC endpoints and NAT.
6. **Time zones** — every server should be UTC, but a misconfigured container can inherit host TZ. `curl /actuator/env | grep user.timezone`.

## Actuator endpoints worth exposing (internally)

```yaml
management.endpoints.web.exposure.include: health,info,metrics,prometheus,loggers,threaddump,heapdump,configprops,env,mappings
management.endpoint.health.show-details: when-authorized
management.endpoint.health.probes.enabled: true   # /actuator/health/liveness and /readiness for ECS
```

`loggers` is the killer — change log levels at runtime without redeploying:
```
POST /actuator/loggers/com.company.persistence
{ "configuredLevel": "DEBUG" }
```

Lock these behind an internal security group / admin auth. Never expose to the internet.

## ECS task health check failures

ECS considers a task unhealthy if the container health check fails, not Spring's. Make sure the container-level health check actually hits Spring's readiness probe:

```json
"healthCheck": {
  "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health/readiness || exit 1"],
  "interval": 30,
  "timeout": 5,
  "retries": 3,
  "startPeriod": 60
}
```

`startPeriod` of 60s is usually enough for Spring Boot 3 with virtual threads enabled. If Liquibase runs on startup (don't, see `liquibase.md`), bump to 300s and reconsider your life choices.