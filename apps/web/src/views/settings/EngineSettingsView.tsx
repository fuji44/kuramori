import React, { useState, useEffect } from 'react';
import {
  Save,
  Cpu,
  Terminal,
  Shield,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Box,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { AppSettings, EngineSettingsMap } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';

interface EngineSettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

function CommandPreview({ command, title = '実行コマンドプレビュー' }: { command: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-white/90">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span>{title}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white transition-colors"
          title="コマンドをコピー"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">コピー完了</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>コピー</span>
            </>
          )}
        </button>
      </div>
      <div className="bg-[#090d13] border border-[#21262d] rounded-lg p-2.5 font-mono text-xs text-sky-300 break-all select-all flex items-start gap-2 whitespace-pre-wrap">
        <span className="text-[#8b949e] select-none">$</span>
        <span className="flex-1">{command}</span>
      </div>
    </div>
  );
}

export function EngineSettingsView({
  settings,
  onSaveSettings,
  onShowSuccess,
  onShowError,
}: EngineSettingsViewProps) {
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [showAgyAdvanced, setShowAgyAdvanced] = useState(false);
  const [showClaudeAdvanced, setShowClaudeAdvanced] = useState(false);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const engines = formSettings.engineSettings ?? {
    antigravity: {
      binPath: formSettings.agyBin || 'agy',
      model: 'gemini-3.1-pro',
      effort: 'high',
      timeoutSeconds: 900,
      printTimeout: '',
      sandbox: false,
      disableSlashCommands: false,
      inputFormat: 'text',
      outputFormat: 'text',
      jsonSchema: '',
      customArgs: '',
    },
    claudeCode: {
      binPath: formSettings.claudeBin || 'claude',
      model: 'sonnet',
      effort: 'high',
      timeoutSeconds: 900,
      allowedTools: '',
      bare: false,
      inputFormat: 'text',
      outputFormat: 'text',
      jsonSchema: '',
      customArgs: '',
    },
    mock: {
      delayMs: 500,
    },
  };

  const updateAntigravity = (updates: Partial<typeof engines.antigravity>) => {
    const nextEngines: EngineSettingsMap = {
      ...engines,
      antigravity: { ...engines.antigravity, ...updates },
    };
    setFormSettings({
      ...formSettings,
      agyBin: nextEngines.antigravity.binPath,
      engineSettings: nextEngines,
    });
  };

  const updateClaudeCode = (updates: Partial<typeof engines.claudeCode>) => {
    const nextEngines: EngineSettingsMap = {
      ...engines,
      claudeCode: { ...engines.claudeCode, ...updates },
    };
    setFormSettings({
      ...formSettings,
      claudeBin: nextEngines.claudeCode.binPath,
      engineSettings: nextEngines,
    });
  };

  const updateMock = (updates: Partial<typeof engines.mock>) => {
    const nextEngines: EngineSettingsMap = {
      ...engines,
      mock: { ...engines.mock, ...updates },
    };
    setFormSettings({
      ...formSettings,
      engineSettings: nextEngines,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(formSettings);
      onShowSuccess('レビューエンジンの設定を保存しました');
    } catch {
      onShowError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const agyPreviewCommand = (() => {
    const parts = [
      engines.antigravity.binPath || 'agy',
      '--new-project',
      '-p',
      '"<prompt>"',
      '--dangerously-skip-permissions',
    ];
    if (engines.antigravity.model) parts.push('--model', engines.antigravity.model);
    if (engines.antigravity.effort) parts.push('--effort', engines.antigravity.effort);
    if (engines.antigravity.printTimeout?.trim()) {
      const val = engines.antigravity.printTimeout.trim();
      const formatted = /^\d+$/.test(val) ? `${val}s` : val;
      parts.push('--print-timeout', formatted);
    }
    if (engines.antigravity.sandbox) parts.push('--sandbox');
    if (engines.antigravity.disableSlashCommands) parts.push('--disable-slash-commands');
    if (engines.antigravity.inputFormat && engines.antigravity.inputFormat !== 'text') {
      parts.push('--input-format', engines.antigravity.inputFormat);
    }
    if (engines.antigravity.outputFormat && engines.antigravity.outputFormat !== 'text') {
      parts.push('--output-format', engines.antigravity.outputFormat);
    }
    if (engines.antigravity.jsonSchema?.trim()) {
      parts.push('--json-schema', `'${engines.antigravity.jsonSchema.trim()}'`);
    }
    if (engines.antigravity.customArgs?.trim()) {
      parts.push(...engines.antigravity.customArgs.trim().split(/\s+/));
    }
    return parts.join(' ');
  })();

  const claudePreviewCommand = (() => {
    const parts = [
      engines.claudeCode.binPath || 'claude',
      '-p',
      '"<prompt>"',
      '--dangerously-skip-permissions',
    ];
    if (engines.claudeCode.model) parts.push('--model', engines.claudeCode.model);
    if (engines.claudeCode.effort) parts.push('--effort', engines.claudeCode.effort);
    if (engines.claudeCode.inputFormat && engines.claudeCode.inputFormat !== 'text') {
      parts.push('--input-format', engines.claudeCode.inputFormat);
    }
    if (engines.claudeCode.outputFormat && engines.claudeCode.outputFormat !== 'text') {
      parts.push('--output-format', engines.claudeCode.outputFormat);
    }
    if (engines.claudeCode.jsonSchema?.trim()) {
      parts.push('--json-schema', `'${engines.claudeCode.jsonSchema.trim()}'`);
    }
    if (engines.claudeCode.systemPrompt?.trim()) {
      parts.push('--append-system-prompt', `"${engines.claudeCode.systemPrompt.trim().slice(0, 30)}..."`);
    }
    if (engines.claudeCode.allowedTools?.trim()) {
      parts.push('--allowed-tools', `"${engines.claudeCode.allowedTools.trim()}"`);
    }
    if (engines.claudeCode.bare) parts.push('--bare');
    if (engines.claudeCode.customArgs?.trim()) {
      parts.push(...engines.claudeCode.customArgs.trim().split(/\s+/));
    }
    return parts.join(' ');
  })();

  const currentBackend = formSettings.defaultBackendId || formSettings.reviewEngine || 'antigravity';

  const agyAdvancedCount = [
    Boolean(engines.antigravity.systemPrompt?.trim()),
    engines.antigravity.inputFormat && engines.antigravity.inputFormat !== 'text',
    engines.antigravity.outputFormat && engines.antigravity.outputFormat !== 'text',
    Boolean(engines.antigravity.jsonSchema?.trim()),
    Boolean(engines.antigravity.printTimeout?.trim()),
    Boolean(engines.antigravity.sandbox),
    Boolean(engines.antigravity.disableSlashCommands),
    Boolean(engines.antigravity.customArgs?.trim()),
  ].filter(Boolean).length;

  const claudeAdvancedCount = [
    Boolean(engines.claudeCode.systemPrompt?.trim()),
    engines.claudeCode.inputFormat && engines.claudeCode.inputFormat !== 'text',
    engines.claudeCode.outputFormat && engines.claudeCode.outputFormat !== 'text',
    Boolean(engines.claudeCode.jsonSchema?.trim()),
    Boolean(engines.claudeCode.allowedTools?.trim()),
    Boolean(engines.claudeCode.bare),
    Boolean(engines.claudeCode.customArgs?.trim()),
  ].filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">レビューエンジン設定</h2>
        <p className="text-xs text-[#8b949e] mt-1">
          デフォルト実行エンジンの選択、および各 AI エージェント CLI（Antigravity, Claude Code, Mock）の動作パラメータを設定します。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Global Default Engine Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">デフォルト AI レビューエンジン</h3>
          </div>

          <p className="text-xs text-[#8b949e]">
            ルール設定で「default」が指定されている場合に利用される標準エンジンです。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() =>
                setFormSettings({
                  ...formSettings,
                  reviewEngine: 'antigravity',
                  defaultBackendId: 'antigravity',
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                currentBackend === 'antigravity'
                  ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              <div className="font-semibold text-sm text-sky-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>antigravity</span>
                </span>
                {currentBackend === 'antigravity' && (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Google agy CLI を使用（推奨）。Gemini による多段階推論レビューを実行します。
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormSettings({
                  ...formSettings,
                  reviewEngine: 'claude-code',
                  defaultBackendId: 'claude-code',
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                currentBackend === 'claude-code'
                  ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              <div className="font-semibold text-sm text-sky-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>claude-code</span>
                </span>
                {currentBackend === 'claude-code' && (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                claude -p を使用。Claude Code による自律型コードレビューを実行します。
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormSettings({
                  ...formSettings,
                  reviewEngine: 'mock',
                  defaultBackendId: 'mock',
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                currentBackend === 'mock'
                  ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              <div className="font-semibold text-sm text-sky-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  <span>mock</span>
                </span>
                {currentBackend === 'mock' && (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                テスト用モック。API 呼び出しを行わず、即座にダミー結果を生成します。
              </p>
            </button>
          </div>
        </div>

        {/* 2. Antigravity CLI Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Antigravity CLI (agy) 設定</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 font-mono border border-sky-800/60">
              engine: antigravity
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">agy バイナリパス *</label>
              <input
                type="text"
                required
                value={engines.antigravity.binPath}
                onChange={(e) => updateAntigravity({ binPath: e.target.value })}
                placeholder="例: agy または /home/user/.local/bin/agy"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                実行タイムアウト (秒)
              </label>
              <input
                type="number"
                min={60}
                max={3600}
                step={30}
                value={engines.antigravity.timeoutSeconds}
                onChange={(e) =>
                  updateAntigravity({ timeoutSeconds: parseInt(e.target.value, 10) || 900 })
                }
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">モデル (--model)</label>
              <input
                type="text"
                list="agy-model-suggestions"
                value={engines.antigravity.model}
                onChange={(e) => updateAntigravity({ model: e.target.value })}
                placeholder="例: gemini-3.1-pro"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
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
              <label className="text-xs text-[#8b949e] block mb-1">
                推論レベル (--effort)
              </label>
              <input
                type="text"
                list="agy-effort-suggestions"
                value={engines.antigravity.effort}
                onChange={(e) => updateAntigravity({ effort: e.target.value })}
                placeholder="例: high"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <datalist id="agy-effort-suggestions">
                <option value="high" />
                <option value="medium" />
                <option value="low" />
              </datalist>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAgyAdvanced(!showAgyAdvanced)}
              aria-expanded={showAgyAdvanced}
              className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>高度な設定</span>
                {agyAdvancedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                    {agyAdvancedCount} 項目設定中
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                <span>{showAgyAdvanced ? '閉じる' : '表示する'}</span>
                {showAgyAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          </div>

          {showAgyAdvanced && (
            <div className="space-y-4 pt-1 pl-3 border-l-2 border-sky-800/40">
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  システムプロンプト / インタラクション (System Prompt)
                </label>
                <textarea
                  rows={3}
                  value={engines.antigravity.systemPrompt ?? ''}
                  onChange={(e) => updateAntigravity({ systemPrompt: e.target.value })}
                  placeholder="例: あなたは建設的で厳格なシニアエンジニアです。指摘事項には理由と具体的な修正案を日本語で添えてください。"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono"
                />
                <p className="text-[11px] text-[#8b949e] mt-1">
                  エージェントのペルソナや振る舞い、共通のレビュー方針を規定します。ルール側で上書きされていない場合に標準として適用されます。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">
                    入力フォーマット (--input-format)
                  </label>
                  <select
                    value={engines.antigravity.inputFormat ?? 'text'}
                    onChange={(e) => {
                      const val = e.target.value as 'text' | 'stream-json';
                      updateAntigravity({
                        inputFormat: val,
                        ...(val === 'stream-json' ? { outputFormat: 'stream-json' } : {}),
                      });
                    }}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="text">text (標準テキスト / 単発プロンプト)</option>
                    <option value="stream-json">stream-json (NDJSON 入力)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">
                    出力フォーマット (--output-format)
                  </label>
                  <select
                    value={engines.antigravity.outputFormat ?? 'text'}
                    onChange={(e) =>
                      updateAntigravity({
                        outputFormat: e.target.value as 'text' | 'json' | 'stream-json',
                      })
                    }
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
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
                  value={engines.antigravity.jsonSchema ?? ''}
                  onChange={(e) => updateAntigravity({ jsonSchema: e.target.value })}
                  placeholder='例: {"type":"object","properties":{...}} または schema.json のファイルパス'
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y"
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
                  value={engines.antigravity.printTimeout ?? ''}
                  onChange={(e) => updateAntigravity({ printTimeout: e.target.value })}
                  placeholder="例: 900s または 15m (未指定時は 0s / 無制限)"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-[#8b949e] mt-1">
                  agy 自身の print モード（-p）内部時間制限です。指定時間でターンを打ち切り途中出力を返して正常終了します（単位: s, m）。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Checkbox
                  variant="card"
                  checked={engines.antigravity.sandbox}
                  onChange={(checked) => updateAntigravity({ sandbox: checked })}
                  label="ターミナルサンドボックス (--sandbox)"
                  description="エージェントのシェル操作を制限されたセキュアなサンドボックス内で実行します。"
                />

                <Checkbox
                  variant="card"
                  checked={engines.antigravity.disableSlashCommands}
                  onChange={(checked) => updateAntigravity({ disableSlashCommands: checked })}
                  label="スキルの展開を抑止 (--disable-slash-commands)"
                  description="プロンプト内のスラッシュコマンドや意図しないスキルの展開を無効化します。"
                />
              </div>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">追加カスタム引数 (Custom Args)</label>
                <input
                  type="text"
                  value={engines.antigravity.customArgs ?? ''}
                  onChange={(e) => updateAntigravity({ customArgs: e.target.value })}
                  placeholder="例: --project my-project"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <CommandPreview command={agyPreviewCommand} />
        </div>

        {/* 3. Claude Code Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Claude Code (claude) 設定</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 font-mono border border-purple-800/60">
              engine: claude-code
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">claude バイナリパス *</label>
              <input
                type="text"
                required
                value={engines.claudeCode.binPath}
                onChange={(e) => updateClaudeCode({ binPath: e.target.value })}
                placeholder="例: claude または /usr/local/bin/claude"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                実行タイムアウト (秒)
              </label>
              <input
                type="number"
                min={60}
                max={3600}
                step={30}
                value={engines.claudeCode.timeoutSeconds}
                onChange={(e) =>
                  updateClaudeCode({ timeoutSeconds: parseInt(e.target.value, 10) || 900 })
                }
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">モデル (--model)</label>
              <input
                type="text"
                list="claude-model-suggestions"
                value={engines.claudeCode.model}
                onChange={(e) => updateClaudeCode({ model: e.target.value })}
                placeholder="例: sonnet"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
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
              <label className="text-xs text-[#8b949e] block mb-1">
                推論レベル (--effort)
              </label>
              <input
                type="text"
                list="claude-effort-suggestions"
                value={engines.claudeCode.effort}
                onChange={(e) => updateClaudeCode({ effort: e.target.value })}
                placeholder="例: high"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <datalist id="claude-effort-suggestions">
                <option value="high" />
                <option value="xhigh" />
                <option value="max" />
                <option value="medium" />
                <option value="low" />
              </datalist>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowClaudeAdvanced(!showClaudeAdvanced)}
              aria-expanded={showClaudeAdvanced}
              className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>高度な設定</span>
                {claudeAdvancedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                    {claudeAdvancedCount} 項目設定中
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                <span>{showClaudeAdvanced ? '閉じる' : '表示する'}</span>
                {showClaudeAdvanced ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          </div>

          {showClaudeAdvanced && (
            <div className="space-y-4 pt-1 pl-3 border-l-2 border-sky-800/40">
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  システムプロンプト / インタラクション (--append-system-prompt)
                </label>
                <textarea
                  rows={3}
                  value={engines.claudeCode.systemPrompt ?? ''}
                  onChange={(e) => updateClaudeCode({ systemPrompt: e.target.value })}
                  placeholder="例: あなたは建設的で厳格なシニアエンジニアです。指摘事項には理由と具体的な修正案を日本語で添えてください。"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono"
                />
                <p className="text-[11px] text-[#8b949e] mt-1">
                  エージェントのペルソナや振る舞い、共通のレビュー方針を規定します。CLI 実行時に --append-system-prompt として渡されます。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">
                    入力フォーマット (--input-format)
                  </label>
                  <select
                    value={engines.claudeCode.inputFormat ?? 'text'}
                    onChange={(e) => {
                      const val = e.target.value as 'text' | 'stream-json';
                      updateClaudeCode({
                        inputFormat: val,
                        ...(val === 'stream-json' ? { outputFormat: 'stream-json' } : {}),
                      });
                    }}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="text">text (標準テキスト / 単発プロンプト)</option>
                    <option value="stream-json">stream-json (NDJSON 入力)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">
                    出力フォーマット (--output-format)
                  </label>
                  <select
                    value={engines.claudeCode.outputFormat ?? 'text'}
                    onChange={(e) =>
                      updateClaudeCode({
                        outputFormat: e.target.value as 'text' | 'json' | 'stream-json',
                      })
                    }
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
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
                  value={engines.claudeCode.jsonSchema ?? ''}
                  onChange={(e) => updateClaudeCode({ jsonSchema: e.target.value })}
                  placeholder='例: {"type":"object","properties":{...}} または schema.json のファイルパス'
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y"
                />
                <p className="text-[11px] text-[#8b949e] mt-1">
                  指定時、モデルの最終出力を指定された JSON スキーマに厳格準拠（Structured Outputs）させます。
                </p>
              </div>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  許可ツール制限 (--allowed-tools)
                </label>
                <input
                  type="text"
                  value={engines.claudeCode.allowedTools ?? ''}
                  onChange={(e) => updateClaudeCode({ allowedTools: e.target.value })}
                  placeholder="例: Read, Grep, Bash(git *) (空欄で全ツール)"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-1">
                <Checkbox
                  variant="card"
                  checked={engines.claudeCode.bare}
                  onChange={(checked) => updateClaudeCode({ bare: checked })}
                  label="軽量モード (--bare)"
                  description="フックやプラグイン同期をスキップし、最小限のオーバーヘッドでレビューを実行します。"
                />
              </div>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">追加カスタム引数 (Custom Args)</label>
                <input
                  type="text"
                  value={engines.claudeCode.customArgs ?? ''}
                  onChange={(e) => updateClaudeCode({ customArgs: e.target.value })}
                  placeholder="例: --permission-mode acceptEdits"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <CommandPreview command={claudePreviewCommand} />
        </div>

        {/* 4. Mock Engine Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Mock レビューエンジン設定</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono border border-neutral-700">
              engine: mock
            </span>
          </div>

          <div className="max-w-xs">
            <label className="text-xs text-[#8b949e] block mb-1">
              疑似処理遅延時間 (ミリ秒)
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              step={100}
              value={engines.mock.delayMs}
              onChange={(e) => updateMock({ delayMs: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              テスト実行時にジョブが実行中ステータスになる時間をシミュレートします。
            </p>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs text-[#8b949e] mb-1.5">
              <Box className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-white/90">実行動作プレビュー</span>
            </div>
            <div className="bg-[#090d13] border border-[#21262d] rounded-lg p-2.5 font-mono text-xs text-neutral-400">
              プロセス起動なし (インメモリ実行 - 模擬遅延: {engines.mock.delayMs}ms)
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? '設定を保存中...' : 'エンジン設定を保存する'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
