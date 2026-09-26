# Local LLM Integration Guide

This document describes how to configure and run local open-source models (such as `ornith-1.5:9b`) via Ollama or vLLM on local GPUs (e.g., RTX 5080 with 16GB VRAM) as an autonomous review engine for `kuramori`.

---

## 1. Architecture Overview

```mermaid
flowchart LR
    LocalModel["Local LLM<br>(ornith-1.5:9b / 6.6GB)"]
    Ollama["Ollama Server<br>(http://localhost:11434)"]
    Runner["kuramori runner<br>(Claude Code Harness)"]

    LocalModel --- Ollama
    Ollama -->|Native Anthropic Messages API (/v1/messages)| Runner
```

- **Harness Layer**: Reuses the Claude Code harness for autonomous worktree traversal and Gatekeeper verification.
- **Direct Connection (No Proxy)**: Ollama natively supports the Anthropic Messages API (`/v1/messages`), connecting directly via `ANTHROPIC_BASE_URL=http://localhost:11434`.
- **Recommended Model**: **`ornith-1.5:9b`** (6.6GB VRAM footprint, 256K context window, agentic tool use optimization).

---

## 2. Setup Procedure

### Step 1: Pull and Run Model in Ollama
```bash
ollama pull ornith-1.5:9b
```

### Step 2: Verify Connectivity
```bash
deno task verify:local-llm --url http://localhost:11434 --model ornith-1.5:9b
```

---

## 3. Running Reviews

### Standalone CLI Execution
Pass `ANTHROPIC_BASE_URL` as an environment variable to point Claude Code to the local Ollama instance:
```bash
ANTHROPIC_BASE_URL=http://localhost:11434 deno task runner \
  --repo <owner/repo> \
  --pr <number> \
  --engine claude-code \
  --model ornith-1.5:9b
```

With max-turns limit:
```bash
ANTHROPIC_BASE_URL=http://localhost:11434 deno task runner \
  --repo <owner/repo> \
  --pr <number> \
  --engine claude-code \
  --model ornith-1.5:9b \
  --max-turns 15
```

### Web UI Configuration
1. Open [http://localhost:3456](http://localhost:3456) in your browser.
2. Navigate to **Settings** ➔ **AI Execution Profiles**.
3. Create or edit an Engine Profile using the **Claude Code** engine type.
4. Set **Model** to `ornith-1.5:9b`.
5. Under **Custom Environment Variables**, add:
   - Key: `ANTHROPIC_BASE_URL`
   - Value: `http://localhost:11434`
6. Save the profile and assign it to your review rules or select it when triggering reviews from the Pull Request dashboard.
