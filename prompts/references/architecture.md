# Architecture Reference

Multi-module Maven layout for a Spring Boot 3.x / Java 21 application.

## Recommended module layout

```
project-root/
├── pom.xml                     (parent, <packaging>pom</packaging>)
├── api/                        DTOs, request/response records, public contracts
├── domain/                     Pure domain model + business logic, no Spring
├── persistence/                JPA entities, repositories, Liquibase changelogs
├── web/                        @RestController, exception handlers, filters
├── infrastructure/             AWS clients, external HTTP clients, messaging
└── app/                        @SpringBootApplication main class, wiring, profiles
```

### Why this split

- **`api`** — what other services consume. Depends on nothing internal. Records only.
- **`domain`** — business rules expressed without framework coupling. No `@Entity`, no `@Service`. Plain Java.
- **`persistence`** — owns the database. Entities are package-private where possible; repositories are the public surface.
- **`web`** — HTTP concerns only. Never imports from `persistence`.
- **`infrastructure`** — side-effectful adapters (S3, SQS, third-party APIs).
- **`app`** — the only module with `@SpringBootApplication` and the fat jar.

### Dependency direction

```
app ──► web ──► domain ◄── persistence
   ├──► infrastructure ──► api
   └──► api
```

**`web` must not depend on `persistence`.** If a controller needs data, it goes through a service in `domain` (or a dedicated `application` module if you add one) that talks to the repository. This keeps JPA entities out of HTTP serialization and prevents schema changes from breaking clients.

## Parent POM essentials

```xml
<properties>
    <java.version>21</java.version>
    <maven.compiler.release>21</maven.compiler.release>
    <spring-boot.version>3.3.x</spring-boot.version>
    <testcontainers.version>1.20.x</testcontainers.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers-bom</artifactId>
            <version>${testcontainers.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

Only the `app` module applies the `spring-boot-maven-plugin` with `<executable>true</executable>` to produce the runnable jar. Library modules must NOT produce Spring Boot fat jars — they'd be unusable as dependencies.

## Component scanning across modules

`@SpringBootApplication` scans only its own package and below. With multi-module, either:

1. Put `@SpringBootApplication` in a package that is a common ancestor of all module packages (e.g., `com.company.app` as root, with `com.company.persistence`, `com.company.web` as siblings) — cleanest.
2. Or explicitly: `@SpringBootApplication(scanBasePackages = "com.company")`.

JPA has its own scanning — if entities live outside the main app package, add:
```java
@EntityScan("com.company.persistence.entity")
@EnableJpaRepositories("com.company.persistence.repository")
```

## Common structural failures and fixes

| Symptom | Root cause | Fix |
|---|---|---|
| `NoSuchBeanDefinitionException` for a repository | Repository package not scanned | Add `@EnableJpaRepositories("com.company.persistence.repository")` on the app class |
| Entity not recognized, `Unknown entity` | Entity package not scanned | Add `@EntityScan` with the right base package |
| Controller sees stale API, consumer broke | Entity leaked through controller as return type | Map to a record in `api` before returning from controller |
| Circular module dependency | Service in `domain` imports a DTO from `web` | Move the DTO to `api` |
| `persistence` needs a helper from `infrastructure` | Dependency direction reversed | Define an interface in `domain`, implement in `infrastructure` (ports & adapters) |
| Tests in `web` can't find repositories | `web` correctly doesn't depend on `persistence` | Mock the service interface; don't reach for the repo |

## Where does this code go? (cheat sheet)

- A new REST endpoint → `web` (controller) + `domain` (service) + possibly `persistence` (new repo method)
- A new field on an entity → `persistence` (entity + Liquibase changeset) + `api` (DTO if exposed) + mapping updated in `domain` or `web`
- A call to an external API → `infrastructure` (client) + an interface in `domain`
- A validation rule → `domain` (if it's a business rule) or `api` (if it's an input shape rule — use Jakarta Validation annotations on the record)
- A shared utility → prefer to duplicate rather than create a `common` module; once you have 3 copies, extract to `domain` if it's pure or `infrastructure` if it's IO-bound