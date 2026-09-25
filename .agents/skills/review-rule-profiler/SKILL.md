---
name: review-rule-profiler
description: >-
  Deeply profile a target repository's codebase, architecture, and directory structure,
  then generate optimized, path-specific review rules (instructions) and trigger configurations (trigger_json)
  for review-base. Use whenever the user wants to create, customize, or improve review rules and triggers
  for a repository, or needs to establish automated review guidelines tailored to a project's stack.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Review Rule Profiler

## Overview

This skill autonomously profiles a target repository's codebase (languages, runtimes, frameworks, directory layout, configurations, and existing conventions) and generates **path-specific review rules (`ReviewRule`)** and **binding triggers (`ReviewTrigger`)** optimized for **review-base**.

Following market best practices (inspired by CodeRabbit's `path_instructions`, Qodo/PR-Agent, and Anthropic's agent skills), it avoids vague one-sentence prompts. Instead, it generates structured, multi-dimensional instructions tailored to specific file paths (`glob`), complete with key failure modes, active verification protocols, and strict noise filters.

### Reference Documents
- Domain failure patterns and smells: [references/categories.md](references/categories.md)
- Machine-readable output schema: [references/output-schema.json](references/output-schema.json)

---

## Workflow (5 Phases)

```
[Phase 1: Detect Tech Stack & Directory Architecture]
                         ↓
[Phase 2: Extract Existing Invariants & Conventions]
                         ↓
[Phase 3: Map Path-Based Rules & Review Categories]
                         ↓
[Phase 4: Synthesize 4-Block Structured Instructions]
                         ↓
[Phase 5: Validate Against JSON Schema & Output]
```

---

## Phase 1: Detect Tech Stack & Directory Architecture

Inspect the target repository root to identify runtime, tools, and structural boundaries:

1. **Manifests & Monorepo Structure**:
   - Check `deno.json`, `package.json`, `pnpm-workspace.yaml`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc.
   - Determine whether the repo is a monorepo (`apps/*`, `packages/*`) or a single package.
2. **Frameworks & Persistence Layer**:
   - Web / API: Hono, Express, Fastify, Next.js, NestJS, Gin, FastAPI, etc.
   - ORM / Database: Drizzle, Prisma, TypeORM, SQLAlchemy, SQLx, etc.
   - Frontend UI: React, Vue, Svelte, Tailwind CSS, etc.
3. **Static Analysis & Type Rigor**:
   - Inspect `tsconfig.json` (e.g., `strict`, `noUncheckedIndexedAccess`).
   - Inspect linters/formatters (ESLint, Biome, Deno lint, Prettier).
   - **Crucial**: Note issues that are already caught deterministically by linters so they can be filtered out of AI review instructions.
4. **Directory Boundary Mapping**:
   - Walk top-level directories to map responsibilities (e.g., API/routes, usecases/services, domain, db/migrations, web/components, shared libraries).

---

## Phase 2: Extract Existing Invariants & Conventions

Search existing project documentation and configuration files for team-specific constraints:

1. **Documentation Search**:
   - `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/**/*.md`
   - `.agents/rules/*.md`, `GEMINI.md`, `AGENTS.md`, `.cursorrules`
2. **Target Constraints to Extract**:
   - Layered dependency directions (e.g., Clean Architecture, Onion, Hexagonal).
   - Error handling idioms (e.g., custom error classes, Result types, early returns).
   - Logging conventions (e.g., mandatory structured logging, banning template literals inside log messages).
   - Type-safety philosophy (e.g., banning `!` assertions or unsafe `as` casts, explicit `undefined` checks).
   - Documentation comments scope (documenting only symbol responsibility, banning external caller/future remarks).

---

## Phase 3: Map Path-Based Rules & Review Categories

Cross-reference the discovered directory structure with [references/categories.md](references/categories.md) to select 3–5 specialized rules for the repository.

### Rule & Path Design Guidelines
- **Precise Glob Patterns**:
  - `paths`: Target directories containing production logic (e.g., `apps/server/src/**`).
  - `pathsIgnore`: Exclude non-production code (e.g., `**/*.test.ts`, `**/fixtures/**`, `**/generated/**`, `**/dist/**`).
- **Domain Separation of Concerns**:
  - API / Controllers / Routes → `security` (Auth, IDOR, input validation, secret leaks).
  - DB / Repositories / Schema → `integrity` (Transactions, migration compatibility, N+1 queries).
  - Domain / Core / Services → `correctness` (Business invariants, caller regression, edge cases).
  - Cross-cutting / Architecture → `architecture` (Layer boundary compliance, cycle prevention, conventions).
  - Frontend / Web UI → `frontend` (Re-renders, race conditions, accessibility).

---

## Phase 4: Synthesize 4-Block Structured Instructions

For every rule, format the `instructions` field into the **standard 4-block layout**. Write the content in Japanese if the user communicates in Japanese or the project's rules are in Japanese; otherwise use English.

```markdown
=== 1. SCOPE & OBJECTIVE ===
Define the responsibility of this rule and the quality goals it safeguards in 1-2 concise sentences.

=== 2. KEY SMELLS & FAILURE MODES ===
Bullet points highlighting anti-patterns and failure modes specific to this stack and directory:
- [Smell 1]: Specific code pattern, vulnerability, or invariant breach.
- [Smell 2]: Specific edge case or concurrency pitfall.
- [Smell 3]: Specific logging, transaction, or typing violation.

=== 3. VERIFICATION PROTOCOL ===
Actionable investigation steps the reviewer MUST perform inside the worktree beyond the diff:
1. Search caller sites (callers) via grep to verify that signature or contract changes do not break existing call sites.
2. Inspect related interfaces, type definitions, and schema validators.
3. Check for boundary value tests (0, empty arrays, null/undefined, error paths).

=== 4. NOISE FILTER (STRICTLY PROHIBITED) ===
Explicitly forbid review feedback that causes fatigue:
- Do NOT comment on formatting, whitespace, or stylistic nits automatically handled by linters/formatters.
- Do NOT challenge decisions already discussed or intentional in the PR description / existing comments.
- Do NOT provide abstract complaints without concrete suggestion snippets.
```

---

## Phase 5: Validate Against JSON Schema & Output

Before presenting the result, strictly validate the generated payload against [references/output-schema.json](references/output-schema.json).

### Validation Checklist
- [ ] Root object adheres to [references/output-schema.json](references/output-schema.json).
- [ ] Each rule `id` matches `^rule-[a-z0-9_-]+$` (e.g., `rule-luup-api-security`).
- [ ] Each trigger `id` matches `^trigger-[a-z0-9_-]+$` (e.g., `trigger-luup-api`).
- [ ] `instructions` contains all 4 standard blocks (`SCOPE`, `KEY SMELLS`, `VERIFICATION PROTOCOL`, `NOISE FILTER`).
- [ ] `triggerJson` is valid JSON and mirrors the trigger configuration.
- [ ] `pathsIgnore` properly excludes test and fixture patterns.

### Output Presentation
Present the final valid JSON to the user, and explain how to apply it:
1. **Web UI**: Paste into review-base Settings (Rules / Triggers).
2. **REST API**:
   ```bash
   curl -X POST http://localhost:3456/api/rules -H "Content-Type: application/json" -d '<RULE_JSON>'
   curl -X POST http://localhost:3456/api/triggers -H "Content-Type: application/json" -d '<TRIGGER_JSON>'
   ```
