# kuramori

[![CI](https://github.com/fuji44/kuramori/actions/workflows/ci.yml/badge.svg)](https://github.com/fuji44/kuramori/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deno 2](https://img.shields.io/badge/deno-v2.0+-green.svg)](https://deno.com)

> **Pre-emptive, deep AI code reviews before humans read the PR. Visualized with architectural D2 vector diagrams and structured actionable reports.**

`kuramori` is an automated code review platform and CLI that monitors GitHub Pull Requests, launches autonomous AI agents (Claude Code, Google Antigravity, OpenAI Codex) inside isolated Git worktrees, and serves structured review reports with interactive dependency diagrams and StepFlows.

---

## 🌟 Key Features

- 🚀 **Pre-emptive PR Detection**: Uses `gh` CLI credentials to automatically track and triage open review requests and your own PRs in the background.
- 🛡️ **Isolated Git Worktrees**: Spawns isolated Git worktrees to prevent dirtying your working tree, guaranteeing safe execution and automatic cleanup.
- 🎯 **Path-Specific Review Rules & Triggers**: Flexible rule definitions triggered by file paths (Glob) and PR events. Standardized 4-block prompts eliminate noise and enforce actionable suggestions.
- 🧩 **Multi-Engine Orchestration**: Supports Claude Code (`claude -p`), Google Antigravity (`agy`), and OpenAI Codex (`codex exec`).
- 📊 **Visualized Architectural Reports (D2)**: Automatically renders module relationships, blast radius, and StepFlows using high-fidelity D2 vector diagrams.
- 🖥️ **Interactive Web Dashboard**: Standalone dashboard with GitHub-style search queries, contextual autocompletion, real-time logs, and inline report inspection.

---

## 📦 Installation & Uninstallation

### Installation

#### Option 1: Standalone Binary (Recommended)

Download the pre-compiled standalone binary for your platform from GitHub Releases, make it executable, and move it to your `PATH`:

```bash
# Example for Linux x86_64
curl -fsSL https://github.com/fuji44/kuramori/releases/latest/download/kuramori-linux-x86_64 -o /usr/local/bin/kuramori
chmod +x /usr/local/bin/kuramori
```

#### Option 2: Build from Source

If you have [Deno 2+](https://deno.com) installed:

```bash
git clone https://github.com/fuji44/kuramori.git
cd kuramori

# Build web assets and compile standalone binary
deno task build:web
deno task compile

# Binary is generated at bin/kuramori
./bin/kuramori --help
```

### Uninstallation

To remove `kuramori` from your system:

```bash
# 1. Remove the standalone binary
rm -f /usr/local/bin/kuramori

# 2. (Optional) Remove storage and cache directories (XDG compliant)
rm -rf "$(kuramori paths --data)" "$(kuramori paths --cache)"
```

---

## 🚀 Quickstart

### 1. Verify Prerequisites

Run the diagnostic doctor to verify that required tools (`git`, `gh`, AI CLI tools) and authentication tokens are properly detected:

```bash
kuramori doctor
```

### 2. Start the Server & Web Dashboard

Launch the background review queue, GitHub poller, and interactive web dashboard:

```bash
kuramori serve
```

Open [`http://127.0.0.1:3456`](http://127.0.0.1:3456) in your browser.
Interactive OpenAPI documentation is available at [`http://127.0.0.1:3456/api/doc`](http://127.0.0.1:3456/api/doc).

### 3. Run a Single Pull Request Review (CLI)

Run an immediate review on a specific pull request without running the server:

```bash
kuramori run --repo octocat/Hello-World --pr 42
```

---

## 📖 Command Reference

`kuramori` provides a unified command line interface. For detailed options, flags, and default values, refer directly to the built-in `--help`:

```bash
# Global help and available subcommands
kuramori --help

# Subcommand-specific options and descriptions
kuramori run --help
kuramori serve --help
kuramori doctor --help
```

| Subcommand | Description |
| :--- | :--- |
| **`kuramori run`** | Execute automated review for a pull request (`--repo`, `--pr`, `--engine`, `--model`, etc.) |
| **`kuramori serve`** | Start background review queue, GitHub poller, and web dashboard (`--port`, `--host`, `--db`) |
| **`kuramori doctor`** | Inspect system dependencies (`git`, `gh`, `d2`), AI engines, and environment variables |
| **`kuramori paths`** | Display and inspect storage, database, and cache directory paths (`--data`, `--cache`, `--json`) |
| **`kuramori completions`** | Generate shell completion scripts for Bash, Zsh, or Fish |

### Shell Completions

Enable tab-completion in your shell:

```bash
# For Zsh
source <(kuramori completions zsh)

# For Bash
source <(kuramori completions bash)

# For Fish
kuramori completions fish | source
```

---

## 🛠️ For Developers & Contributors

If you are developing or contributing to `kuramori`, refer to the developer documentation:

- **[Development Guide](docs/development.md)**: Monorepo workspace setup, deterministic `deno task` commands, testing, and compilation.
- **[Architecture Design](docs/architecture.md)**: Architectural boundaries, 4-tier layer design, and contracts.

---

## 📚 Documentation Index

Comprehensive design specifications and operational manuals are available in [docs/README.md](docs/README.md):

- **[Core Concepts & Background](docs/concept.md)**: Product philosophy and pre-emptive review model.
- **[Architecture Design](docs/architecture.md)**: Monorepo boundaries and layer responsibilities.
- **[Data Model](docs/data-model.md)**: SQLite database schema and job state lifecycle.
- **[AI Engine Specifications](docs/engines.md)**: Harness execution for Claude Code, Antigravity, and Codex.
- **[Rules & Triggers Guide](docs/rules-and-triggers.md)**: Glob path matching, 4-block prompts, and noise filtering.
- **[REST API Reference](docs/api.md)**: Endpoint catalog, OpenAPI 3.1 specification, and Scalar docs.
- **[Operations & Troubleshooting](docs/operations.md)**: Service lifecycle and log inspection.
- **[Development Guide](docs/development.md)**: Contributor workflows, testing, and deterministic commands.

---

## 📄 License

`kuramori` is licensed under the [MIT License](LICENSE).
Third-party component notices and licenses are documented in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
