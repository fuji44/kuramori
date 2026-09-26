# kuramori-review

An operational review skill for AI coding agents (Antigravity, Claude Code, Cursor) that triages PRs, triggers automated code reviews, explores structured findings and D2 diagrams, applies suggested fixes, and troubleshoots review jobs in [kuramori](https://github.com/fuji44/kuramori).

---

## Overview

`kuramori-review` equips agents to participate actively in the code review lifecycle:
- **PR Triage**: Inspect tracked pull requests, active runs, and review verdicts.
- **Review Triggering**: Run or re-run reviews with specific rules or engines (Claude Code, Antigravity, Codex, Local LLMs).
- **Deep Dive Reports**: Explore P1/P2 issues, proposed diffs, D2 architecture diagrams, and StepFlow traces.
- **Interactive Fix & Verification**: Directly apply code suggestions to files and verify them by running test suites.
- **Self-Healing & Troubleshooting**: Diagnose failed jobs from raw logs, resolve orphaned worktrees, and verify engine connectivity.

---

## Installation

### Using `skills` CLI (Recommended)

```bash
# Add to current project (.agents/skills/ or .claude/skills/)
npx skills add fuji44/kuramori --skill kuramori-review

# Or install globally (~/.gemini/config/skills/ or ~/.claude/skills/)
npx skills add fuji44/kuramori --skill kuramori-review -g
```

### Manual Installation

Copy or symlink this directory into your agent skills path:
* **Antigravity (Workspace)**: `.agents/skills/kuramori-review`
* **Antigravity (Global)**: `~/.gemini/config/skills/kuramori-review`
* **Claude Code (Workspace)**: `.claude/skills/kuramori-review`
* **Claude Code (Global)**: `~/.claude/skills/kuramori-review`

---

## Example Prompts

```text
"Check the status of PRs waiting for review"
"Run a review on PR #42 using Claude Code"
"Show me the critical findings and architecture diagram for PR #10"
"Apply the fix suggested in review report rep-123 and run tests"
"Why did the review job fail? Show the logs and fix it"
"PR #12 のレビューを実行して"
"レビューで指摘されたP1の問題を修正して"
```

---

## Reference Documentation

- [docs/api.md](../../docs/api.md) — REST API specification & OpenAPI discovery
- [docs/operations.md](../../docs/operations.md) — Service lifecycle, worktree management, troubleshooting
- [docs/engines.md](../../docs/engines.md) — AI engine capabilities and configuration
