---
name: kuramori-rules
description: >-
  Design, generate, inspect, and fine-tune path-specific review rules and trigger patterns for kuramori.
  Use when creating new review guidelines, profiling repositories, tuning existing rules to eliminate noise,
  or testing Glob trigger path matches.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Kuramori Rules (`kuramori-rules`)

## Overview

`kuramori` (蔵守) utilizes decoupled, path-specific review rules (`ReviewRule`) activated dynamically by Glob trigger conditions (`ReviewTrigger`).

This skill equips AI coding agents to manage the **entire lifecycle of review rules and triggers**:
1. **Profiling & Generation**: Deeply inspect codebases to synthesize high-precision 4-block review instructions tailored to architecture boundaries and domain failure modes.
2. **Inventory & Simulation**: List, inspect, and simulate how changes to specific file paths match existing rules and triggers.
3. **Fine-Tuning & Noise Reduction**: Continuously adjust instructions, verification protocols, or noise filters based on developer feedback to suppress unwanted review comments.
4. **Trigger Management**: Configure and optimize glob patterns (`paths`, `pathsIgnore`) and event bindings.

### Reference Specifications (SSOT)
- **Rules & Triggers Concept**: [docs/rules-and-triggers.md](../../../docs/rules-and-triggers.md)
- **Domain Smells & Categories**: [references/categories.md](references/categories.md)
- **Output Schema**: [references/output-schema.json](references/output-schema.json)
- **REST API Contracts**: [docs/api.md](../../../docs/api.md) or live `${KURAMORI_URL:-http://127.0.0.1:3456}/api/openapi.json`

---

## Operating Environment & Base URL

Resolve target server base URL:
```bash
BASE_URL="${KURAMORI_URL:-${REVIEW_BASE_URL:-http://127.0.0.1:3456}}"
```

---

## Core Workflows

```
┌────────────────────────────────────────────────────────┐
│ Workflow 1: Repository Profiling & Rule Generation     │
│ (Scan codebase, synthesize 4-block rules, register)    │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌──────────────────────────────┐ ┌───────────────────────┐
│ Workflow 2: Inventory & Match│ │ Workflow 3: Fine-Tune │
│ (Inspect active rules/paths) │ │ (Reduce noise, adjust)│
└──────────────────────────────┘ └───────────────────────┘
```

---

## Workflow 1: Repository Profiling & Initial Rule Generation

Use when the user asks: *"Create review rules for this repository"*, *"Generate kuramori rules for org/repo"*, or *"Set up initial review guidelines"*.

### Step 0: Target Resolution & Alignment
Identify and confirm the target repository with the user:
- Current Working Directory (CWD): identify `owner/repo` from git remote or manifests.
- Specific GitHub repository or local path.
**Confirm the resolved path/repo before proceeding.**

### Step 1: Detect Tech Stack & Directory Architecture
Inspect the confirmed directory to detect:
1. **Manifests & Monorepo Layout**: `deno.json`, `package.json`, `pnpm-workspace.yaml`, `Cargo.toml`, etc.
2. **Frameworks & Databases**: Hono, Next.js, Express, Drizzle, Prisma, SQLAlchemy, etc.
3. **Static Analysis Rigor**: `tsconfig.json` flags (`strict`, `noUncheckedIndexedAccess`), ESLint/Biome configs. Note what linters already catch deterministically.
4. **Directory Boundaries**: Map responsibilities (`apps/server`, `apps/web`, `packages/core`, `domain/`, `routes/`, `db/`).

### Step 2: Extract Existing Invariants & Conventions
Search existing conventions:
- `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/**/*.md`
- `AGENTS.md`, `.cursorrules`, `.agents/rules/*.md`
Extract logging rules (structured vs interpolated), error idioms, type safety conventions, and architectural layer constraints.

### Step 3: Map Path-Based Rules & Review Categories
Select 3–5 specialized rules based on [references/categories.md](references/categories.md):
- Routes/Controllers ➔ `security`
- DB/Migrations ➔ `integrity`
- Domain/Services ➔ `correctness`
- Root/Packages/Boundaries ➔ `architecture`
- UI/Frontend ➔ `frontend`

### Step 4: Synthesize 4-Block Structured Instructions
For each rule, format `instructions` into the mandatory 4-block template:

