# Development & Contributor Guide

This document defines the development environment setup, deterministic command workflows, testing standards, and binary compilation procedures for contributors to `kuramori`.

---

## 1. Development Prerequisites

- **Deno**: Version 2.0 or higher is required.
- **Git**: Required for repository operations and worktree management.
- **GitHub CLI (`gh`)**: Recommended for VCS testing and token management.

---

## 2. Monorepo Layout

`kuramori` is organized as a Deno 2 monorepo workspace:

| Target | Path | Responsibility |
| :--- | :--- | :--- |
| **`apps/cli`** | [`apps/cli/`](../apps/cli) | Unified CLI application built with Cliffy framework |
| **`apps/server`** | [`apps/server/`](../apps/server) | Hono REST API, SQLite database (Drizzle ORM), poller & review queue |
| **`apps/web`** | [`apps/web/`](../apps/web) | Web dashboard (Vite, React, Tailwind CSS, Lucide) |
| **`packages/core`** | [`packages/core/`](../packages/core) | Shared domain entities, boundary contracts, schemas, and VCS abstractions |
| **`packages/runner`** | [`packages/runner/`](../packages/runner) | Review execution pipeline, worktree manager, D2 compiler, and AI engine harnesses |
| **`packages/i18n`** | [`packages/i18n/`](../packages/i18n) | UI localization dictionaries and translation utilities |

---

## 3. Deterministic Command System

Contributors should use the deterministic `deno task` commands to verify and build changes.

| Command | Purpose |
| :--- | :--- |
| `deno task check` | TypeScript type-check across all packages and apps |
| `deno task lint` | Static analysis, architectural boundary enforcement, and schema doc sync |
| `deno task test` | Execute the entire automated test suite |
| `deno task test:e2e` | Execute server end-to-end integration tests |
| `deno task build:web` | Production build of web frontend assets (`apps/web/dist`) |
| `deno task build:doc` | Regenerate database schema documentation |
| `deno task build` | Full build of web assets and documentation |
| `deno task dev:server` | Start backend server with file watch mode (`http://127.0.0.1:3456`) |
| `deno task dev:web` | Start frontend Vite HMR development server |
| `deno task cli [args]` | Run unified CLI directly from TypeScript source |
| `deno task runner [args]`| Run standalone review runner directly from TypeScript source |
| `deno task compile` | Compile unified standalone binary (`bin/kuramori`) |
| `deno task compile:runner` | Compile standalone review runner binary (`bin/kuramori-runner`) |

---

## 4. Local Development Workflows

### 4.1 Running the Full Stack Locally

1. **Build frontend assets or run in watch mode**:
   ```bash
   # Terminal 1: Frontend HMR
   deno task dev:web

   # Terminal 2: Backend server with watch mode
   deno task dev:server
   ```
2. Open [`http://127.0.0.1:3456`](http://127.0.0.1:3456) in your browser.

### 4.2 Running the CLI Directly

You can invoke the CLI from source without compiling:

```bash
# Display CLI help
deno task cli --help

# Run system diagnostic
deno task cli doctor

# Execute single review
deno task cli run --repo owner/repo --pr 123
```

---

## 5. Architectural Boundary Constraints

All contributors must respect the architectural constraints enforced by [`tools/lint-rules/boundaries.ts`](../tools/lint-rules/boundaries.ts):

1. **`packages` ➔ `apps` is strictly forbidden**: Reusable packages (`packages/*`) must never import from application entry points (`apps/*`).
2. **`core` outward imports are forbidden**: Domain package (`packages/core`) must remain independent and never import from sibling outer packages (`runner`).
3. **`i18n` remains self-contained**: Localization dictionary package must not depend on application or outer packages.

Run `deno task lint` before submitting changes to verify architectural boundaries.

---

## 6. Standalone Binary Compilation

To compile standalone executable binaries with bundled Web UI assets:

```bash
# 1. Build frontend assets first
deno task build:web

# 2. Compile standalone binary
deno task compile

# 3. Test compiled binary
./bin/kuramori --help
```

---

## 7. Release Strategy & Supply Chain Security

`kuramori` adheres to modern software supply chain security standards while keeping release orchestration lightweight, deterministic, and free of extraneous configuration files.

### 7.1 Core Security Principles

1. **No Manual Tag Pushing**:
   - Pushing tags directly (`git push origin v1.0.0`) is strictly prohibited. Manual tags bypass branch protection rules and allow unverified commits to be released.
2. **Ephemeral CI-Only Builds**:
   - Release binaries are built exclusively within GitHub Actions environments, preventing local machine contamination.
3. **Branch Protection Enforcement**:
   - Only commits that have successfully passed all automated tests, linting, type-checks, and compilation checks on protected branches (`main`) can ever be released.
4. **Cryptographic Provenance (SLSA Level 3)**:
   - All release archives are cryptographically attested and signed via GitHub Artifact Attestations using Sigstore and GitHub OIDC tokens.

### 7.2 Release Procedure (Version Bump on Merge)

Releases are triggered automatically when a version bump is merged into `main`:

1. **Bump Version in Pull Request**:
   - Create a PR updating the `"version"` field in both [`deno.json`](../deno.json) and [`apps/cli/deno.json`](../apps/cli/deno.json) (e.g. `"0.1.0"` ➔ `"0.2.0"`).
   - CI automatically verifies that root and CLI versions are synchronized.
2. **Review & Merge**:
   - Once all CI checks pass, merge the PR into `main`.
3. **Automated Release Execution**:
   - The `.github/workflows/release.yaml` workflow triggers upon push to `main`.
   - It checks whether the Git tag corresponding to the current version (`v${VERSION}`) already exists.
   - If the tag does not exist:
     - Deno compiles standalone executables with bundled Web UI for 5 cross-platform targets:
       - Linux x86_64 (`kuramori-vX.Y.Z-linux-amd64.tar.gz`)
       - Linux ARM64 (`kuramori-vX.Y.Z-linux-arm64.tar.gz`)
       - macOS Intel (`kuramori-vX.Y.Z-darwin-amd64.tar.gz`)
       - macOS Apple Silicon (`kuramori-vX.Y.Z-darwin-arm64.tar.gz`)
       - Windows x86_64 (`kuramori-vX.Y.Z-windows-amd64.zip`)
     - Generates SHA-256 checksums (`checksums.txt`).
     - Cryptographically signs all artifacts with `actions/attest-build-provenance`.
     - Automatically creates the Git tag and GitHub Release with auto-generated release notes derived from merged PRs.
   - If the version has not been bumped, the release job exits immediately without action.

### 7.3 Verifying Binary Provenance

End users and enterprise security teams can independently verify that a downloaded binary was built by GitHub Actions from the official `kuramori` repository:

```bash
gh attestation verify kuramori-v0.1.0-linux-amd64.tar.gz --owner <owner>
```
