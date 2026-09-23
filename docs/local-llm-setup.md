# ローカルLLM（非プロバイダーAIエンジン）連携ガイド

本ドキュメントでは、RTX 5080（16GB VRAM）などのローカル GPU 環境で Ollama や vLLM 等のオープンソース推論サーバーを稼働させ、`review-base` の自律レビューエンジンとして実行するためのセットアップ手順を解説する。

---

## 1. アーキテクチャ概要

```mermaid
flowchart LR
    LocalModel["ローカルLLM<br>(ornith-1.5:9b / 6.6GB)"]
    Ollama["Ollama 推論サーバー<br>(http://localhost:11434)"]
    Runner["review-base runner<br>(Claude Code ハーネス)"]

    LocalModel --- Ollama
    Ollama -->|ネイティブ Anthropic Messages API (/v1/messages)| Runner
```

- **ハーネス層**: ワークツリー巡回や自律探索ループ、Gatekeeper 検収には既存の Claude Code ハーネスを利用。
- **推論プロキシ不要（Ollama 直結）**: Ollama は標準で **Anthropic Messages API (`/v1/messages`)** をネイティブサポートしているため、中間プロキシ（LiteLLM 等）を挟むことなく、直接 `http://localhost:11434` を `ANTHROPIC_BASE_URL` に指定して接続可能。
- **モデル**: 16GB VRAM 環境に最適な **`ornith-1.5:9b`**（6.6GB、256K コンテキスト長、自律エージェント特化モデル）を採用。

---

## 2. セットアップ手順

### ステップ 1: Ollama でモデルを pull & 起動

Ollama が稼働している環境でモデルをダウンロードする：

```bash
ollama pull ornith-1.5:9b
```

> [!TIP]
> 14B クラスの別モデルを試す場合は `ollama pull qwen2.5-coder:14b` または `ollama pull qwen3:14b` を利用可能。

### ステップ 2: 接続検証スクリプトの実行

`review-base` に同梱されている検証タスクを実行し、Ollama との疎通（Anthropic Messages API）を確認する：

```bash
deno task verify:local-llm --url http://localhost:11434 --model ornith-1.5:9b
```

正常に接続されると、テストプロンプトへの応答と実行コマンド例が出力される。

> [!NOTE]
> **OpenAI 互換専用サーバー（vLLM や llama-server 等）を使う場合のみ**:
> Anthropic API を持たない推論サーバーを中継する場合は、同梱の `scripts/litellm_config.yaml` を使い `uvx litellm --config scripts/litellm_config.yaml --port 4000` でプロキシを起動して接続可能。

正常に接続されると、テストプロンプトへの応答と実行コマンド例が出力される。

---

## 3. レビューの実行

### CLI からの単体実行

`review-runner` に `--engine claude-code` と `--api-base-url`、`--model` を指定して実行する：

```bash
deno task runner \
  --repo <owner/repo> \
  --pr <PR番号> \
  --engine claude-code \
  --model ornith-1.5:9b \
  --api-base-url http://localhost:11434
```

VRAM の安全制限としてターン数を制限したい場合は `--max-turns` オプションを追加可能：

```bash
deno task runner \
  --repo <owner/repo> \
  --pr <PR番号> \
  --engine claude-code \
  --model ornith-1.5:9b \
  --api-base-url http://localhost:11434 \
  --max-turns 15
```

### Web UI / バックエンド設定からの利用

1. ブラウザで [http://localhost:3456](http://localhost:3456) を開く。
2. **設定** ➔ **AI エンジン設定** ➔ **Claude Code** を開く。
3. 以下の項目を設定：
   - **Model**: `ornith-1.5:9b`
   - **API Base URL**: `http://localhost:11434`
4. PR 一覧から「レビュー開始」を実行すると、ローカル推論基盤による自律探索レビューが実行される。
