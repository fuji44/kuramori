---
name: pr-review
description: |
  Pull Request の深層レビューを自律的に実行し、多角的な検証（仕様照合・潜在バグ・
  規範・セキュリティ・既存コメント重複防止）を経て意味的に統合した review.json を出力する専用スキル。
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# PR Review Dedicated Skill (深層レビュー ＆ 意味的統合)

## 概要

このスキルは、Pull Request に対して以下の工程を一気通貫で自律実行し、最終成果物として `review.json` を生成する。

1. **Pre-flight コンテキスト読み込み**: `context.json`（PR差分、Story/Issue本文、既存レビュー履歴）を把握。
2. **Worktree 自律深層探索**: 差分だけでなく、worktree 内の**呼び出し元、依存先、型定義、テスト**を Grep/Read して影響波及を検証。
3. **多角分析**:
   - **仕様整合（三角測量）**: Story / Issue の受け入れ条件（AC）と PR 実装のズレ・抜け漏れ。
   - **潜在バグ・例外**: 例外の握りつぶし、null/undefined ガード不足、非同期処理の競合。
   - **規範・保守性**: 不要な `as` アサーション、命名規則、構造化ログ。
   - **重複・蒸し返し防止**: 既存コメント履歴と照合し、解決済みの論点や人間レビュアーの意図的許容事項を再指摘しない。
4. **意味的統合 (Semantic Synthesis)**:
   - 根本原因（Root Cause）ごとに指摘を集約し、安定索引 ID（`C1`, `C2`...）を採番。
   - 厳格な判定ルールに基づいて Verdict（`APPROVE` / `COMMENT` / `REQUEST_CHANGES`）を導出。
   - React Flow 用の依存・影響ノードグラフ（`diagram`）および ステップフロー（`callFlow`）を構築。
5. **出力**: `review.json` のみを出力する（HTML 生成は行わない）。

## ⚠️ 重要制約 (MUST FOLLOW)

- **バックグラウンド待機・中間報告の禁止**:
  - バックグラウンドタスクを起動して「待機しています」といった中間報告でターンを終了してはならない。
  - テストやビルドを行う場合は同期的に完了を待つか、ファイル閲覧（Read / Grep）を優先して自律分析を完結させること。
- **ファイル書き出しの義務**:
  - 必ず `review.json` を作業ディレクトリ直下（または指定された出力パス）に直接書き出して完了すること。
  - `review.json` を書き出す前にセッションを終了してはならない。

## ステップ 1: コンテキスト読み込み (`context.json`)

作業ディレクトリ直下の `context.json` を読み込む。このファイルには以下が含まれる：
- `pr`: タイトル、説明文、作成者、ブランチ名、ベース/ヘッド SHA
- `diff`: unified diff 文字列
- `story`: 関連 Issue / Story の本文および受け入れ条件（存在する場合）
- `existingComments`: 既に PR 上に投稿されているレビューコメント・スレッド一覧

---

## ステップ 2: Worktree の自律深層探索

diff だけを見る「表層レビュー」を行ってはならない。
worktree 内の実際のファイル群を自律的に検索・閲覧して裏取りを行う：

- 変更された関数・メソッド・API の **呼び出し元（callers）** を `grep` で検索し、引数・戻り値の変更で壊れる箇所がないか検証する。
- 関連する **型定義・インターフェース** を開き、不整合がないか確認する。
- 変更箇所の **テストコード** を確認し、エッジケースのテストが欠落していないか検証する。

---

## ステップ 3: 4つのレンズによる多角評価

### レンズ 1: 仕様整合（三角測量）
- Story / Issue の受け入れ条件（AC）を満たしているか？
- 仕様にない勝手な仕様変更や、スコープ外の危険な副作用が含まれていないか？

### レンズ 2: 潜在バグ・整合性・エッジケース
- `undefined` / `null` のガード漏れ（コンパイラを黙らせるだけの `!` アサーションは NG）。
- 非同期処理のエラーハンドリング、例外の不適切な握りつぶし（空の `catch`）。
- 境界値（0、負数、空文字列、空配列）の考慮。

### レンズ 3: 設計・規範・セキュリティ
- 意図の読めないマジックナンバーや略語命名。
- ログに機密情報（トークン、パスワード、個人情報）が含まれていないか。
- 構造化ログ規約に違反していないか（template literal による埋め込みは不可）。

### レンズ 4: 既存レビューの棚卸し（重複・蒸し返し防止）
- `existingComments` にある過去のコメントと照合する。
- 「すでに他のレビュアーが指摘しており、対応進行中のもの」や「人間が議論の末に意図して現状維持としたもの」は**再指摘しない**。

---

## ステップ 4: 意味的統合 (Semantic Synthesis)

