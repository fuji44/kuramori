# REST API Reference Guide

This document catalogs the REST API provided by `kuramori`, interactive documentation options, and common endpoints used by AI coding agents and external clients.

---

## 1. Interactive Documentation & OpenAPI 3.1

`kuramori` provides a live OpenAPI 3.1 specification and an embedded Scalar API Reference UI:

- **Interactive Scalar UI**: [http://127.0.0.1:3456/api/doc](http://127.0.0.1:3456/api/doc)
  - Interactive browser console to test endpoints directly.
- **Machine-Readable OpenAPI Spec**: `GET /api/openapi.json`
  - Used by AI agents (`kuramori-review`, `kuramori-rules`) for runtime Dynamic API Discovery.

---

## 2. Primary Endpoints

### 2.1 Pull Requests & Triage
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/pulls` | List tracked PRs (supports `?state=open` or `?state=closed` query parameters) |
| `POST` | `/api/pulls/refresh` | Trigger manual poll from GitHub |
| `GET` | `/api/pulls/filters` | List saved search query filters |
| `POST` | `/api/pulls/filters` | Save a new search query filter |
| `PUT` | `/api/pulls/filters/:id` | Update a saved search query filter |
| `DELETE` | `/api/pulls/filters/:id` | Delete a saved search query filter |

### 2.2 Review Execution & Reports
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/pulls/:id/run` | Enqueue a review job for a PR (supports optional `ruleId`, `ruleIds`, and `engine` profile ID/type) |
| `GET` | `/api/jobs/:id/log` | Fetch raw execution logs for a review job |
| `GET` | `/api/reports/:id/data` | Fetch structured review report JSON (comments, D2 diagrams, metrics, `appliedRules`) |
| `GET` | `/api/reports/:id/html` | Fetch standalone HTML review report preview |
| `GET` | `/api/reports/:id/export.html` | Download standalone HTML review report as an attachment (`Content-Disposition: attachment`) |
| `GET` | `/api/pulls/:id/rule-results` | Fetch evaluation results for all rules applied to a PR |
| `POST` | `/api/diagram/compile` | Compile D2 source code to SVG on demand (`d2Source`, optional `layout`: `tala`, `elk`, `dagre`) |

### 2.3 Rules & Triggers Management
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/rules` | List all registered review rules |
| `POST` | `/api/rules` | Register a new review rule |
| `GET` | `/api/rules/:id` | Fetch specific review rule details |
| `PUT` | `/api/rules/:id` | Update rule instructions or options |
| `DELETE` | `/api/rules/:id` | Delete a review rule |
| `GET` | `/api/triggers` | List all repository and path triggers |
| `POST` | `/api/triggers` | Create a new trigger binding paths to rule IDs |
| `PUT` | `/api/triggers/:id` | Update a trigger |
| `DELETE` | `/api/triggers/:id` | Delete a trigger |

### 2.4 Settings & Engine Diagnostics
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/settings` | Get application settings (secrets masked) |
| `POST` | `/api/settings` | Update settings (engine profiles, concurrency limits) |
| `POST` | `/api/engines/:engine/test` | Test connectivity, version, or inference for an engine type or profile ID (supports `model`, `effort`, `customEnv`) |

---

## 3. Client Execution Examples (curl)

### Trigger Review for a Specific PR
```bash
# Auto-resolve rules based on triggers
curl -s -X POST "http://127.0.0.1:3456/api/pulls/github:owner%2Frepo%23123/run"

# Trigger with specific rule ID
curl -s -X POST "http://127.0.0.1:3456/api/pulls/github:owner%2Frepo%23123/run" \
  -H "Content-Type: application/json" \
  -d '{"ruleId": "rule-security"}'
```

### Inspect Job Logs (Troubleshooting)
```bash
curl -s "http://127.0.0.1:3456/api/jobs/job-uuid-1234/log"
```

### Verify Engine Connectivity
```bash
curl -s -X POST "http://127.0.0.1:3456/api/engines/claude-code/test" \
  -H "Content-Type: application/json" \
  -d '{"mode": "execution"}'
```
