# kuramori Documentation

This directory serves as the **Single Source of Truth (SSOT)** for `kuramori`'s design philosophy, architecture, data model, APIs, AI engines, and operational procedures.

---

## Documentation Catalog (Navigation)

| Document | Target Audience | Primary Focus |
| :--- | :--- | :--- |
| **[concept.md](concept.md)** | All / AI Agents | Core motivation, problems solved, pre-emptive review philosophy, and value proposition |
| **[architecture.md](architecture.md)** | Developers / AI Agents | Architectural principles, monorepo boundaries, 4-tier layer responsibilities, boundary contracts |
| **[data-model.md](data-model.md)** | Developers / AI Agents | SQLite table definitions, entity relationships (ER), and job state lifecycle |
| **[engines.md](engines.md)** | Developers / AI Agents | AI engine harnesses (Claude Code, Antigravity, Codex, Mock, Local LLMs) & environment layering |
| **[rules-and-triggers.md](rules-and-triggers.md)** | Reviewers / AI Agents | Path-based triggers (Glob matching), 4-block instruction templates, and noise filters |
| **[api.md](api.md)** | Users / AI Agents | REST API catalog, OpenAPI 3.1 specification, Scalar interactive documentation, and curl examples |
| **[operations.md](operations.md)** | Operators / AI Agents | Service lifecycle, job log inspection, and temporary worktree troubleshooting |

---

## Progressive Disclosure Guidelines

Both human developers and AI agents should follow the **Progressive Disclosure** pattern by reading only the documents relevant to their current task:

- **Implementing or modifying features**: Refer to [architecture.md](architecture.md) for layer dependency rules.
- **Interacting with PRs or reviews**: Refer to [api.md](api.md) and [operations.md](operations.md).
- **Crafting or improving review rules**: Refer to [rules-and-triggers.md](rules-and-triggers.md).
- **Configuring engines or local LLMs**: Refer to [engines.md](engines.md).
- **Inspecting database schema or jobs**: Refer to [data-model.md](data-model.md).
