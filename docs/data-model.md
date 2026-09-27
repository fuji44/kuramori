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
        text status "pending | queued | running | completed | failed"
        text engine "Profile ID or Engine Type (e.g., default-claude, antigravity)"
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
        text id PK "Format: report-<requestId>-<timestamp>"
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
        text engine "default | Profile ID (e.g., default-claude) | Engine Type"
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
