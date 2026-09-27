# Data Model Specification

This document defines the entity definitions, database schema (SQLite / Drizzle ORM), and review job lifecycle in `kuramori`.

---

## 1. Entity-Relationship Diagram (ERD) & Schema Catalog

<!-- BEGIN_SCHEMA_DOCS -->

```mermaid
erDiagram
    review_jobs ||--o{ review_reports : "references"
    review_jobs ||--o{ review_rule_results : "references"
    review_requests ||--o{ review_jobs : "references"
    review_requests ||--o{ review_reports : "references"
    review_requests ||--o{ review_rule_results : "references"
    review_rules ||--o{ review_jobs : "references"
    review_rules ||--o{ review_rule_results : "references"

    app_settings {
        text key PK
        text value
        text updated_at
    }

    pull_filters {
        text id PK
        text name
        text description
        text query
        text created_at
        text updated_at
    }

    review_jobs {
        text id PK
        text request_id FK
        text user_id
        text status
        text engine
        text started_at
        text completed_at
        text error
        text report_id
        text rule_id FK
        text rule_name
        text rule_category
        text head_sha
    }

    review_reports {
        text id PK
        text job_id FK
        text request_id FK
        text user_id
        text summary
        text verdict
        text created_at
    }

    review_requests {
        text id PK
        text user_id
        text provider
        text repository
        integer number
        text title
        text author
        text url
        text source_branch
        text target_branch
        text head_sha
        integer additions
        integer deletions
        integer_boolean is_draft
        integer_boolean is_own
        text state
        text created_at
        text updated_at
        text labels
        text milestone
        text assignees
    }

    review_rule_results {
        text id PK
        text job_id FK
        text request_id FK
        text rule_id FK
        text rule_name
        text category
        text head_sha
        text verdict
        text summary
        text findings
        text metadata
        text created_at
    }

    review_rules {
        text id PK
        text name
        text description
        text category
        text engine
        text instructions
        text_JSON trigger_json
        text_JSON concurrency_json
        text_JSON engine_override_json
        integer_boolean enabled
        text created_at
        text updated_at
    }

    review_triggers {
        text id PK
        text name
        text repository
        text_JSON paths_json
        text_JSON paths_ignore_json
        text_JSON rule_ids_json
        integer_boolean enabled
        text created_at
        text updated_at
    }
```

### Table Catalog

#### `app_settings`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `key` | `text` | **PK**, NOT NULL | - |
| `value` | `text` | NOT NULL | - |
| `updated_at` | `text` | NOT NULL | - |

#### `pull_filters`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `name` | `text` | NOT NULL | - |
| `description` | `text` | NOT NULL | `` |
| `query` | `text` | NOT NULL | `` |
| `created_at` | `text` | NOT NULL | - |
| `updated_at` | `text` | NOT NULL | - |

#### `review_jobs`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `request_id` | `text` | FK, NOT NULL | - |
| `user_id` | `text` | NOT NULL | `default` |
| `status` | `text` | NOT NULL | `pending` |
| `engine` | `text` | NOT NULL | `claude-code` |
| `started_at` | `text` | - | - |
| `completed_at` | `text` | - | - |
| `error` | `text` | - | - |
| `report_id` | `text` | - | - |
| `rule_id` | `text` | FK | - |
| `rule_name` | `text` | - | - |
| `rule_category` | `text` | - | - |
| `head_sha` | `text` | - | - |

#### `review_reports`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `job_id` | `text` | FK, NOT NULL | - |
| `request_id` | `text` | FK, NOT NULL | - |
| `user_id` | `text` | NOT NULL | `default` |
| `summary` | `text` | - | - |
| `verdict` | `text` | - | - |
| `created_at` | `text` | NOT NULL | - |

#### `review_requests`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `user_id` | `text` | NOT NULL | `default` |
| `provider` | `text` | NOT NULL | `github` |
| `repository` | `text` | NOT NULL | - |
| `number` | `integer` | NOT NULL | - |
| `title` | `text` | NOT NULL | - |
| `author` | `text` | NOT NULL | - |
| `url` | `text` | NOT NULL | - |
| `source_branch` | `text` | NOT NULL | `` |
| `target_branch` | `text` | NOT NULL | `` |
| `head_sha` | `text` | NOT NULL | `` |
| `additions` | `integer` | - | - |
| `deletions` | `integer` | - | - |
| `is_draft` | `integer (boolean)` | NOT NULL | `false` |
| `is_own` | `integer (boolean)` | NOT NULL | `false` |
| `state` | `text` | NOT NULL | `open` |
| `created_at` | `text` | NOT NULL | - |
| `updated_at` | `text` | NOT NULL | - |
| `labels` | `text` | - | - |
| `milestone` | `text` | - | - |
| `assignees` | `text` | - | - |

#### `review_rule_results`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `job_id` | `text` | FK, NOT NULL | - |
| `request_id` | `text` | FK, NOT NULL | - |
| `rule_id` | `text` | FK, NOT NULL | - |
| `rule_name` | `text` | NOT NULL | - |
| `category` | `text` | NOT NULL | - |
| `head_sha` | `text` | NOT NULL | - |
| `verdict` | `text` | NOT NULL | - |
| `summary` | `text` | NOT NULL | - |
| `findings` | `text` | NOT NULL | - |
| `metadata` | `text` | - | - |
| `created_at` | `text` | NOT NULL | - |

#### `review_rules`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `name` | `text` | NOT NULL | - |
| `description` | `text` | NOT NULL | `` |
| `category` | `text` | NOT NULL | `general` |
| `engine` | `text` | NOT NULL | `default` |
| `instructions` | `text` | NOT NULL | - |
| `trigger_json` | `text (JSON)` | NOT NULL | `{}` |
| `concurrency_json` | `text (JSON)` | - | - |
| `engine_override_json` | `text (JSON)` | - | - |
| `enabled` | `integer (boolean)` | NOT NULL | `true` |
| `created_at` | `text` | NOT NULL | - |
| `updated_at` | `text` | NOT NULL | - |

