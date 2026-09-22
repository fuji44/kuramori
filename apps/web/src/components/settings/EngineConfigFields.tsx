import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AntigravityEngineConfig,
  ClaudeCodeEngineConfig,
  MockEngineConfig,
} from '../../types.ts';
import { Checkbox } from '../Checkbox.tsx';

export interface AntigravityFieldsProps {
  values: Partial<AntigravityEngineConfig>;
  onChange: (updates: Partial<AntigravityEngineConfig>) => void;
  isOverride?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function AntigravityFields({
  values,
  onChange,
  isOverride = false,
  showAdvanced,
  onToggleAdvanced,
}: AntigravityFieldsProps) {
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const isAdvancedOpen = showAdvanced !== undefined ? showAdvanced : internalShowAdvanced;
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced((prev) => !prev));

  const advancedCount = [
    Boolean(values.systemPrompt?.trim()),
    values.inputFormat && values.inputFormat !== 'text',
    values.outputFormat && values.outputFormat !== 'text',
    Boolean(values.jsonSchema?.trim()),
    Boolean(values.printTimeout?.trim()),
    isOverride ? values.sandbox !== undefined : Boolean(values.sandbox),
    isOverride ? values.disableSlashCommands !== undefined : Boolean(values.disableSlashCommands),
    Boolean(values.customArgs?.trim()),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* 1. バイナリパス (全体設定のみ) */}
      {!isOverride && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">agy バイナリパス *</label>
            <input
              type="text"
              required
              value={values.binPath ?? ''}
              onChange={(e) => onChange({ binPath: e.target.value })}
              placeholder="例: agy または /home/user/.local/bin/agy"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">実行タイムアウト (秒)</label>
            <input
              type="number"
              min={10}
              max={3600}
              step={30}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: '' as any });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              onBlur={() => {
                if (
                  values.timeoutSeconds === '' ||
                  values.timeoutSeconds === undefined ||
                  isNaN(Number(values.timeoutSeconds)) ||
                  Number(values.timeoutSeconds) <= 0
                ) {
                  onChange({ timeoutSeconds: 900 });
                }
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      )}

      {/* 2. 基本設定 (モデル・推論レベル・タイムアウト) */}
      <div className={`grid grid-cols-1 ${isOverride ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">モデル (--model)</label>
          <input
            type="text"
            list="agy-model-suggestions"
            value={values.model ?? ''}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder={
              isOverride
                ? '例: gemini-3.1-pro (未指定時は全体設定を継承)'
                : '例: gemini-3.1-pro'
            }
            className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
          />
          <datalist id="agy-model-suggestions">
            <option value="gemini-3.1-pro" label="推奨" />
            <option value="gemini-3.8-flash" label="高速" />
            <option value="gemini-3.7-flash" />
            <option value="gemini-3.6-flash" />
            <option value="claude-sonnet-4-6" />
            <option value="claude-opus-4-6" />
            <option value="gpt-oss-120b" />
          </datalist>
        </div>

        <div>
          <label className="text-xs text-[#8b949e] block mb-1">推論レベル (--effort)</label>
          <input
            type="text"
            list="agy-effort-suggestions"
            value={values.effort ?? ''}
            onChange={(e) => onChange({ effort: e.target.value })}
            placeholder={
              isOverride
                ? '例: high (未指定時は全体設定を継承)'
                : '例: high'
            }
            className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
          />
          <datalist id="agy-effort-suggestions">
            <option value="high" />
            <option value="medium" />
            <option value="low" />
          </datalist>
        </div>

        {isOverride && (
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">タイムアウト (秒)</label>
            <input
              type="number"
              min={10}
              max={3600}
              step={30}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              placeholder="例: 900 (未指定時は継承)"
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        )}
      </div>

      {/* 3. 高度な設定トグルボタン */}
      <div className="pt-1">
        <button
          type="button"
          onClick={toggleAdvanced}
          aria-expanded={isAdvancedOpen}
          className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>高度な設定</span>
            {advancedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                {advancedCount} 項目設定中
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <span>{isAdvancedOpen ? '閉じる' : '表示する'}</span>
            {isAdvancedOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>

      {/* 4. 高度な設定コンテンツ */}
      {isAdvancedOpen && (
        <div className="space-y-4 pt-1 pl-3 border-l-2 border-sky-800/40">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              システムプロンプト / インタラクション (System Prompt)
            </label>
            <textarea
              rows={3}
              value={values.systemPrompt ?? ''}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              placeholder={
                isOverride
                  ? '例: あなたはセキュリティ監査官です。脆弱性の悪用シナリオと緩和策を厳格に報告してください。(未指定時は全体設定を継承)'
                  : '例: あなたは建設的で厳格なシニアエンジニアです。指摘事項には理由と具体的な修正案を日本語で添えてください。'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono`}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {isOverride
                ? '指定した場合、エンジンの全体設定のシステムプロンプトをこの内容で完全に置き換えます。'
                : 'エージェントのペルソナや振る舞い、共通のレビュー方針を規定します。ルール側で上書きされていない場合に標準として適用されます。'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                入力フォーマット (--input-format)
              </label>
              <select
                value={values.inputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'stream-json' | '';
                  if (val === '') {
                    onChange({ inputFormat: undefined });
                  } else {
                    onChange({
                      inputFormat: val,
                      ...(val === 'stream-json' ? { outputFormat: 'stream-json' } : {}),
                    });
                  }
                }}
                className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500`}
              >
                {isOverride && <option value="">未指定 (全体設定を継承)</option>}
                <option value="text">text (標準テキスト / 単発プロンプト)</option>
                <option value="stream-json">stream-json (NDJSON 入力)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                出力フォーマット (--output-format)
              </label>
              <select
                value={values.outputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'json' | 'stream-json' | '';
                  onChange({ outputFormat: val === '' ? undefined : val });
                }}
                className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500`}
              >
                {isOverride && <option value="">未指定 (全体設定を継承)</option>}
                <option value="text">text (標準テキスト)</option>
                <option value="json">json (構造化 JSON / トークン使用量含む)</option>
                <option value="stream-json">stream-json (NDJSON 逐次ストリーム)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              JSON スキーマ制約 (--json-schema)
            </label>
            <textarea
              rows={4}
              value={values.jsonSchema ?? ''}
              onChange={(e) => onChange({ jsonSchema: e.target.value })}
              placeholder={
                isOverride
                  ? '例: {"type":"object","properties":{...}} (未指定時は全体設定を継承)'
                  : '例: {"type":"object","properties":{...}} または schema.json のファイルパス'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y`}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              指定時、モデルの最終出力を指定された JSON スキーマに厳格準拠（Structured Outputs）させます。
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              Print タイムアウト (--print-timeout)
            </label>
            <input
              type="text"
              value={values.printTimeout ?? ''}
              onChange={(e) => onChange({ printTimeout: e.target.value })}
              placeholder={
                isOverride
                  ? '例: 900s または 15m (未指定時は全体設定を継承)'
                  : '例: 900s または 15m (未指定時は 0s / 無制限)'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              agy 自身の print モード（-p）内部時間制限です。指定時間でターンを打ち切り途中出力を返して正常終了します（単位: s, m）。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {isOverride ? (
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  ターミナルサンドボックス (--sandbox)
                </label>
                <select
                  value={values.sandbox === undefined ? '' : String(values.sandbox)}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({ sandbox: val === '' ? undefined : val === 'true' });
                  }}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">未指定 (全体設定を継承)</option>
                  <option value="true">有効 (--sandbox を付与)</option>
                  <option value="false">無効 (付与しない)</option>
                </select>
              </div>
            ) : (
              <Checkbox
                variant="card"
                checked={Boolean(values.sandbox)}
                onChange={(checked) => onChange({ sandbox: checked })}
                label="ターミナルサンドボックス (--sandbox)"
                description="エージェントのシェル操作を制限されたセキュアなサンドボックス内で実行します。"
              />
            )}

            {isOverride ? (
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  スキルの展開を抑止 (--disable-slash-commands)
                </label>
                <select
                  value={
                    values.disableSlashCommands === undefined
                      ? ''
                      : String(values.disableSlashCommands)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      disableSlashCommands: val === '' ? undefined : val === 'true',
                    });
                  }}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">未指定 (全体設定を継承)</option>
                  <option value="true">有効 (抑止する)</option>
                  <option value="false">無効 (抑止しない)</option>
                </select>
              </div>
            ) : (
              <Checkbox
                variant="card"
                checked={Boolean(values.disableSlashCommands)}
                onChange={(checked) => onChange({ disableSlashCommands: checked })}
                label="スキルの展開を抑止 (--disable-slash-commands)"
                description="プロンプト内のスラッシュコマンドや意図しないスキルの展開を無効化します。"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">追加カスタム引数 (Custom Args)</label>
            <input
              type="text"
              value={values.customArgs ?? ''}
              onChange={(e) => onChange({ customArgs: e.target.value })}
              placeholder={
                isOverride
                  ? '例: --project my-project (未指定時は全体設定を継承)'
                  : '例: --project my-project'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface ClaudeCodeFieldsProps {
  values: Partial<ClaudeCodeEngineConfig>;
  onChange: (updates: Partial<ClaudeCodeEngineConfig>) => void;
  isOverride?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function ClaudeCodeFields({
  values,
  onChange,
  isOverride = false,
  showAdvanced,
  onToggleAdvanced,
}: ClaudeCodeFieldsProps) {
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const isAdvancedOpen = showAdvanced !== undefined ? showAdvanced : internalShowAdvanced;
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced((prev) => !prev));

  const advancedCount = [
    Boolean(values.systemPrompt?.trim()),
    values.inputFormat && values.inputFormat !== 'text',
    values.outputFormat && values.outputFormat !== 'text',
    Boolean(values.jsonSchema?.trim()),
    Boolean(values.allowedTools?.trim()),
    isOverride ? values.bare !== undefined : Boolean(values.bare),
    Boolean(values.customArgs?.trim()),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* 1. バイナリパス (全体設定のみ) */}
      {!isOverride && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">claude バイナリパス *</label>
            <input
              type="text"
              required
              value={values.binPath ?? ''}
              onChange={(e) => onChange({ binPath: e.target.value })}
              placeholder="例: claude または /usr/local/bin/claude"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">実行タイムアウト (秒)</label>
            <input
              type="number"
              min={10}
              max={3600}
              step={30}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: '' as any });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              onBlur={() => {
                if (
                  values.timeoutSeconds === '' ||
                  values.timeoutSeconds === undefined ||
                  isNaN(Number(values.timeoutSeconds)) ||
                  Number(values.timeoutSeconds) <= 0
                ) {
                  onChange({ timeoutSeconds: 900 });
                }
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      )}

      {/* 2. 基本設定 (モデル・推論レベル・タイムアウト) */}
      <div className={`grid grid-cols-1 ${isOverride ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">モデル (--model)</label>
          <input
            type="text"
            list="claude-model-suggestions"
            value={values.model ?? ''}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder={
              isOverride
                ? '例: sonnet (未指定時は全体設定を継承)'
                : '例: sonnet'
            }
            className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
          />
          <datalist id="claude-model-suggestions">
            <option value="sonnet" label="推奨" />
            <option value="opus" label="推論" />
            <option value="haiku" label="高速" />
            <option value="best" label="最高性能" />
            <option value="fable" />
            <option value="opusplan" label="ハイブリッド" />
            <option value="sonnet[1m]" />
            <option value="opus[1m]" />
            <option value="default" />
            <option value="claude-opus-4-8" />
            <option value="claude-sonnet-4-6" />
            <option value="claude-sonnet-4-5" />
            <option value="claude-haiku-4-5" />
            <option value="claude-3-7-sonnet-20250219" />
          </datalist>
        </div>

        <div>
          <label className="text-xs text-[#8b949e] block mb-1">推論レベル (--effort)</label>
          <input
            type="text"
            list="claude-effort-suggestions"
            value={values.effort ?? ''}
            onChange={(e) => onChange({ effort: e.target.value })}
            placeholder={
              isOverride
                ? '例: high (未指定時は全体設定を継承)'
                : '例: high'
            }
            className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
          />
          <datalist id="claude-effort-suggestions">
            <option value="high" />
            <option value="xhigh" />
            <option value="max" />
            <option value="medium" />
            <option value="low" />
          </datalist>
        </div>

        {isOverride && (
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">タイムアウト (秒)</label>
            <input
              type="number"
              min={10}
              max={3600}
              step={30}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              placeholder="例: 900 (未指定時は継承)"
              className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>
        )}
      </div>

      {/* 3. 高度な設定トグルボタン */}
      <div className="pt-1">
        <button
          type="button"
          onClick={toggleAdvanced}
          aria-expanded={isAdvancedOpen}
          className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>高度な設定</span>
            {advancedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                {advancedCount} 項目設定中
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <span>{isAdvancedOpen ? '閉じる' : '表示する'}</span>
            {isAdvancedOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>

      {/* 4. 高度な設定コンテンツ */}
      {isAdvancedOpen && (
        <div className="space-y-4 pt-1 pl-3 border-l-2 border-sky-800/40">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              システムプロンプト / インタラクション (--append-system-prompt)
            </label>
            <textarea
              rows={3}
              value={values.systemPrompt ?? ''}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              placeholder={
                isOverride
                  ? '例: あなたはセキュリティ監査官です。脆弱性の悪用シナリオと緩和策を厳格に報告してください。(未指定時は全体設定を継承)'
                  : '例: あなたは建設的で厳格なシニアエンジニアです。指摘事項には理由と具体的な修正案を日本語で添えてください。'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono`}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {isOverride
                ? '指定した場合、エンジンの全体設定のシステムプロンプトをこの内容で完全に置き換えます。'
                : 'エージェントのペルソナや振る舞い、共通のレビュー方針を規定します。CLI 実行時に --append-system-prompt として渡されます。'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                入力フォーマット (--input-format)
              </label>
              <select
                value={values.inputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'stream-json' | '';
                  if (val === '') {
                    onChange({ inputFormat: undefined });
                  } else {
                    onChange({
                      inputFormat: val,
                      ...(val === 'stream-json' ? { outputFormat: 'stream-json' } : {}),
                    });
                  }
                }}
                className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500`}
              >
                {isOverride && <option value="">未指定 (全体設定を継承)</option>}
                <option value="text">text (標準テキスト / 単発プロンプト)</option>
                <option value="stream-json">stream-json (NDJSON 入力)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                出力フォーマット (--output-format)
              </label>
              <select
                value={values.outputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'json' | 'stream-json' | '';
                  onChange({ outputFormat: val === '' ? undefined : val });
                }}
                className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500`}
              >
                {isOverride && <option value="">未指定 (全体設定を継承)</option>}
                <option value="text">text (標準テキスト)</option>
                <option value="json">json (構造化 JSON / トークン使用量含む)</option>
                <option value="stream-json">stream-json (NDJSON 逐次ストリーム)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              JSON スキーマ制約 (--json-schema)
            </label>
            <textarea
              rows={4}
              value={values.jsonSchema ?? ''}
              onChange={(e) => onChange({ jsonSchema: e.target.value })}
              placeholder={
                isOverride
                  ? '例: {"type":"object","properties":{...}} (未指定時は全体設定を継承)'
                  : '例: {"type":"object","properties":{...}} または schema.json のファイルパス'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y`}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              指定時、モデルの最終出力を指定された JSON スキーマに厳格準拠（Structured Outputs）させます。
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              許可ツール制約 (--allowed-tools)
            </label>
            <input
              type="text"
              value={values.allowedTools ?? ''}
              onChange={(e) => onChange({ allowedTools: e.target.value })}
              placeholder={
                isOverride
                  ? '例: Bash,Edit,GlobTool (未指定時は全体設定を継承)'
                  : '例: Bash,Edit,GlobTool (カンマ区切り、空欄で全ツール許可)'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              Claude Code CLI が利用可能なツールを制限します。カンマ区切りでツール名を指定します。
            </p>
          </div>

          <div className="pt-1">
            {isOverride ? (
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  設定読み込みスキップ (--bare)
                </label>
                <select
                  value={values.bare === undefined ? '' : String(values.bare)}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({ bare: val === '' ? undefined : val === 'true' });
                  }}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">未指定 (全体設定を継承)</option>
                  <option value="true">有効 (--bare を付与)</option>
                  <option value="false">無効 (付与しない)</option>
                </select>
              </div>
            ) : (
              <Checkbox
                variant="card"
                checked={Boolean(values.bare)}
                onChange={(checked) => onChange({ bare: checked })}
                label="設定読み込みスキップ (--bare)"
                description="ローカルの config やプロジェクト固有のカスタムプロンプト等の読み込みを抑制します。"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">追加カスタム引数 (Custom Args)</label>
            <input
              type="text"
              value={values.customArgs ?? ''}
              onChange={(e) => onChange({ customArgs: e.target.value })}
              placeholder={
                isOverride
                  ? '例: --dangerously-skip-permissions (未指定時は全体設定を継承)'
                  : '例: --dangerously-skip-permissions'
              }
              className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface MockFieldsProps {
  values: Partial<MockEngineConfig>;
  onChange: (updates: Partial<MockEngineConfig>) => void;
  isOverride?: boolean;
}

export function MockFields({ values, onChange, isOverride = false }: MockFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[#8b949e] block mb-1">
          疑似遅延時間 (ミリ秒)
        </label>
        <input
          type="number"
          min={0}
          max={60000}
          step={100}
          value={values.delayMs !== undefined ? values.delayMs : ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange({ delayMs: (isOverride ? undefined : ('' as any)) });
            } else {
              const num = parseInt(raw, 10);
              if (!isNaN(num)) {
                onChange({ delayMs: num });
              }
            }
          }}
          onBlur={() => {
            if (
              !isOverride &&
              (values.delayMs === '' || values.delayMs === undefined || isNaN(Number(values.delayMs)))
            ) {
              onChange({ delayMs: 500 });
            }
          }}
          placeholder={
            isOverride
              ? '例: 500 (未指定時は全体設定を継承)'
              : '例: 500'
          }
          className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500`}
        />
        <p className="text-[11px] text-[#8b949e] mt-1">
          レビュー処理の実行をシミュレートする待機時間（ms）です。
        </p>
      </div>
    </div>
  );
}

export interface EngineConfigFieldsProps {
  engine: string;
  values: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  isOverride?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function EngineConfigFields({
  engine,
  values,
  onChange,
  isOverride = false,
  showAdvanced,
  onToggleAdvanced,
}: EngineConfigFieldsProps) {
  if (engine === 'antigravity') {
    return (
      <AntigravityFields
        values={values}
        onChange={onChange}
        isOverride={isOverride}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />
    );
  }

  if (engine === 'claudeCode' || engine === 'claude-code') {
    return (
      <ClaudeCodeFields
        values={values}
        onChange={onChange}
        isOverride={isOverride}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />
    );
  }

  if (engine === 'mock') {
    return (
      <MockFields
        values={values}
        onChange={onChange}
        isOverride={isOverride}
      />
    );
  }

  return (
    <div className="text-xs text-[#8b949e] p-3 rounded bg-[#0d1117] border border-[#30363d]">
      指定されたエンジン「{engine}」の設定フィールドはありません。
    </div>
  );
}