```markdown
=== 1. SCOPE & OBJECTIVE ===
Define rule responsibility and quality goals in 1-2 concise sentences.

=== 2. KEY SMELLS & FAILURE MODES ===
Bullet points of domain-specific anti-patterns and failure modes:
- [Smell 1]: Concrete pattern, security flaw, or invariant breach.
- [Smell 2]: Edge case, concurrency trap, or lifecycle issue.
- [Smell 3]: Logging or typing convention violation.

=== 3. VERIFICATION PROTOCOL ===
Actionable investigation steps the reviewer MUST perform in the worktree:
1. Search caller sites (callers) using grep across the repo to verify backward compatibility.
2. Inspect related schemas, type definitions, and boundary guards.
3. Check boundary tests (0, empty arrays, null/undefined, error paths).

=== 4. NOISE FILTER (STRICTLY PROHIBITED) ===
Explicitly forbid review fatigue triggers:
- Do NOT comment on formatting, whitespace, or stylistic nits handled by linters/formatters.
- Do NOT challenge decisions explained in the PR description or existing comments.
- Do NOT raise abstract complaints without concrete suggestion snippets.
```

### Step 5: Validate & Register via kuramori API
1. Inspect live contracts: `curl -s "${BASE_URL}/api/openapi.json"`
2. Validate payload against [references/output-schema.json](references/output-schema.json).
3. Register rules:
   ```bash
   curl -s -X POST "${BASE_URL}/api/rules" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "rule-<name>",
       "name": "...",
       "description": "...",
       "category": "...",
       "instructions": "...",
       "trigger": { "paths": ["..."], "pathsIgnore": ["..."] },
       "enabled": true
     }'
   ```
4. Register triggers:
   ```bash
   curl -s -X POST "${BASE_URL}/api/triggers" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "trigger-<name>",
       "name": "...",
       "repository": "owner/repo",
       "paths": ["..."],
       "pathsIgnore": ["..."],
       "ruleIds": ["rule-<name>"],
       "enabled": true
     }'
   ```
5. Report the registered rules and triggers with links to `${BASE_URL}/api/doc`.

---

## Workflow 2: Rule & Trigger Inventory & Simulation

Use when the user asks: *"List registered review rules"*, *"Which rules trigger for path X?"*, or *"Show me trigger configuration"*.

### Execution Steps
1. Fetch all rules and triggers:
   ```bash
   curl -s "${BASE_URL}/api/rules"
   curl -s "${BASE_URL}/api/triggers"
   ```
2. Display a structured summary table:
   | Rule ID | Name | Category | Engine | Bound Paths / Trigger | Status |
   | :--- | :--- | :--- | :--- | :--- | :--- |
3. **Simulation**: When given a file path (e.g., `apps/server/src/auth.ts`), test it against active glob triggers:
   - Identify matching `paths` and verify that `pathsIgnore` does not exclude it.
   - List exactly which rules will fire for that file change.

---

## Workflow 3: Rule Fine-Tuning & Noise Reduction

Use when the user asks: *"The review gave too many style comments, fix the rule"*, *"Update rule X to ignore test files"*, or *"Add a check for SQL injection to the API rule"*.

### Execution Steps
1. Fetch the target rule definition:
   ```bash
   curl -s "${BASE_URL}/api/rules/<ruleId>"
   ```
2. Analyze developer feedback:
   - **False Positive / Noise**: Add specific negative constraints into `=== 4. NOISE FILTER ===`.
   - **Missed Vulnerability**: Add concrete smells to `=== 2. KEY SMELLS ===` and verification steps to `=== 3. VERIFICATION PROTOCOL ===`.
   - **Path Misalignment**: Update `pathsIgnore` or trigger glob bounds.
3. Update the rule via API:
   ```bash
   curl -s -X PUT "${BASE_URL}/api/rules/<ruleId>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "...",
       "instructions": "<updated 4-block content>",
       "enabled": true
     }'
   ```
4. Provide a clear diff of what was changed in the instructions and explain how it prevents the reported issue.

---

## Communication Guidelines

- **Language Matching**: Respond in Japanese if prompted in Japanese; otherwise use English.
- **Markdown Links**: Format all URLs as `[link text](URL)`. Never leave raw URLs.
- **Precision**: Focus instructions strictly on domain invariants, preventing hallucinated or noisy comments.
