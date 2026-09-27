---
name: kuramori-review
description: >-
  Inspect pull requests, trigger and monitor automated reviews, explore reports and D2 diagrams,
  apply fixes for review findings, and troubleshoot failed jobs in kuramori. Use whenever
  the user wants to review PRs, check review status, inspect findings, or fix detected issues.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Kuramori Review (`kuramori-review`)

## Overview

`kuramori` (蔵守) is an automated review management platform that detects GitHub Pull Requests, runs pre-emptive deep reviews using AI engines (Claude Code, Antigravity, Codex) inside isolated Git worktrees, and produces structured reports with D2 vector diagrams.

This skill equips agents to handle the **complete operational review cycle**:
1. **PR Triage & Status Inspection**: Monitor tracked PRs, active review runs, and verdict distributions.
2. **Review Triggering**: Run or re-run reviews with specific rules or engines.
3. **Interactive Report Deep Dive**: Extract critical findings (P1/P2), code suggestions, D2 architecture diagrams, and StepFlow call paths.
4. **Interactive Fix & Verification**: Seamlessly apply recommended code fixes directly to the repository and verify with tests.
5. **Troubleshooting & Self-Healing**: Diagnose failed review jobs from raw logs, resolve worktree conflicts, and verify engine connectivity.

### Reference Specifications (SSOT)
- **API Reference & OpenAPI**: [docs/api.md](../../../docs/api.md) or live `${KURAMORI_URL:-http://127.0.0.1:3456}/api/openapi.json`
- **Operations & Troubleshooting**: [docs/operations.md](../../../docs/operations.md)
- **AI Engines**: [docs/engines.md](../../../docs/engines.md)
- **Data Model & States**: [docs/data-model.md](../../../docs/data-model.md)

---

## Operating Environment & Base URL

Resolve target server base URL:
```bash
BASE_URL="${KURAMORI_URL:-${REVIEW_BASE_URL:-http://127.0.0.1:3456}}"
```

If the server is unreachable, fall back to standalone CLI runner commands (`deno task runner`) or guide the user to start the server (`deno task start`).

---

## Core Workflows

```
┌────────────────────────────────────────────────────────────┐
│ Workflow 1: PR Triage & Status Inspection                  │
│ (List tracked PRs, active jobs, verdicts)                  │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Workflow 2: Run / Re-run Review                            │
│ (Trigger review via API or CLI runner)                     │
└─────────────────────────────┬──────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
┌──────────────────────────────┐ ┌───────────────────────────┐
│ Workflow 3: Report & D2      │ │ Workflow 5: Troubleshoot  │
│ (Inspect findings & diagram) │ │ (Analyze logs, self-heal) │
└──────────────┬───────────────┘ └───────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Workflow 4: Fix & Verify     │
│ (Apply patches, run tests)   │
└──────────────────────────────┘
```

---

## Workflow 1: PR Triage & Status Inspection

Use when the user asks: *"What PRs need review?"*, *"Check PR status"*, or *"Review queue status"*.

### Execution Steps
1. Fetch all tracked pull requests from the server:
   ```bash
   curl -s "${BASE_URL}/api/pulls"
   ```
2. Categorize items into:
   - **Needs Review**: `latestJob` is `null` or unreviewed.
   - **Running**: `latestJob.status === "running"`.
   - **Completed**: `latestJob.status === "completed"`. Highlight verdict (`APPROVE`, `COMMENT`, `REQUEST_CHANGES`).
   - **Failed**: `latestJob.status === "failed"`.
3. Present a clean Markdown table:
   | Repository | PR # | Title | Author | Status | Verdict |
   | :--- | :--- | :--- | :--- | :--- | :--- |

---

## Workflow 2: Trigger or Re-run a Review

Use when the user asks: *"Review PR #123"*, *"Run review on owner/repo"*, or *"Re-run with security rule"*.

### Execution Methods

