# kuramori (蔵守)

[![CI](https://github.com/fuji44/kuramori/actions/workflows/ci.yml/badge.svg)](https://github.com/fuji44/kuramori/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deno 2](https://img.shields.io/badge/deno-v2.0+-green.svg)](https://deno.com)

> **Pre-emptive, deep AI code reviews before humans read the PR. Visualized with architectural D2 vector diagrams and structured actionable reports.**

`kuramori` is an automated code review platform that monitors GitHub Pull Requests, launches autonomous AI agents (Claude Code, Google Antigravity, OpenAI Codex, Local LLMs) inside isolated Git worktrees, and serves structured review reports with interactive dependency diagrams and StepFlows.

---

## 🌟 Key Features

- 🚀 **Pre-emptive PR Detection**: Uses `gh` CLI credentials to automatically track and triage open review requests and your own PRs in the background.
- 🛡️ **Isolated Git Worktrees**: Spawns isolated Git worktrees to prevent dirtying your working tree, guaranteeing safe execution and automatic cleanup.
- 🎯 **Path-Specific Review Rules & Triggers**: Flexible rule definitions triggered by file paths (Glob) and PR events. Standardized 4-block prompts eliminate noise and enforce actionable suggestions.
- 🧩 **Multi-Engine Orchestration & Profile Management**:
  - **Claude Code** (`claude -p`)
  - **Google Antigravity** (`agy`)
  - **OpenAI Codex** (`codex exec`)
  - **Local LLMs** (Direct Ollama connection: `ornith-1.5:9b`, etc.)
  - **Mock Engine** (Instant simulation for testing and verification)
- 📊 **Visualized Architectural Reports (D2)**: Goes beyond superficial diffs. Automatically renders module relationships, blast radius, and StepFlows using high-fidelity D2 vector diagrams.
- 🖥️ **Interactive Web Dashboard**: GitHub-style search queries, contextual autocompletion, real-time job execution logs, and inline HTML report viewing.
- 📖 **OpenAPI 3.1 & Scalar Documentation**: Built-in interactive API reference (`/api/doc`) for dynamic self-discovery and control by AI coding agents.

---

## 🏗️ Project Structure

```text
kuramori/
├── deno.json              # Deno 2 workspace root configuration
├── AGENTS.md              # Operational constitution for AI coding agents
├── packages/
│   ├── core/              # Domain entities, schemas, and boundary interfaces
│   └── runner/            # Review execution CLI & engine harnesses
├── apps/
│   ├── server/            # Hono server, Drizzle ORM (SQLite), Poller & Queue
│   └── web/               # Vite + React + Tailwind CSS + Lucide dashboard
├── docs/                  # Project specifications & architecture (SSOT)
└── data/                  # SQLite DB (kuramori.db), review reports, job logs
```

---

## 🚀 Quickstart

### 1. Launch Service (One Command)

```bash
# Clone and setup environment
cp .env.example .env

# Build frontend web assets
deno task build

# Start backend server and background workers
deno task start
```

Open [http://127.0.0.1:3456](http://127.0.0.1:3456) in your browser.
Interactive API documentation is available at [http://127.0.0.1:3456/api/doc](http://127.0.0.1:3456/api/doc).

### 2. Development Mode

```bash
# Start backend server with file watcher
deno task dev:server

# Start frontend Vite HMR development server
deno task dev:web
```

### 3. Standalone Review Runner (CLI)

```bash
# Direct task execution
deno task runner --repo owner/repo --pr 1234

# Or build single binary executable
deno task --cwd packages/runner compile
./packages/runner/bin/kuramori --repo owner/repo --pr 1234
```

### 4. Quality Verification

```bash
# TypeScript type check
deno task check

# Static analysis and linting
deno task lint

# Execute full test suite
deno task test

# Build production bundle
deno task build
```

---

## 📚 Documentation Index

All architectural guidelines and domain specifications are cataloged in [docs/README.md](docs/README.md).

- **[Core Concepts & Background](docs/concept.md)**: Product philosophy, problems solved, and pre-emptive review model.
- **[Architecture Design](docs/architecture.md)**: Monorepo boundaries, 4-tier layer responsibilities, and boundary contracts.
- **[Data Model](docs/data-model.md)**: SQLite database schema, entity relationships, and job lifecycle.
- **[AI Engine Specifications](docs/engines.md)**: Harness execution for Claude Code, Antigravity, Codex, and local LLMs.
- **[Rules & Triggers Guide](docs/rules-and-triggers.md)**: Glob path matching, 4-block instructions, and noise filtering.
- **[REST API Reference](docs/api.md)**: Endpoint catalog, OpenAPI 3.1 specification, and Scalar docs.
- **[Operations & Troubleshooting](docs/operations.md)**: Service management, log inspection, and worktree cleanup.

---

## 🤝 Community & Contributing

- **[Contributing Guide](CONTRIBUTING.md)**: Setup, architectural rules, coding standards, and PR workflows.
- **[Code of Conduct](CODE_OF_CONDUCT.md)**: Contributor Covenant v2.1.
- **[Security Policy](SECURITY.md)**: Responsible vulnerability disclosure.

---

## 📄 License

kuramori is licensed under the [MIT License](LICENSE).
Third-party component notices and licenses are documented in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
