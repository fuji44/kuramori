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
import {
  AntigravityFields,
  ClaudeCodeFields,
  MockFields,
} from '../../components/settings/EngineConfigFields.tsx';

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
      const normalizedSettings: AppSettings = {
        ...formSettings,
        engineSettings: {
          antigravity: {
            ...engines.antigravity,
            timeoutSeconds: Number(engines.antigravity.timeoutSeconds) || 900,
          },
          claudeCode: {
            ...engines.claudeCode,
            timeoutSeconds: Number(engines.claudeCode.timeoutSeconds) || 900,
          },
          mock: {
            ...engines.mock,
            delayMs:
              Number(engines.mock.delayMs) >= 0 ? Number(engines.mock.delayMs) : 500,
          },
        },
      };

      await onSaveSettings(normalizedSettings);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Cpu className="w-5 h-5 text-sky-400" />
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">エンジン</h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            デフォルト実行エンジンの選択と、各 AI エージェント CLI（Antigravity, Claude Code, Mock）の動作パラメータを管理します。
          </p>
        </div>
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

          <AntigravityFields
            values={engines.antigravity}
            onChange={updateAntigravity}
            showAdvanced={showAgyAdvanced}
            onToggleAdvanced={() => setShowAgyAdvanced(!showAgyAdvanced)}
          />

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

          <ClaudeCodeFields
            values={engines.claudeCode}
            onChange={updateClaudeCode}
            showAdvanced={showClaudeAdvanced}
            onToggleAdvanced={() => setShowClaudeAdvanced(!showClaudeAdvanced)}
          />

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
            <MockFields
              values={engines.mock}
              onChange={updateMock}
            />
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
