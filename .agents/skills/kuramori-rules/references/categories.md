# Review Categories & Smells Reference

Standard review domains and key failure patterns mapped to directory layers, based on industry best practices (CodeRabbit, Qodo, Anthropic).

---

## 1. Security & Privacy (`security`)

### Target Paths
`**/routes/**`, `**/controllers/**`, `**/api/**`, `**/auth/**`, `**/middleware/**`, `**/server/**`

### Key Smells & Anti-patterns
1. **Broken Object-Level Authorization (BOLA / IDOR)**:
   - Querying resources by ID (`userId`, `tenantId`, `teamId`) from URL params or request payloads without validating against the authenticated session context.
2. **Missing Input Validation & Unsafe Casting**:
   - Endpoints lacking schema validation (Zod, Valibot, etc.) or using unsafe type assertions (`as RequestBody`) to bypass validation guards.
3. **Sensitive Data Exposure in Logs / Responses**:
   - Passwords, access tokens, API secrets, or PII leaking into log sinks or error payloads.
   - Returning internal DB error traces or raw SQL queries to API clients.
4. **Denial of Service (DoS) & Resource Limits**:
   - Unbounded payloads, file uploads without size limits, or ReDoS (Regular Expression Denial of Service).

---

## 2. Data Integrity & Schema (`integrity`)

### Target Paths
`**/db/**`, `**/migrations/**`, `**/schema/**`, `**/repositories/**`, `**/models/**`, `**/entities/**`

### Key Smells & Anti-patterns
1. **Missing Transaction Boundaries**:
   - Performing multiple database mutations or combining DB updates with external API calls without a rollback mechanism (`db.transaction`).
2. **Breaking Migration Changes**:
   - Immediate column drops, altering column types, or adding non-nullable columns without defaults, breaking zero-downtime rolling deployments.
3. **N+1 Queries & Performance Bottlenecks**:
   - Executing `await db.query()` inside loops or missing pagination limits (`LIMIT` clauses) on large collections.
4. **Connection Pool Leaks**:
   - Failing to release database clients or transactions during unhandled exception paths.

---

## 3. Domain & Functional Correctness (`correctness`)

### Target Paths
`**/domain/**`, `**/usecases/**`, `**/services/**`, `packages/core/**`

### Key Smells & Anti-patterns
1. **Business Invariant Violations**:
   - State transition flaws, incorrect price/quota arithmetic, or invalid lifecycle state representations.
2. **Caller Site Breakage (Regression)**:
   - Modifying function signatures (adding required arguments, altering return types) without verifying all existing callers across the worktree.
3. **Swallowed Exceptions & Loss of Diagnostic Context**:
   - Empty `catch (e) {}` blocks or returning `null` on failures without structured error logging.
4. **Nullability & Boundary Value Blindspots**:
   - Unsafe `!` assertions silencing compiler checks instead of explicit `if (x === undefined)` guards; unhandled empty arrays or zero values.

---

## 4. Architecture & Boundaries (`architecture`)

### Target Paths
Package roots, manifest files (`deno.json`, `package.json`), cross-cutting utilities, shared interfaces

### Key Smells & Anti-patterns
1. **Layer Boundary & Inversion of Control Violations**:
   - UI or controller layers directly accessing databases or low-level SDKs, bypassing domain services.
   - Core domain models depending on concrete framework implementations or infrastructure libraries.
2. **Circular Dependencies & Bloated God Modules**:
   - Tight coupling between modules or bloated "helper" files accumulating unrelated responsibilities.
3. **Shallow Code Reuse**:
   - Reusing existing services based purely on matching input/output types without verifying underlying sub-service side effects.
4. **Documentation Comments Boundary Violations**:
   - Documenting external callers, future plans, or implementation history in JSDoc instead of strictly defining the symbol's intrinsic contract.

---

## 5. Frontend & UI Quality (`frontend`)

### Target Paths
`apps/web/**`, `**/components/**`, `**/pages/**`, `**/views/**`, `**/hooks/**`

### Key Smells & Anti-patterns
1. **Unnecessary Re-renders & Stale Closures**:
   - Misconfigured React `useEffect` or `useCallback` dependency arrays causing infinite loops or rendering cycles.
2. **Asynchronous Race Conditions**:
   - Unhandled out-of-order API responses overwriting current user UI state on fast tab switches or text searches.
3. **Accessibility (a11y) & Semantic HTML**:
   - Using non-interactive elements (`div onClick`) without keyboard listeners, ARIA roles, or accessible labels.
