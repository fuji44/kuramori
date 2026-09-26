# Concept Specification (kuramori)

## 1. Background & Problem Statement

Code reviews are essential for software quality, but reviewers face several operational burdens:

1. **Review Prioritization Overhead**: When multiple review requests arrive simultaneously, deciding which one to tackle first (based on diff size, update time, or blocker severity) requires non-trivial manual effort.
2. **Context & Dependency Grasping**: Reviewing interdependent PRs (stacked PRs or split feature branches) requires significant time to trace dependencies and sequence.
3. **Single PR Review Time**: Reading diffs thoroughly to verify logic, specification alignment, and architectural invariants is inherently time-consuming.
4. **Friction in Running AI Reviews**: Even when automated review prompts exist, manually triggering them and tracking whether reports have been generated for specific PRs adds administrative friction, preventing widespread adoption.

---

## 2. Objective

To minimize human review costs, `kuramori` provides an integrated web platform and runner system that automates the entire lifecycle: detecting review requests, pre-emptively executing AI reviews in isolated environments, generating structured reports with architectural diagrams, and presenting them via an intuitive dashboard.

---

## 3. Core Concepts

### 3.1 Flexible Queueing Modes (Auto vs. Manual)
Detects open review requests assigned to the user in the background. Users can toggle between two modes:
- **Auto Queueing (ON)**: Enqueues detected PRs immediately and executes reviews sequentially in the background.
- **Manual Queueing (OFF)**: Pull requests are collected and displayed as "Unreviewed" on the dashboard; reviews are queued only when the user explicitly clicks "Run Review". Ideal for controlled token consumption and cautious workflows.

### 3.2 Isolated Review Runner & Worktree Separation
To prevent polluting the user's local working directory, `kuramori` spawns an isolated temporary Git worktree for each review run and reliably cleans it up upon completion. The runner can be compiled into a standalone binary, ensuring identical behavior via the web server or terminal CLI.

### 3.3 Extensibility through Abstraction
- **VCS Abstraction (`VCSProvider`)**: Begins with GitHub (`gh` CLI zero-config auth) but provides clean boundaries for GitLab or pure local Git repositories.
- **Engine Abstraction (`ReviewEngine`)**:
  - `antigravity`: Google Antigravity CLI (`agy`) non-interactive execution.
  - `claude-code`: Claude Code CLI (`claude -p`) execution.
  - `codex`: OpenAI Codex CLI (`codex exec`) in secure sandboxes.
  - `mock`: Instant simulation for testing.
  - Easily switch engines dynamically via settings or per-rule configuration.
- **Report Storage Abstraction (`ReportStorage`)**: Enables seamless migration from local filesystem storage to S3 or Google Cloud Storage.

### 3.4 Seamless Preview & Intelligent Search Queries
- **GitHub-Style Query Syntax**:
  - `author:<username>`
  - `repo:<repository>`
  - `is:draft` / `-is:draft`
  - `is:reviewed` / `is:unreviewed`
  - `status:running` / `status:failed`
  - Free-text search (title, PR number, branch name)
- **Context-Aware Dynamic Suggestions**:
  - Displays instant dropdown suggestions matching existing usernames and repositories when typing qualifiers (`author:`, `repo:`, `is:`).
  - Full keyboard navigation support (`↓`, `↑`, `Tab`, `Enter`, `Esc`).
- **Inline Report Viewing**:
  - Integrated two-pane web dashboard combining PR list with interactive reports (D2 diagrams, StepFlows, and code diffs) to eliminate context switching.
