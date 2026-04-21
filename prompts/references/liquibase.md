# Liquibase Reference

Schema versioning for Postgres across EU/AP/US regions.

## Layout

```
persistence/src/main/resources/db/
├── changelog-master.xml          (include-only, never modified for changes)
└── changes/
    ├── 2026/
    │   ├── 2026-04-20-001-add-orders-index.xml
    │   ├── 2026-04-21-001-add-customer-region.xml
    │   └── ...
```

`changelog-master.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                     http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.27.xsd">
    <includeAll path="db/changes/" relativeToChangelogFile="false"/>
</databaseChangeLog>
```

## Changeset rules

1. **Changesets are immutable.** Once merged to main, never edit — add a new changeset that amends. Liquibase hashes the changeset content; editing causes `Validation Failed` on next deploy.
2. **Every changeset has an explicit `id`, `author`, and `context` or `labels`** if you need environment targeting. File naming `YYYY-MM-DD-NNN-description.xml` gives natural ordering.
3. **Every changeset has a `rollback`.** Not optional. If a change is genuinely irreversible (dropping data), use `<rollback><sql>SELECT 'not reversible';</sql></rollback>` and document why in a comment — future you will thank present you when a region deploy fails.
4. **One logical change per changeset.** Don't bundle "add column" + "backfill" + "add NOT NULL" into one changeset — the backfill on a big table will time out and you can't resume.
5. **`runOnChange=true` is a trap** except for stored procedures / views. Use it only for objects you want redeployed whenever their definition changes.

## Example: safe add-column-with-backfill pattern

```xml
<!-- Changeset 1: add nullable column -->
<changeSet id="2026-04-20-001" author="you">
    <addColumn tableName="customer">
        <column name="region_code" type="varchar(3)"/>
    </addColumn>
    <rollback>
        <dropColumn tableName="customer" columnName="region_code"/>
    </rollback>
</changeSet>

<!-- Changeset 2: backfill (separate, so it can be retried independently) -->
<changeSet id="2026-04-20-002" author="you">
    <sql>
        UPDATE customer SET region_code = 'US' WHERE region_code IS NULL;
    </sql>
    <rollback>
        <sql>UPDATE customer SET region_code = NULL WHERE region_code = 'US';</sql>
    </rollback>
</changeSet>

<!-- Changeset 3: enforce NOT NULL once backfill verified -->
<changeSet id="2026-04-20-003" author="you">
    <addNotNullConstraint tableName="customer" columnName="region_code"/>
    <rollback>
        <dropNotNullConstraint tableName="customer" columnName="region_code"/>
    </rollback>
</changeSet>
```

## Multi-region migration ordering

The hard rule: **the new application version must be compatible with both the old and new schema for at least one deploy cycle.** Because you deploy regions sequentially (typical: US → EU → AP, or whatever your blast-radius order is), there is a window where US runs new code against new schema, EU runs new code against old schema, AP runs old code against old schema.

Two patterns:

### Additive first (preferred)
1. PR A: add nullable column / new table / new index — schema-compatible with old code
2. Deploy to all regions
3. PR B: app code starts writing to / reading from the new column
4. Deploy to all regions
5. PR C: backfill + NOT NULL + drop old column (if replacing something)
6. Deploy to all regions

Slow, yes. But no region-order-dependent failures.

### Expand/contract for renames
Never `RENAME COLUMN`. Instead: add new, dual-write from code, backfill, switch reads, drop old. Four deploys. Worth it.

## Stuck `DATABASECHANGELOGLOCK`

Happens when a Liquibase process is killed mid-migration (Fargate task timeout, spot interruption).

Symptoms: deploys hang at `Waiting for changelog lock...` for 5 minutes then fail.

**Before releasing the lock, confirm no migration is actually running.** Check the `DATABASECHANGELOG` table for the latest entry timestamp and cross-check `pg_stat_activity` for queries on the schema.

Then:
```sql
-- Only when you're sure nothing is running
UPDATE DATABASECHANGELOGLOCK SET LOCKED = false, LOCKGRANTED = NULL, LOCKEDBY = NULL WHERE ID = 1;
```

Or via CLI: `mvn liquibase:releaseLocks -pl persistence`.

## Running Liquibase in ECS

Do NOT run Liquibase as a sidecar or inside the app container at startup in production — every task that starts races for the lock.

Two reasonable patterns:
1. **Init container / one-shot ECS task** — Harness pipeline runs a Fargate task with `liquibase update`, waits for exit 0, then updates the service task definition to roll new app tasks.
2. **Separate migration job** — dedicated ECS task definition, scheduled or pipeline-invoked, that runs migrations. App containers have `spring.liquibase.enabled=false`.

Either way: **one region at a time.** Don't fan out migrations in parallel across regions unless each region has its own isolated DB (which is the usual case — but confirm).

## Generating a changeset from entity changes

Useful during development, not a substitute for thinking:

```bash
mvn -pl persistence liquibase:diff \
  -Dliquibase.diffChangeLogFile=target/pending.xml \
  -Dliquibase.referenceUrl="hibernate:spring:com.company.persistence.entity?dialect=org.hibernate.dialect.PostgreSQLDialect"
```

Then hand-edit `pending.xml` — the generated output is usually 80% right and 20% wrong (missing indexes, wrong constraint names, reorders columns).

## Validating before deploy

```bash
mvn -pl persistence liquibase:validate
mvn -pl persistence liquibase:status   # what would run
```

Run these in the Harness pipeline's pre-deploy stage per region. Failing fast beats debugging a half-migrated database.