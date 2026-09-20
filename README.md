# review-base

レビューコストを極力下げるための自動レビュー管理 Web サービス ＆ ランナー基盤（MVP）。

## 主な特徴

- 🚀 **ゼロコンフィグ自動検出**: ローカルの `gh auth token` から自分宛てレビュー依頼（`review-requested:@me`）および自作 PR（`author:@me`）を自動検出し、DB に蓄積。
- 🔄 **完全自動キューイング**: 未レビューの PR を検知すると、自動的にジョブキューへ投入（並列数制御付きで安全に順次消化）。
- 🛠️ **分離されたレビューランナー**: 一時 Git worktree を自動生成・クリーンアップし、メインの作業ツリーを汚さずに AI レビューを実行。
- 🧩 **抽象化された設計**:
  - `VCSProvider`: GitHub から開始し、GitLab や Pure Git への差し替えが可能。
  - `ReviewEngine`: 既存の Claude Code autopilot スキル呼び出しから開始し、API 直呼び出しエンジンへ段階的移行が可能。
  - `ReportStorage`: ローカルファイルシステムから S3 / オブジェクトストレージへ透過的に移行可能。
- 🖥️ **洗練された Web UI**: レビュー依頼 PR 一覧、ステータスバッジ（待機中/実行中/完了/失敗）、AI 生成レポートのアプリ内プレビュー ＆ 別タブ表示。

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
