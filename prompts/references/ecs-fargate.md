# ECS Fargate Reference

Deploying the app across EU / AP / US regions.

## Regional setup assumptions

Each region has its own:
- ECS cluster (e.g., `prod-us-east-1`, `prod-eu-west-1`, `prod-ap-southeast-1`)
- RDS Postgres instance (not a global cluster unless explicitly documented)
- ALB + target group
- SSM Parameter Store and Secrets Manager entries
- CloudWatch log group

The **task definition is regional** — the same image tag gets deployed as a different task definition revision in each region. Harness manages the per-region revisions (see `harness-cicd.md`).

## Task definition essentials

Key knobs that matter for this app:

```json
{
  "family": "app",
  "cpu": "1024",
  "memory": "2048",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "runtimePlatform": { "cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX" },
  "executionRoleArn": "...",
  "taskRoleArn": "...",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "<ecr-url>/app:<tag>",
      "essential": true,
      "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
      "environment": [
        { "name": "SPRING_PROFILES_ACTIVE", "value": "prod,eu" },
        { "name": "JAVA_TOOL_OPTIONS", "value": "-XX:MaxRAMPercentage=75.0 -XX:+UseZGC" },
        { "name": "AWS_REGION", "value": "eu-west-1" }
      ],
      "secrets": [
        { "name": "SPRING_DATASOURCE_PASSWORD", "valueFrom": "arn:aws:secretsmanager:eu-west-1:...:secret:prod/db-password" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health/readiness || exit 1"],
        "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/app",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "app"
        }
      }
    }
  ]
}
```

### What changes per region

- `SPRING_PROFILES_ACTIVE`: `prod,us` / `prod,eu` / `prod,ap`
- `AWS_REGION`
- `secrets[].valueFrom` ARNs (region-specific Secrets Manager)
- `logConfiguration.options.awslogs-region`
- Image tag is the same. **Same artifact in every region** — config differences live in env/secrets, not in separate builds.

## Spring profile layout for regions

```
app/src/main/resources/
├── application.yml             base
├── application-prod.yml        prod-common (log levels, actuator security)
├── application-us.yml          US-specific overrides
├── application-eu.yml          EU-specific overrides (e.g., data residency rules)
└── application-ap.yml          AP-specific
```

Loaded in order — later profiles override earlier. `SPRING_PROFILES_ACTIVE=prod,eu` means `application.yml` → `application-prod.yml` → `application-eu.yml`.

Only put in region-specific files what genuinely differs. Most config should be identical.

## Secrets and parameters

- **Secrets Manager** for anything that rotates (DB passwords, API keys). Reference as ECS `secrets` entries — injected as env vars at task start.
- **SSM Parameter Store** for non-sensitive config that varies by region (feature flag defaults, downstream service URLs). Also referenceable as ECS `secrets`.
- **Never bake these into the image.** Never commit them. Never put them in a `.env` that ships.

Spring Cloud AWS can resolve them dynamically, but the ECS-injected-env approach is simpler and faster on startup. Pick one and stick with it.

## Region drift — the silent killer

Config drift between regions is the most common multi-region bug. Symptoms:
- Feature works in US, broken in EU
- Memory usage differs wildly between regions
- One region keeps OOM-ing
- A secret rotation succeeded in 2/3 regions

**Prevention:**
1. Task definitions are generated from a template (Harness variable substitution). No one edits them by hand in the AWS console.
2. A periodic diff job in CI compares key env vars across regions and alerts on unexpected divergence.
3. Harness pipeline promotes the SAME image tag through all regions — never rebuilds per region.

**Detection script (useful ad-hoc):**
```bash
for region in us-east-1 eu-west-1 ap-southeast-1; do
  echo "=== $region ==="
  aws ecs describe-task-definition \
    --task-definition app --region $region \
    --query 'taskDefinition.containerDefinitions[0].environment' \
    --output json | jq 'sort_by(.name)'
done
```

## Networking gotchas

- **Fargate tasks need outbound to ECR, CloudWatch, Secrets Manager, SSM.** In private subnets this means VPC endpoints (interface endpoints cost money but remove NAT data charges; worth it at scale).
- **DB is in a private subnet, app is in a private subnet.** Security group on the DB allows inbound 5432 from the app's SG only.
- **ALB is the only thing in public subnets.** Health check path `/actuator/health/readiness` (not `/actuator/health` — that can be UP while the app isn't ready to serve).
- **Cross-region calls are expensive and slow.** Each region's app talks to its own regional DB. If you must call across regions, it's a design smell — escalate.

## Health checks — readiness vs liveness

Spring Boot's probes:
- `/actuator/health/liveness` — is the app alive? (ECS restarts on fail)
- `/actuator/health/readiness` — is the app ready to serve traffic? (ALB routes based on this)

Liveness should almost never fail — only on deadlock or unrecoverable state. Don't put DB checks in liveness; a DB blip will cause ECS to restart your tasks, which won't help.

Readiness should fail when dependencies are down — DB unreachable, critical downstream service unavailable. ALB removes the task from the target group, ECS doesn't restart it.

## Graceful shutdown

```yaml
server.shutdown: graceful
spring.lifecycle.timeout-per-shutdown-phase: 30s
```

ECS sends SIGTERM, waits `stopTimeout` (default 30s, bump to 60 for this app) then SIGKILL. Spring's graceful shutdown lets in-flight requests finish. Set the ALB deregistration delay to match (60s).

## When a task won't start

1. `aws ecs describe-tasks --cluster <c> --tasks <arn>` — look at `stoppedReason` and `containers[].reason`.
2. Common reasons:
   - `CannotPullContainerError` → image tag doesn't exist, or task role can't reach ECR (VPC endpoint missing).
   - `ResourceInitializationError: unable to pull secrets` → execution role lacks `secretsmanager:GetSecretValue` for the specific ARN.
   - `Essential container in task exited` → check CloudWatch logs for the app's actual startup exception. Usually a config issue (missing secret, DB unreachable).
3. If CloudWatch has nothing, the container died before logging. Usually a bad `JAVA_TOOL_OPTIONS` or missing file. Run the same image locally with the same env vars to reproduce.