個別の細かい気づきをそのまま羅列するのではなく、統合を行う。

1. **根本原因（Root Cause）ごとの集約**:
   - 同一の設計ミスや前提の誤りに起因する複数の事象は、1つの指摘（Comment）にまとめる。
2. **安定索引 ID の採番**:
   - 各指摘に `C1`, `C2`, `C3` ... と 1 から始まる連番の ID を付与する。
3. **重要度 (Severity) の付与**:
   - **`P1` (Blocker)**: バグ、セキュリティ脆弱性、仕様不一致など直ちに修正が必要なもの。
   - **`P2` (Warning)**: 潜在リスク、エッジケース、保守性・設計の改善推奨。
   - **`P3` (Note)**: 軽微な改善、命名、スタイル提案など任意対応。
4. **合否判定 (Verdict) の導出**:
   - `REQUEST_CHANGES`: 1件でも `P1` の指摘が存在する場合。
   - `COMMENT`: `P1` はないが、`P2` や `P3` の改善提案が存在する場合。
   - `APPROVE`: 指摘がゼロ、または軽微な称賛・確認のみの場合。
5. **可視化データ構築**:
   - **`diagram` (D2 言語)**: 変更されたモジュール・依存先のコンポーネント関係図。`d2Source` として D2 構文を出力（TALA/ELK エンジンにより線の交差が自動で最小化されます）。ノードには `link: "#comment-C1"` を付与して指摘へリンク可能。
   - **`callFlow` (StepFlow)**: 処理シーケンスの各ステップ（`unchanged`, `modified`, `added`, `affected`）と該当コメントID（`C1`等）。

---

## ステップ 5: `review.json` の出力

すべての検証・統合が完了したら、作業ディレクトリ直下に **`review.json`** を書き出す。

### 出力スキーマ仕様 (Zod 4 準拠)
```json
{
  "verdict": "REQUEST_CHANGES | COMMENT | APPROVE",
  "summary": {
    "brief": {
      "problem": "直す不具合や目的を 1-2 文（日本語）",
      "approach": "どう直すかのアプローチを 1-2 文（日本語）",
      "blastRadius": "変わらないと言い切れる範囲・免責範囲（契約 / 他経路 / スキーマなど）"
    },
    "changedCode": "変更された中核ロジックの要約（日本語）",
    "reachPaths": ["影響を受けるファイルやディレクトリのパス一覧"],
    "mechanism": {
      "why": ["不具合が成立していた因果連鎖 1", "因果連鎖 2"],
      "conditions": ["変更が発動する AND 条件"]
    }
  },
  "comments": [
    {
      "id": "C1",
      "path": "相対ファイルパス",
      "line": 差分行番号,
      "side": "RIGHT",
      "severity": "P1 | P2 | P3",
      "category": "bug | spec | convention | security | architecture | performance",
      "tag": "MUST | Q | IMO | NR | NIT | FYI | PRAISE",
      "lens": {
        "verdict": "escalate | promote | keep | drop",
        "reason": "この判定にした理由"
      },
      "title": "指摘要約（1行）",
      "body": "指摘の詳細理由・リスク・修正方針の説明",
      "problem": "問題の具体的な説明",
      "proposal": "具体的な改善提案",
      "relationToExisting": "既存のレビューやCIとの関係（無ければ null）",
      "suggestion": {
        "snippet": "既存コード",
        "replacement": "推奨修正コード"
      }
    }
  ],
  "diagram": {
    "d2Source": "direction: right\n\nProcessBillingUnitUseCase -> CorporateAccountQueryService: \"findGroupPeriods\"\n\nProcessBillingUnitUseCase: {\n  style.fill: \"#2d1b15\"\n  style.stroke: \"#f59e0b\"\n  link: \"#comment-C1\"\n}\nCorporateAccountQueryService: {\n  style.fill: \"#161b22\"\n  style.stroke: \"#38bdf8\"\n}\n",
    "nodes": [
      { "id": "モジュールID", "label": "表示名", "type": "modified | affected | dependency", "severity": "P1", "commentId": "C1" }
    ],
    "edges": [
      { "from": "モジュールID", "to": "依存先ID", "label": "calls" }
    ]
  },
  "callFlow": {
    "steps": [
      { "step": 1, "title": "ステップ名", "description": "説明", "status": "modified", "commentId": "C1" }
    ]
  },
  "metrics": {
    "filesAnalyzed": 10,
    "findingsCount": 1,
    "p1Count": 0,
    "p2Count": 1,
    "p3Count": 0
  }
}
```

> **注意**:
> - `review.json` 以外の余計な文章や HTML ファイルは出力しない。
> - `comments` 内の `path` と `line` は、必ず PR の diff 上に実在する行を指定すること。
