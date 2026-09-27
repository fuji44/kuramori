# Operations & Troubleshooting Guide

This document defines operational commands, directory layouts, and diagnostic procedures for maintaining and troubleshooting `kuramori`.

---

## 1. Service Management & Verification Commands

### Core Development & Verification
```bash
# TypeScript type check across monorepo
deno task check

# Static analysis and linting
deno task lint

# Execute full test suite
deno task test

# Start backend development server with file watching
deno task dev:server

# Start frontend Vite HMR development server
deno task dev:web
```

### Production Build & Execution
```bash
# Build frontend web assets (Vite)
deno task build

# Start production server, background poller, and job queue
deno task start
```

### Standalone Review Execution (CLI)
```bash
deno task runner --repo <owner/repo> --pr <number>
```

### Configuration Environment Variables
| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOST` | `127.0.0.1` | HTTP listening host for server (loopback by default) |
| `PORT` | `3456` | HTTP listening port for server |
| `DATABASE_URL` | `file:data/kuramori.db` | SQLite database file location |
| `REPORTS_DIR` | `./data/reports` | Directory where HTML and JSON review reports are stored |
| `AUTO_QUEUE` | `true` | Automatically enqueue review jobs for newly detected PRs |
| `AUTO_QUEUE_INCLUDE_OWN` | `false` | Automatically enqueue review jobs for own PRs (`author: @me`) |
| `REVIEW_ENGINE` | `antigravity` | Default fallback engine type if not configured in settings |
| `AGY_BIN` | `agy` | Custom binary path for Google Antigravity CLI |
| `CLAUDE_BIN` | `claude` | Custom binary path for Anthropic Claude Code CLI |
| `CODEX_BIN` | `codex` | Custom binary path for OpenAI Codex CLI |

### Background Daemon Execution
```bash
nohup deno task start > data/kuramori-server.log 2>&1 &
```

---

## 2. Data Directory Layout

All stateful data is isolated under the `data/` directory:

```text
kuramori/
├── data/
│   ├── kuramori.db           # SQLite database (PR metadata, rules, jobs, settings)
│   ├── reports/              # Generated review reports (JSON / HTML)
│   ├── logs/                 # Raw job execution logs (<jobId>.log)
│   └── cache/                # Local cache of bare Git repositories
└── .worktrees/               # Temporary Git worktrees for review runs
```

---

## 3. Troubleshooting

### 3.1 Review Job Enters `failed` State
1. **Inspect Job Log**:
   - Check the logs via web dashboard or directly from terminal:
     ```bash
     cat data/logs/<jobId>.log
     # Or via REST API
     curl -s "http://127.0.0.1:3456/api/jobs/<jobId>/log"
     ```
2. **Common Failure Modes**:
   - **CLI Auth Expiration**: `gh auth status` or AI engine tokens expired. Re-authenticate.
   - **Timeout**: Large diffs may hit the default 15-minute timeout. Increase `timeoutMs` or set `--max-turns`.
   - **Gatekeeper Schema Rejection**: Model emitted output that broke the Zod schema. Switch to a more capable model (e.g., `sonnet-3-7`).

### 3.2 Orphaned Worktree Cleanup
If unexpected process termination leaves temporary worktrees behind:
```bash
# List active worktrees
git worktree list

# Remove orphaned directories
rm -rf .worktrees/*

# Prune git worktree references
git worktree prune
```

### 3.3 Pull Requests Not Detected
1. **Verify GitHub CLI authentication**:
   ```bash
   gh auth status
   ```
2. **Trigger manual immediate polling**:
   ```bash
   curl -s -X POST "http://127.0.0.1:3456/api/pulls/refresh"
   ```
3. **Verify matching criteria**:
   - Check `gh search prs --review-requested=@me` and `gh search prs --author=@me`. Only matching open PRs across accessible repositories are tracked.

### 3.4 Database Reset (Development)
To reset database state completely:
```bash
# Stop server, then:
rm -f data/kuramori.db data/kuramori.db-shm data/kuramori.db-wal
rm -rf data/reports/* data/logs/*

# Restarting will auto-seed initial tables and presets
deno task start
```
