# review-rule-profiler

An autonomous profiling skill for AI coding agents (Antigravity, Claude Code, Cursor) that analyzes a target repository and automatically generates optimized, path-specific code review rules and triggers for [review-base](https://github.com/fuji44/review-base).

---

## Installation

You can install this skill globally or directly into any project using standard skill managers:

### Using `skills` CLI (Recommended)

```bash
# Add to current project (.agents/skills/ or .claude/skills/)
npx skills add fuji44/review-base --skill review-rule-profiler

# Or install globally to your user config (~/.gemini/config/skills/ or ~/.claude/skills/)
npx skills add fuji44/review-base --skill review-rule-profiler -g
```

### Manual Installation

Clone or copy this directory into your agent skills path:
* **Antigravity (Workspace)**: `.agents/skills/review-rule-profiler`
* **Antigravity (Global)**: `~/.gemini/config/skills/review-rule-profiler`
* **Claude Code (Workspace)**: `.claude/skills/review-rule-profiler`
* **Claude Code (Global)**: `~/.claude/skills/review-rule-profiler`

---

## How It Works

1. **Interactive Target Alignment (Phase 0)**:
   The agent identifies the target repository based on your intent:
   - Current working directory (CWD)
   - Specific GitHub repo (`owner/repo`)
   - Active review-requested repository (via review-base API or `gh`)
   - Custom filesystem path
2. **Deep Codebase Profiling (Phases 1-3)**:
   Scans manifests (`deno.json`, `package.json`, etc.), ORMs, frameworks, directory boundaries, and internal guidelines.
3. **Structured Rule Synthesis (Phase 4)**:
   Generates path-specific instructions containing:
   - Scope & Quality Objective
   - Key Smells & Anti-patterns (Security, Transactions, Invariants)
   - Active Verification Protocol (Callers grep, Type/Boundary checks)
   - Noise Filter (Excluding linter/style nits)
4. **Direct API Registration (Phase 5)**:
   Registers the resulting rules and triggers directly into your running review-base instance (`http://localhost:3456` or `REVIEW_BASE_URL`).

---

## Example Usage

In your agent chat (Antigravity or Claude Code), simply say:

```text
"Create review rules for this repository"
"Profile github.com/my-org/my-service and set up review-base rules"
"このリポジトリ用のreview-baseルールとトリガーを作成して"
```

The agent will confirm the target repository with you, analyze the codebase, and register the rules via review-base API.
