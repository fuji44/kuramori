# kuramori-rules

A skill for AI coding agents (Antigravity, Claude Code, Cursor) that designs, generates, inspects, and fine-tunes path-specific code review rules and triggers for [kuramori](https://github.com/fuji44/kuramori).

---

## Overview

`kuramori-rules` equips agents with workflows to manage the full lifecycle of review rules:
- **Repository Profiling**: Scans manifests, architecture boundaries, static typing flags, and team conventions to generate targeted rules.
- **4-Block Prompt Synthesis**: Generates industry-standard review instructions (Scope, Key Smells, Verification Protocol, Noise Filter).
- **Rule Inventory & Path Simulation**: Inspect registered rules and test which rules activate for given file paths.
- **Continuous Fine-Tuning**: Rapidly adjust rules and noise filters based on review feedback to eliminate false positives.

---

## Installation

### Using `skills` CLI (Recommended)

```bash
# Add to current project (.agents/skills/ or .claude/skills/)
npx skills add fuji44/kuramori --skill kuramori-rules

# Or install globally (~/.gemini/config/skills/ or ~/.claude/skills/)
npx skills add fuji44/kuramori --skill kuramori-rules -g
```

### Manual Installation

Copy or symlink this directory into your agent skills path:
* **Antigravity (Workspace)**: `.agents/skills/kuramori-rules`
* **Antigravity (Global)**: `~/.gemini/config/skills/kuramori-rules`
* **Claude Code (Workspace)**: `.claude/skills/kuramori-rules`
* **Claude Code (Global)**: `~/.claude/skills/kuramori-rules`

---

## Example Prompts

```text
"Create review rules for this repository"
"Profile github.com/my-org/my-service and set up kuramori rules"
"List all registered review rules in kuramori"
"Which rules fire when modifying apps/server/src/auth.ts?"
"Tune rule-security to ignore generated migration files"
"このリポジトリ用のkuramoriルールとトリガーを作成して"
"登録されているレビュールール一覧を見せて"
```

---

## Reference Documentation

- [docs/rules-and-triggers.md](../../docs/rules-and-triggers.md) — Core concepts, glob matching, and instruction design
- [docs/api.md](../../docs/api.md) — REST API specification & OpenAPI discovery
