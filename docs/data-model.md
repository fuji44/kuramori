# Data Model Specification

This document defines the entity definitions, database schema (SQLite / Drizzle ORM), and review job lifecycle in `kuramori`.

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    review_requests ||--o{ review_jobs : "has"
    review_jobs ||--o| review_reports : "generates"
    review_jobs ||--o{ review_rule_results : "produces"
    review_rules ||--o{ review_jobs : "triggers"
    review_rules ||--o{ review_rule_results : "evaluated_in"
    review_triggers }o--o{ review_rules : "binds"

    review_requests {
        text id PK "Format: provider:owner/repo#number"
        text user_id
        text provider "github etc."
        text repository "owner/repo"
        integer number "PR number"
        text title
        text author
        text url
        text source_branch
        text target_branch
        text head_sha
        integer is_draft "0 or 1"
        integer is_own "0 or 1"
        text labels "JSON string"
        text milestone
        text assignees "JSON string"
        integer additions
        integer deletions
        text state "open | closed | merged"
        text created_at
        text updated_at
    }

    review_jobs {
        text id PK "UUID"
        text request_id FK
        text user_id
        text status "pending | running | completed | failed"
        text engine "claude-code | antigravity | codex | mock"
        text started_at
        text completed_at
        text error
        text report_id FK
        text rule_id FK
        text rule_name
        text rule_category
        text head_sha
    }

    review_reports {
        text id PK "UUID"
        text job_id FK
        text request_id FK
        text user_id
        text summary
        text verdict "APPROVE | COMMENT | REQUEST_CHANGES"
        text created_at
    }

    review_rules {
        text id PK "e.g., rule-correctness"
        text name
        text description
        text category "correctness | security | architecture etc."
        text engine "default | claude-code etc."
        text instructions "4-block prompt instructions"
        text trigger_json "Trigger event criteria"
        text concurrency_json "Concurrency and cancellation options"
        text engine_override_json "Model/effort overrides"
        integer enabled "0 or 1"
        text created_at
        text updated_at
    }

    review_triggers {
        text id PK "e.g., trigger-server"
        text name
        text repository "owner/repo or *"
        text paths_json "Target Glob list"
        text paths_ignore_json "Ignored Glob list"
        text rule_ids_json "Array of rule IDs"
        integer enabled "0 or 1"
        text created_at
        text updated_at
    }

    review_rule_results {
        text id PK "UUID"
        text job_id FK
        text request_id FK
        text rule_id FK
        text rule_name
        text category
        text head_sha
        text verdict "APPROVE | COMMENT | REQUEST_CHANGES"
        text summary
        text findings "JSON (array of findings)"
        text metadata "JSON (tokens, model info)"
        text created_at
    }

    pull_filters {
        text id PK "UUID"
        text name
        text description
        text query "Search query string"
        text created_at
        text updated_at
    }

    app_settings {
        text key PK
        text value "JSON or scalar value"
        text updated_at
    }
```

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
- **`pending`**: Queued, awaiting an available concurrency slot (`globalMaxConcurrency`).
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
   - Stores complete report structures with D2 vector SVG sources, CallFlow steps, and unified diff line markers.
   - Provides standalone exportable HTML files.
