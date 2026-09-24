# Codex CLI エンジン追加調査

調査日: 2026-09-24

Codex CLI をレビュー実行エンジンとして `codex exec` から呼び出す場合の設定項目を整理する。根拠は OpenAI の公式 Codex ドキュメントと `openai/codex` リポジトリに限定した。

## 要点

- 自動実行には `codex exec` を使う。通常の標準出力は最終回答、進捗は標準エラーへ出る。JSONL を読むなら `--json` を付ける。
- エンジン固有設定としてモデル、推論 effort、sandbox、作業ディレクトリ、必要なら JSON Schema を指定できる。effort は `-c 'model_reasoning_effort="..."'` で渡し、使える値はモデルごとに異なる。
- `codex exec` の現在の実装は headless 実行の承認ポリシーを `never` に初期化する。CLI のグローバルフラグ資料には `--ask-for-approval` も載る一方、実装上の受け渡しと実際の CLI バージョンに差があり得る。自動実行の設定は `-c 'approval_policy="never"'` などを使い、対象バージョンの `codex exec --help` で確認する。
- CLI 自体の実行時間上限は、確認した `codex exec` の公開オプションに見当たらない。サーバー側でタイムアウトを設け、期限到達時にプロセスを終了する設計が必要。
- 起動プロセスに渡した環境変数は Codex CLI 自身が受け取る。Codex が起動するシェルコマンドへ環境変数をどこまで継承するかは `shell_environment_policy` に左右されるため、「エンジンプロセス用」と「エージェントが実行するコマンド用」の挙動を同一視しない。

## 項目別の仕様

### 実行形式と出力

