# Harness CI/CD Reference

Pipeline conventions for building once, promoting across regions.

## Pipeline shape (typical)

```
[ Build ] → [ Test ] → [ Publish image ] → [ Deploy US ] → [ Verify US ] → [ Deploy EU ] → [ Verify EU ] → [ Deploy AP ] → [ Verify AP ]
```

Key principles:

1. **Build once, deploy many.** A single Docker image (by digest, not tag) is promoted through all regions. No per-region builds.
2. **Migrate before app.** Within each region stage, run Liquibase migrations as a separate step (ECS one-shot task) before updating the ECS service.
3. **Verify before promoting.** Each region has a post-deploy verification stage (health checks, smoke tests) that must pass before the next region starts.
4. **Manual approval gate before prod EU and AP.** US is often the canary — if it's clean for N minutes, approve the next region.

## Build stage

- Maven multi-module build: `mvn -B -ntp clean verify`.
- Run Testcontainers-based integration tests here — Harness delegates with Docker-in-Docker or a Kubernetes delegate with privileged pods. If tests run slow in CI, cache the Testcontainers images.
- Publish JUnit + JaCoCo reports.
- Build image with a tag containing commit SHA: `<ecr>/app:<git-sha>`. Also push `<ecr>/app:<git-sha>` as immutable; `latest` is forbidden.

## Image promotion

Harness Artifacts should reference the image by **digest**, not tag. Tags are mutable even when you think they're not (someone force-pushes, an ECR lifecycle rule deletes). Digests are content-addressed.

Per-region deploy step variables (Harness):
```yaml
- name: imageDigest
  value: <%= artifact.digest %>
- name: awsRegion
  value: <%= env.variables.awsRegion %>   # us-east-1, eu-west-1, ap-southeast-1
- name: ecsCluster
  value: prod-<%= env.variables.awsRegion %>
- name: springProfiles
  value: prod,<%= env.variables.regionShort %>   # us, eu, ap
```

## Per-region deployment sequence

Each regional stage should be:

1. **Pre-deploy validation**
   - `liquibase:validate` against the region's DB (read-only)
   - `liquibase:status` — list pending changesets
   - Smoke-check: can we reach the DB, SSM, Secrets Manager from a delegate in that region?

2. **Run migrations** (if pending)
   - Launch a one-shot Fargate task with the same image, overriding the entrypoint to run `liquibase update`.
   - Wait for task to reach `STOPPED` with exit code 0.
   - If it fails: pipeline fails, no app deploy, alert.

3. **Update ECS service**
   - Register new task definition revision (same image digest, region-appropriate env/secrets).
   - `aws ecs update-service --force-new-deployment` with the new revision.
   - Rolling update with `minimumHealthyPercent=100`, `maximumPercent=200` for zero-downtime.

4. **Wait for steady state**
   - Poll `describe-services` until `runningCount == desiredCount` with all tasks on the new revision.
   - Timeout: 10 minutes. If it doesn't reach steady state, fail the stage.

5. **Smoke verify**
   - Hit a known endpoint through the ALB (public or internal).
   - Check actuator `/info` returns the expected git SHA.
   - Run a small set of synthetic transactions (read-only if in prod).

6. **Soak** (production only)
   - Wait 5–10 minutes. Watch CloudWatch alarms for the service: error rate, p99 latency, task restarts.
   - If any alarm trips, auto-rollback (see below).

## Post-deploy verification

What "green pipeline" is NOT sufficient for: **it confirms the deploy mechanism worked, not that the app is healthy.** Always also check:

- Error rate in the last 5 minutes (compared to before deploy) — Harness can query CloudWatch.
- Task restart count stable.
- Latency p95 within expected envelope.
- Application-level metric for any core business flow (e.g., "orders created per minute").

If your Harness pipelines are "succeeding" while customers report breakage, it's almost always because these checks aren't wired in.

## Rollback

Two flavors:

### Fast rollback (preferred for app-only issues)
Re-deploy the previous ECS task definition revision:
```
aws ecs update-service --service app --task-definition app:<previous-revision> --force-new-deployment
```
Harness should keep the last N revisions as a parameter. This is ~2 minutes to stable.

### Schema-involved rollback (slow, painful)
If the bad deploy included a Liquibase changeset:
1. First ask: does the previous app version work with the new schema? (If you followed the expand/contract pattern in `liquibase.md`, yes.)
2. If yes: fast rollback the app. Leave the schema. Plan a proper fix-forward.
3. If no: you have a problem. Rolling back a Liquibase changeset on a live DB with traffic is risky. Consider fix-forward with an emergency changeset instead.

**The lesson is always the same: never ship a non-additive schema change.**

## When a Harness pipeline "succeeds" but the app is broken

Checklist:
1. Did the migration task actually run? Check its ECS task exit code — a skipped step can appear green.
2. Did the service reach steady state with the NEW task definition, or did it fall back? `aws ecs describe-services` shows `taskDefinition` actually running vs. desired.
3. Did verification steps actually call the right endpoint? A curl of `/actuator/health` returns UP when the app is up but not ready for traffic. Use `/actuator/health/readiness`.
4. Are CloudWatch alarms wired to the pipeline verification? If not, the pipeline has no way to know the app is unhealthy.

## Local reproduction of a pipeline step

For debugging a Harness step without running the whole pipeline:

```bash
# Reproduce the build
mvn -B -ntp clean verify

# Reproduce the image build
docker build -t app:local .

# Reproduce the migration step
docker run --rm --network host \
  -e SPRING_PROFILES_ACTIVE=migration \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/app \
  app:local \
  java -cp app.jar org.springframework.boot.loader.launch.PropertiesLauncher \
  --spring.main.web-application-type=none --spring.liquibase.enabled=true
```

If it works locally with the same image and fails in the pipeline, it's environment — IAM, network, secret resolution. Read the Harness delegate logs, not just the pipeline output.