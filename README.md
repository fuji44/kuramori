# review-base

レビューコストを極力下げるための自動レビュー管理 Web サービス ＆ ランナー基盤（MVP）。

## 主な特徴

- 🚀 **PR の自動検出**: `gh` CLI の認証を使い、自分がレビューを依頼されたオープン PR と、自分が作成したオープン PR を検出して管理。
- 🔄 **ルールベースのレビュー実行**: PR や変更ファイルに応じてルールを選び、ジョブキューで並列数を制御しながらレビューを実行。
- 🛠️ **分離されたレビューランナー**: 一時 Git worktree を作成・クリーンアップし、メインの作業ツリーから分離して AI レビューを実行。
- 🧩 **実行先をプロファイルで管理**: Claude Code、Antigravity、Codex の実行設定をプロファイルとして登録し、レビューに使う実行先を選択。
- 🖥️ **レビュー管理 Web UI**: PR のレビュー状態を確認し、生成されたレポートをアプリ内で表示。

---

## プロジェクト構成

```text
review-base/
├── deno.json              # Deno 2 ルートワークスペース定義
├── packages/
│   ├── core/              # ドメイン型・VCSProvider / ReviewEngine / ReportStorage 抽象IF
│   └── runner/            # レビュー実行 CLI (Deno/TS, 単一バイナリ化可能)
├── apps/
│   ├── server/            # Hono Web サーバー, Drizzle ORM (SQLite), Poller & ジョブキュー
│   └── web/               # Vite + React + Tailwind CSS + Lucide Icons ダッシュボード
└── data/                  # SQLite DB (review-base.db), 生成された HTML レポート
```

---

## 使い方

### 1. サービスの起動（ワンコマンド）

```bash
# Web フロントエンドのビルド
deno task build

# サーバー・常駐ワーカーの起動
deno task start
```

ブラウザで [http://localhost:3456](http://localhost:3456) を開きます。

### 2. 開発モード

```bash
# バックエンドサーバーの監視起動
deno task dev:server

# フロントエンド Vite HMR サーバーの起動
deno task dev:web
```

### 3. レビューランナーの単体実行 (CLI)

```bash
# スクリプト直接実行
deno task runner --repo owner/repo --pr 1234

# または単一バイナリのビルド
deno task --cwd packages/runner compile
./packages/runner/bin/review-runner --repo owner/repo --pr 1234
```

### 4. ローカル LLM（Ollama 等）での実行

RTX 5080（16GB VRAM）等のローカル GPU 環境で `ornith-1.5:9b` などのオープンソースモデルを用いてレビューを実行できます。
詳細は [ローカル LLM 連携ガイド](docs/local-llm-setup.md) をご覧ください。

```bash
# 推論エンドポイントの接続確認（Ollama 直結）
deno task verify:local-llm --url http://localhost:11434 --model ornith-1.5:9b

# ローカル推論サーバーを指定してレビュー実行
deno task runner --repo owner/repo --pr 1234 --engine claude-code --model ornith-1.5:9b --api-base-url http://localhost:11434
```