#### `review_triggers`

| Column | Type | Constraints | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **PK**, NOT NULL | - |
| `name` | `text` | NOT NULL | - |
| `repository` | `text` | NOT NULL | - |
| `paths_json` | `text (JSON)` | - | - |
| `paths_ignore_json` | `text (JSON)` | - | - |
| `rule_ids_json` | `text (JSON)` | NOT NULL | - |
| `enabled` | `integer (boolean)` | NOT NULL | `true` |
| `created_at` | `text` | NOT NULL | - |
| `updated_at` | `text` | NOT NULL | - |

<!-- END_SCHEMA_DOCS -->

---

## 2. Job State Lifecycle

Review executions are orchestrated asynchronously by `ReviewQueue` with concurrency control:

```mermaid
stateDiagram-v2
    [*] --> Pending: PR detected / Manual run
    Pending --> Running: Slot acquired
    state Running {
        [*] --> WorktreeSetup: Prepare isolated worktree
        WorktreeSetup --> PreFlight: Collect context.json
        PreFlight --> EngineExecution: Launch AI engine (Claude/Antigravity/Codex)
        EngineExecution --> GatekeeperValidation: Validate JSON schema & line anchors
        GatekeeperValidation --> WorktreeCleanup: Remove worktree
        WorktreeCleanup --> [*]
    }
    Running --> Completed: Success & results aggregated
    Running --> Failed: Error / Timeout / Schema violation
    Completed --> [*]
    Failed --> [*]
```

### State Definitions
- **`pending` / `queued`**: Enqueued, awaiting an available concurrency slot (`globalMaxConcurrency`).
- **`running`**: Slot acquired; worktree initialized and AI inference executing.
- **`completed`**: Inference succeeded, Gatekeeper verified, HTML/JSON reports generated, and rule results aggregated.
- **`failed`**: Halted due to CLI error, timeout, or schema failure (details stored in `review_jobs.error` and `data/logs/<jobId>.log`).

---

## 3. Dual Storage Architecture

Review artifacts are persisted in both the database and file storage (`LocalFileReportStorage`):

1. **Database (`review_reports`, `review_rule_results`)**:
   - Stores metadata (`verdict`, `summary`, finding counts).
   - Enables fast filtering, sorting, and dashboard querying.
2. **File Storage (`data/reports/<reportId>.json`, `<reportId>.html`)**:
   - Stores complete report structures including:
     - `appliedRules`: Structured execution summaries (ruleId, ruleName, category, verdict, summary, findingsCount, completedAt) for each applied rule.
     - D2 vector SVG sources (module dependencies, blast radius, StepFlow).
     - CallFlow steps and unified diff line markers.
   - Provides standalone exportable HTML files (`<reportId>.html`).

---

## 4. Engine Profiles and Execution Model

`kuramori` decouples rules and jobs from low-level engine types by introducing **Engine Profiles**:

```mermaid
flowchart LR
    subgraph RuleLayer["Rules & Triggers"]
        Rule1["ReviewRule<br>(engine: 'default-claude')"]
        Rule2["ReviewRule<br>(engine: 'default')"]
    end

    subgraph Resolver["Profile Resolver<br>(resolveRuleEngineProfile)"]
        MatchExact["1. Match profile.id"]
        MatchEngine["2. Match profile.engineType"]
        MatchDefault["3. Fallback to defaultEngineProfileId"]
    end

    subgraph ProfileLayer["Engine Profiles (app_settings.engineProfiles)"]
        ProfClaude["Profile: default-claude<br>engineType: claude-code<br>model: sonnet"]
        ProfAgy["Profile: default-agy (isDefault)<br>engineType: antigravity<br>model: gemini-3.1-pro"]
    end

    subgraph Execution["Runtime Engine & Concurrency"]
        ClaudeRuntime["ClaudeCodeEngine<br>(concurrency: backendLimits.claudeCode)"]
        AgyRuntime["AntigravityEngine<br>(concurrency: backendLimits.antigravity)"]
    end

    Rule1 --> MatchExact --> ProfClaude --> ClaudeRuntime
    Rule2 --> MatchDefault --> ProfAgy --> AgyRuntime
```

### Profile Attributes
- **`id`**: Unique preset identifier (e.g., `default-claude`, `default-agy`, `default-codex`).
- **`engineType`**: The underlying AI runner implementation (`antigravity` | `claude-code` | `codex` | `mock`).
- **`config`**: Engine-specific configurations (binary path, model, effort, timeout, sandbox mode, custom environment variables).
- **`isDefault`**: Flag indicating the system-wide fallback profile when rules specify `engine = 'default'`.

### Resolution Strategy (`resolveRuleEngineProfile`)
1. **Active Profiles Requirement**: At least one active profile must be registered in settings. If no profiles exist, the queue throws an explicit error rather than silently executing unconfigured runners.
2. **Exact Profile ID match**: If `rule.engine` matches `profile.id` (e.g., `default-claude`), that profile is selected.
3. **Engine Type match**: If `rule.engine` matches an `engineType` (e.g., `claude-code`), the matching enabled profile (or its default instance) is selected.
4. **Default Fallback**: If `rule.engine` is `'default'` or unspecified, the profile designated by `defaultEngineProfileId` (or `isDefault === true`) is used. If the referenced profile does not exist, an explicit error is thrown.
5. **Concurrency Tracking**: Regardless of whether a job was scheduled with a profile ID (`default-claude`) or an engine name (`claude-code`), active concurrency slots are grouped and limited by the resolved `engineType`.
