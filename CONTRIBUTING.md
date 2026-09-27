# Contributing to kuramori

Thank you for your interest in contributing to kuramori (蔵守)! We welcome contributions, bug reports, feature requests, and documentation improvements.

---

## 1. Prerequisites

- **[Deno](https://deno.com)**: Version 2.0 or higher is required.
- **Git**: 2.30+ for worktree management.
- **Node.js/npm**: Optional, only if running local dev helpers directly without Deno.

Verify your Deno installation:

```bash
deno --version
```

---

## 2. Monorepo Architecture & Dependency Boundaries

`kuramori` is organized as a Deno 2 monorepo with strict architectural boundaries:

```
├── apps/
│   ├── server/           # Backend API (Hono, SQLite / Drizzle ORM, Queue)
│   └── web/              # Frontend Dashboard (Vite, React, Tailwind CSS)
└── packages/
    ├── core/             # Contracts, domain models, storage interfaces
    ├── i18n/             # Internationalization (EN / JA)
    └── runner/           # Git worktree manager, AI CLI engines, D2 compiler
```

### Absolute Constraints

1. **`packages` ➔ `apps` imports are strictly forbidden**: Reusable packages (`core`, `runner`, `i18n`) must never depend on executable applications (`server`, `web`).
2. **Abstract Interface Contracts**: Interactions with external services (VCS providers, review engines, storage) must implement interfaces defined in `@kuramori/core`.
3. **Worktree Isolation**: Reviews must never execute inside the primary git repository. Use temporary worktrees managed by `WorktreeManager`.

---

## 3. Development Workflow

### Setting up the Environment

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/kuramori.git
   cd kuramori
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```

### Running Locally

- **Backend Server** (watches changes on `http://127.0.0.1:3456`):
  ```bash
  deno task dev:server
  ```
- **Frontend Vite Dev Server**:
  ```bash
  deno task dev:web
  ```

---

## 4. Verification and Deterministic Tasks

Before submitting a Pull Request, all four deterministic tasks must pass with zero errors and zero warnings:

| Command | Purpose |
| :--- | :--- |
| `deno task check` | TypeScript type-check across all packages and apps |
| `deno task lint` | Static analysis and code quality verification |
| `deno task test` | Full test suite execution (unit and integration tests) |
| `deno task build` | Production build of the web frontend bundle |

---

## 5. Coding & Style Guidelines

- **No Non-Null Assertions**: Avoid `!` assertions. Use explicit guards such as `if (value === undefined)`.
- **Eliminate Unnecessary Type Assertions**: Avoid `as` casts where TypeScript type inference suffices.
- **Structured Logging**: Never interpolate values with template literals in logs. Pass structured context objects instead (e.g., `logger.error("failed to process", { id })`).
- **Markdown Links**: In all user-facing documentation and UI text, format URLs as `[label](url)`.
- **Conventional Commits**: Format commit messages in clean English following Conventional Commits format (e.g., `feat:`, `fix:`, `refactor:`, `test:`, `docs:`).

---

## 6. Submitting a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages in English.
3. Run verification commands:
   ```bash
   deno task check && deno task lint && deno task test && deno task build
   ```
4. Push your branch to GitHub and open a Pull Request targeting `main`.
5. Complete the provided Pull Request template.