#### Option A: Via REST API (Recommended)
PR identifier format: `github:<owner>/<repo>#<number>` (encode `#` as `%23` in paths).
```bash
# Basic run (auto-matches rules via triggers)
curl -s -X POST "${BASE_URL}/api/pulls/github:<owner>%2F<repo>%23<number>/run"

# Run with specific rule or engine
curl -s -X POST "${BASE_URL}/api/pulls/github:<owner>%2F<repo>%23<number>/run" \
  -H "Content-Type: application/json" \
  -d '{"ruleId": "rule-security", "engine": "claude-code"}'
```

#### Option B: Standalone CLI Runner (When server is offline)
```bash
deno task runner --repo <owner/repo> --pr <number> --engine <engine>
```

---

## Workflow 3: Report Deep Dive & Architectural Diagrams

Use when the user asks: *"Summarize the review for PR #123"*, *"What are the critical findings?"*, or *"Show me the diagram"*.

### Execution Steps
1. Fetch structured report JSON:
   ```bash
   curl -s "${BASE_URL}/api/reports/<reportId>/data"
   ```
2. Present structured insights:
   - **Verdict**: `APPROVE`, `COMMENT`, or `REQUEST_CHANGES`
   - **Executive Brief**: Problem statement, Approach, Blast Radius
   - **Priority Findings (P1 / P2)**:
     - Severity, File Path, and Line Number
     - Issue description and concrete code suggestion
   - **D2 Architectural Diagram**: If `diagram.d2Source` exists, summarize modified components and blast radius.
   - **StepFlow**: Summarize modified call sequences if present.
3. Provide browser link: `[Open Interactive Report](${BASE_URL}/?view=report&id=<reportId>)`.

---

## Workflow 4: Interactive Fix & Verification (Actionable Remediation)

Use when the user asks: *"Fix the P1 issues found by the review"*, *"Apply the suggested changes"*, or *"Address the review comments"*.

### Execution Steps
1. **Identify Target Finding**: Extract the file path, line numbers, and proposed code snippet from the report findings.
2. **Inspect Current Code**: View the target file in the local workspace using `view_file` to confirm the surrounding context matches.
3. **Apply Code Edits**: Use `replace_file_content` to apply the recommended fix cleanly (avoiding unformatted overwrites).
4. **Deterministic Verification**: Run project tests to ensure no regressions were introduced:
   ```bash
   deno task test
   deno task check
   ```
5. **Confirmation**: Report to the user what was modified and present the test results.

---

## Workflow 5: Troubleshooting & Self-Healing

Use when a job fails or the user asks: *"Why did the review fail?"*, *"Fix failed job..."*.

### Execution Steps
1. Fetch execution logs:
   ```bash
   curl -s "${BASE_URL}/api/jobs/<jobId>/log"
   # Or view local file: data/logs/<jobId>.log
   ```
2. Diagnose root causes & execute remediation:
   - **Worktree Lock / Conflict**: Check `.worktrees/`. If an orphaned worktree exists, prune safely:
     ```bash
     git worktree prune
     ```
   - **Gatekeeper Validation Failure**: AI engine produced invalid JSON schema (e.g., negative line numbers). Suggest re-running with a stronger model (`sonnet-3-7`) or adjust rule prompts.
   - **CLI Auth Expiration**: `gh auth status` failed. Inform user to run `gh auth login`.
   - **Timeout (45s or 15m)**: Diff too large. Re-run with custom `--max-turns` or targeted rule.

---

## Workflow 6: Engine Health & Connectivity Diagnostics

Use when the user asks: *"Test Claude engine"*, *"Check if Ollama is connected"*, or *"Verify Antigravity"*.

```bash
# Test engine CLI connectivity
curl -s -X POST "${BASE_URL}/api/engines/<engine>/test"

# Test full inference execution
curl -s -X POST "${BASE_URL}/api/engines/<engine>/test" \
  -H "Content-Type: application/json" \
  -d '{"mode": "execution"}'
```

For Ollama local LLM verification:
```bash
deno task verify:local-llm --url http://localhost:11434 --model <model>
```

---

## Communication Guidelines

- **Language Matching**: Respond in Japanese if prompted in Japanese; otherwise use English.
- **Markdown Links**: Format all URLs as `[link text](URL)`. Never leave raw URLs.
- **Action-Oriented**: Always link review findings directly to concrete next steps or direct file edits.