`codex exec [OPTIONS] [PROMPT]` は、対話 TUI を開かずスクリプトや CI で完了する実行向けの stable コマンドである。通常は進捗を stderr、最終メッセージを stdout に出す。`--json` は stdout にイベントを newline-delimited JSON で出す。セッションファイルを残したくない場合は `--ephemeral` を使える。 ([非対話モード](https://learn.chatgpt.com/docs/non-interactive-mode), [CLI コマンドリファレンス](https://learn.chatgpt.com/docs/developer-commands?surface=cli))

### モデルと推論 effort

- `--model <名前>` / `-m` でこの実行のモデルを指定できる。省略時は設定済みモデルを使う。モデル指定値は固定リストではなく任意の文字列として公開されている。 ([exec オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec))
- 推論 effort は `-c 'model_reasoning_effort="high"'` のような設定上書きで指定する。設定資料の値の例は `low`, `medium`, `high`, `xhigh`, `max`, `ultra` だが、利用可能な値は選択モデルとクライアントによって異なる。したがってUIは全モデル共通の固定候補として保証せず、任意指定または限定候補＋未指定を許容するのが安全。 ([設定リファレンス](https://learn.chatgpt.com/docs/config-file/config-reference))

### Sandbox と承認

- `--sandbox` は `read-only`, `workspace-write`, `danger-full-access`。未指定なら設定値を使う。モデルが実行するコマンドに対するファイル・ネットワーク等の権限設定で、選択肢は単なる「自動承認」レベルではない。 ([exec オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec), [設定リファレンス](https://learn.chatgpt.com/docs/config-file/config-reference))
- 現行ソースでは非対話実行用の `approval_policy` を `never` に設定してから実行設定を組み立てる。`never` は承認を出さず、失敗をモデルに返すポリシーである。 ([exec 実装](https://github.com/openai/codex/blob/main/codex-rs/exec/src/lib.rs), [承認ポリシー型](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/protocol.rs))
- CLI リファレンスのグローバルフラグ表には `--ask-for-approval` が記載されるが、`codex exec` の専用オプション表には含まれない。公式リポジトリには、グローバル記載とサブコマンドでの受理位置が食い違うという報告もある。プロファイルから明示的に設定する場合は、まず `-c 'approval_policy="never"'` など設定上書きを使い、採用する Codex バージョンで `codex exec --help` を確認する。 ([CLI グローバルフラグ](https://learn.chatgpt.com/docs/developer-commands?surface=cli#global-flags), [公式リポジトリ issue #26602](https://github.com/openai/codex/issues/26602), [`exec` の設定上書き](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec))
- `--dangerously-bypass-approvals-and-sandbox` は承認と sandbox の両方を回避する危険なフラグであり、通常のエンジンUIで推奨する選択肢ではない。 ([CLI コマンドリファレンス](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec))

### 作業ディレクトリと追加ディレクトリ

`--cd <path>` / `-C` でワークスペースルートを指定する。`--add-dir <path>` は追加の書き込み対象ディレクトリを許可する。後者はワークスペースを広げる権限設定なので、通常の作業ディレクトリ設定とは別の高度な項目として扱う。Git リポジトリ外で実行する場合は `--skip-git-repo-check` がある。 ([グローバルフラグ](https://learn.chatgpt.com/docs/developer-commands?surface=cli#global-flags), [`codex exec` オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec))

### Prompt と stdin

Prompt は位置引数で渡すか、`-` を位置引数にして stdin から読む。stdin がパイプされ、かつ prompt も与えられた場合、prompt が指示として扱われ、stdin は追加コンテキストとして添付される。Codex CLI の `exec` 引数型もこの動作を明記している。レビュー本文の長さ・機密性・引数長制限を考慮すると、アプリ側ではプロンプトを stdin 経由で渡せる形が扱いやすい。 ([非対話モード](https://learn.chatgpt.com/docs/non-interactive-mode), [`exec` CLI 引数実装](https://github.com/openai/codex/blob/main/codex-rs/exec/src/cli.rs))

### 出力形式と schema

- `--json` はイベントを JSONL で stdout に出す。プレーンテキスト出力とは stdout の契約が異なるため、パーサーは設定に応じて切り替える。
- `--output-schema <file>` は最終応答の JSON Schema をファイルで渡す。レビュー判定を構造化する場合に利用できるが、CLI に一時 schema ファイルを準備する処理が必要になる。
- `--output-last-message <file>` / `-o` は最終メッセージを書き出す。JSONL のイベント列を解析しない構成では後処理用の選択肢になる。
- `--output-schema` と `--json` は同じ機能ではない。前者はモデル最終応答の形を指定し、後者は実行イベントをJSONLで出力する。 ([`codex exec` オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec), [`exec` CLI 引数実装](https://github.com/openai/codex/blob/main/codex-rs/exec/src/cli.rs), [JSONLイベント実装](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs))

### JSONL/event の解析

現行ソースが定義するトップレベルイベントは `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.started`, `item.updated`, `item.completed`, `error`。`thread.started` には再開に使える thread ID、`turn.completed` には token usage、`turn.failed` と `error` にはエラー情報が含まれる。itemイベントは `agent_message`, `reasoning`, `command_execution`, `file_change`, `mcp_tool_call` などの異なる型を持つ。最終応答は通常 `agent_message` item の `text` で得られる。 ([JSONLイベント実装](https://github.com/openai/codex/blob/main/codex-rs/exec/src/exec_events.rs))

パーサーは未知の `type` や item 型を許容し、少なくともプロセス終了コード、終端 `turn.completed` / `turn.failed`、トップレベル `error` を併せて判定するのがよい。イベント型は公式リポジトリ内の現行実装から確認できるが、ドキュメント上で将来互換性を保証する固定プロトコルとは確認できなかったため、厳密な全イベント網羅に依存させない。

### CLI パス、追加引数、timeout

- Codex の引数に実行ファイルパス指定は見当たらない。CLI の導入場所はインストーラー設定の `CODEX_INSTALL_DIR` で変えられるが、エンジン統合側で実行バイナリを指定できるようにするなら、その指定はアプリケーション側の起動コマンド設定として実装する。 ([環境変数リファレンス](https://learn.chatgpt.com/docs/config-file/environment-variables))
- `-c key=value` は繰り返し可能で、設定値をその実行だけ上書きする。追加引数を設ける場合はシェル文字列を評価せず argv 配列として渡し、既知設定と衝突する引数・危険フラグをどう扱うか決める。 ([`codex exec` オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec))
- `codex exec` の公開オプション一覧およびソースの CLI 引数定義に実行時間の上限指定は見当たらない。よって timeout は本アプリ側のプロセス制御で実装するのが妥当。これは公開引数一覧・実装を確認した範囲での結論であり、将来のCLIバージョンに新設される可能性はある。 ([`codex exec` オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec), [`exec` CLI 引数実装](https://github.com/openai/codex/blob/main/codex-rs/exec/src/cli.rs))

### 環境変数と認証

- `CODEX_API_KEY` は `codex exec` 等の非対話 Codex プロセスへ API key を渡す公式環境変数。OpenAI は repository-controlled code を実行する際、ジョブ全体ではなく必要なプロセスに限定して設定するよう案内している。 ([環境変数リファレンス](https://learn.chatgpt.com/docs/config-file/environment-variables))
- Codex CLI はChatGPT認証またはAPI key認証に対応する。API keyでログインする方法は `OPENAI_API_KEY` を stdin 経由で `codex login --with-api-key` に渡す手順として案内されている。非対話 `exec` に直接与える場合の変数名は `CODEX_API_KEY` と区別する。 ([認証ガイド](https://learn.chatgpt.com/docs/auth), [環境変数リファレンス](https://learn.chatgpt.com/docs/config-file/environment-variables))
- `CODEX_HOME` は config、auth、ログ、session など Codex の状態ディレクトリを切り替える。設定を分離したい専用 runner では候補になるが、指定先ディレクトリは事前に存在する必要がある。 ([環境変数リファレンス](https://learn.chatgpt.com/docs/config-file/environment-variables))
- 任意の環境変数はCodex起動プロセスの環境として渡せる。ただしシェルツールの子プロセスに引き継がれる環境は `shell_environment_policy.inherit`, `.filters`, `.set` 等で制御される。特にフィルター・既定の secret 除外設定を確認せず、カスタム環境変数がレビュー中のコマンドにも必ず見えるとは扱わない。 ([設定リファレンス: shell_environment_policy](https://learn.chatgpt.com/docs/config-file/config-reference))

## プロファイル UI への反映案

Claude Code / Antigravity と同じ「エンジン選択後に実行方式・実行パス・引数を設定する」形にするなら、Codexでは以下が妥当。

| UI項目 | Codex CLIへの対応 | 推奨扱い |
| --- | --- | --- |
| 実行方式 | `codex exec` | Codexエンジンでは固定 |
| CLIパス | アプリ起動側の実行ファイル | 基本設定または高度な設定。PATH探索を標準にし、任意パス指定は任意 |
| モデル | `--model` | 基本設定。未指定可 |
| 推論 effort | `-c model_reasoning_effort=...` | 基本設定。モデル依存値、未指定可 |
| 実行ターン上限 | 対応する `codex exec` オプション・設定キーを確認できず | Claude Code の `maxTurns` と同じ項目は設けない |
| 追加指示 | 既存レビューpromptへ含める | 現行のsystem prompt相当をレビューpromptに合成 |
| Sandbox | `--sandbox` | 高度な設定。危険度が直感的に分かる説明を付ける |
| Approval policy | exec の既定 `never` / `-c approval_policy=...` | headless動作とCLIバージョン差があるため、明示値は高度な設定として限定する |
| 作業ディレクトリ | `--cd` | レビュー対象リポジトリからアプリが指定 |
| 追加ディレクトリ | `--add-dir` | 高度な設定。書き込み範囲を広げることを明示 |
| Prompt | 位置引数または stdin | stdinを基本とする |
| JSONL / 最終回答schema | `--json`, `--output-schema`, `--output-last-message` | 通常はアプリ内部の出力契約として管理 |
| timeout | CLIオプションなし（確認範囲） | アプリ側のプロセスtimeoutとして管理 |
| 環境変数 | CLI起動プロセスのenv map | エンジン共通設定として適用可能。Codex内の子コマンド継承は別途注意 |
| 認証 | `CODEX_API_KEY` または既存ログイン | secretの保存・注入は機密情報機能の設計対象 |

共通の環境変数UIからCodexの環境を構成することは可能。ただしCodexが起動するシェルツールへの継承ポリシー、`CODEX_API_KEY` のような認証secret、Codex自身の状態ディレクトリ用変数は、同じ「任意env」の項目だけで説明せず、機密フラグと用途の案内が必要になる。

## 既存コードとの照合

現行の `BaseCliEngineConfig` には実行パス、モデル、effort、timeout、system prompt、入出力形式、JSON Schema、追加引数がある。Codexでも実行パス、モデル、effort、timeout、追加引数は共通概念として利用できる。一方、Codexの構造化出力は「JSONLイベント」と「最終回答用JSON Schema」が別設定であり、現行の `inputFormat` / `outputFormat` の型をそのまま当てはめるのは適切でない。Codex用には `sandboxMode`, `approvalPolicy`, `ephemeral` を個別に扱い、system promptは現行のプロンプト生成関数へ渡してユーザー指示の一部として含める設計が自然である。`model_instructions_file` は組み込み指示の置き換えなので、既存の追記型system promptと同じ意味ではない。 ([CLI コマンドリファレンス](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec), [設定リファレンス](https://learn.chatgpt.com/docs/config-file/config-reference))

Codex用のrunnerは `executePreFlight` / `buildReviewPrompt` / `executePostFlight` を再利用できる。実行時は `codex exec --json --output-last-message <path> -` を基本形とし、stdinでプロンプトを渡し、JSONLイベントを進捗ログに、最終回答ファイルをGatekeeper入力にする構成が候補となる。`--output-schema` を加える場合は既存の共有レビューJSON Schemaを一時ファイルとして用意する必要がある。既存のClaude Code・Antigravity実装がstdout全文をGatekeeperへ渡す点とは異なるため、Codexでは最終回答抽出を専用エンジン内で明確に行う。 ([非対話モード](https://learn.chatgpt.com/docs/non-interactive-mode), [`codex exec` オプション](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-exec))

## 環境変数の共通化案

「共通化」は、共通の型・UIを使うことと、同じ変数値を全エンジンへ注入することを分けて考える。推奨は前者である。

- 機密フラグを含む環境変数型をClaude Code専用型から汎用型にする。
- `customEnv` を `BaseCliEngineConfig` に置き、Claude Code、Antigravity、Codexの各設定で同じデータ構造を使う。
- 環境変数編集UIを再利用可能な部品にし、各CLIエンジンの全体設定とプロファイル設定で表示する。
- 値自体はエンジン全体設定およびプロファイルごとに保持する。OSから継承する環境を基底にし、エンジン全体設定、プロファイル設定、テストフォームの未保存値の順で上書きする。実行時と接続テストで同じ優先順位にする。
- Mockは外部CLIプロセスを起動しないため、この環境変数契約の対象外とする。

同じ環境変数マップを全エンジンへ一括注入する案は、`CODEX_API_KEY` や `ANTHROPIC_API_KEY` など用途が限られる機密値まで無関係なCLIに渡す。共有UI・型を使いつつ値はエンジンごとに限定する方が、設定の目的が明確で、実行プロセスに渡す情報も絞れる。

現行コードでは、環境変数の型、保存値のマスキングと復元、実行時注入、接続テスト時の注入がClaude Code固有になっている。共通化時は `apps/server/src/api.ts` の秘匿化処理と接続テスト、`apps/server/src/queue.ts` のプロファイル解決、runner各エンジンの子プロセス環境、Webの環境変数UIを一緒に変更する必要がある。現状の機密フラグはAPI応答をマスクするが、設定ストレージを暗号化しない点は変わらない。

### 想定される変更箇所

| 責務 | 現行箇所 | 変更内容 |
| --- | --- | --- |
| エンジン種別と設定型 | `packages/core/src/types/review.ts`, `apps/web/src/types.ts` | `codex`設定・profileを追加し、機密情報付き環境変数型をCLIエンジン共通型へ移す |
| engine選択・profile編集 | `apps/web/src/views/settings/EngineSettingsView.tsx`, `apps/web/src/components/settings/EngineConfigFields.tsx` | Codex選択と専用設定項目を追加し、環境変数UIを共有する |
| 実行生成 | `apps/server/src/queue.ts`, `packages/runner/src/engines/`, `packages/runner/src/index.ts` | profile設定をCodex runnerへ渡し、共通レビュー前後処理を使う。`codex exec`を起動し、JSONLまたは最終回答ファイルからGatekeeper入力を得る |
| 既定値とテスト | `apps/server/src/settings.ts`, `apps/server/src/api.ts` | Codexの既定設定・実行テストを追加し、環境変数の注入とマスクをすべてのCLIエンジン設定に一般化する |
| 単体runner | `packages/runner/src/cli.ts` | 単体CLIからCodexを選べるようにする場合に分岐を追加する |

保存データは既にJSON形式のengine設定・profile設定なので、`customEnv` を共通型へ移すだけなら保存フィールド名と配置を維持できる。秘匿化処理は型だけでなく設定全体の `engineSettings` とすべてのCLI `engineProfiles` を走査する必要がある。環境変数と設定の階層は、実際のreview実行・接続テストの両経路で同じに保つ。
