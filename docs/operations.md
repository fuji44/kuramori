# Operations & Troubleshooting Guide

This document defines operational commands, directory layouts, and diagnostic procedures for maintaining and troubleshooting `kuramori`.

---

## 1. Service Management Commands

### Start Server and Background Workers
```bash
# Build frontend web assets
deno task build

# Start server, background poller, and job queue
deno task start
```
- Default port: `3456` (override via `PORT` environment variable)
- Default database: `data/kuramori.db` (override via `DATABASE_URL` environment variable)

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
     curl -s "http://localhost:3456/api/jobs/<jobId>/log"
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
   curl -s -X POST "http://localhost:3456/api/pulls/refresh"
   ```
3. **Verify matching criteria**:
   - Check `gh pr list --search "review-requested:@me"` and `gh pr list --author "@me"`. Only matching PRs are tracked.

### 3.4 Database Reset (Development)
To reset database state completely:
```bash
# Stop server, then:
rm -f data/kuramori.db data/kuramori.db-shm data/kuramori.db-wal
rm -rf data/reports/* data/logs/*

# Restarting will auto-seed initial tables and presets
deno task start
```
