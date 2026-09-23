import React, { useState, useEffect, useRef } from 'react';
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
  Play,
  RefreshCw,
  AlertCircle,
  Ban,
  FlaskConical,
  Plus,
  Trash2,
  Edit2,
  Star,
  X,
  Layers,
  Settings2,
} from 'lucide-react';
import { AppSettings, EngineSettingsMap, EngineProfile, EngineType } from '../../types.ts';
import {
  AntigravityFields,
  ClaudeCodeFields,
  MockFields,
} from '../../components/settings/EngineConfigFields.tsx';
import { EngineProfileModal } from '../../components/settings/EngineProfileModal.tsx';

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

interface EngineTestButtonProps {
  engineName: 'antigravity' | 'claude-code' | 'mock';
  isTesting: boolean;
  onTest: (mode: 'version' | 'execution') => void;
  disabled?: boolean;
}

function EngineTestButton({ isTesting, onTest, disabled = false }: EngineTestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <div className="inline-flex rounded-lg border border-[#30363d] overflow-hidden shadow-sm">
        {/* メインアクション: 接続テスト */}
        <button
          type="button"
          disabled={disabled || isTesting}
          onClick={() => onTest('version')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-r border-[#30363d]"
          title="CLIバイナリの存在とバージョンを検証（~1秒）"
        >
          {isTesting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>テスト中...</span>
            </>
          ) : (
            <>
              <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
              <span>接続テスト</span>
            </>
          )}
        </button>

        {/* ドロップダウントグル */}
        <button
          type="button"
          disabled={disabled || isTesting}
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-1.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="テスト方法を選択"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl z-50 p-1.5 text-xs flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onTest('version');
            }}
            className="w-full text-left p-2 rounded-lg hover:bg-[#21262d] transition-colors flex items-start gap-2.5 group"
          >
            <FlaskConical className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                接続テスト (バージョン確認)
              </div>
              <div className="text-[11px] text-[#8b949e] mt-0.5 leading-tight">
                CLIバイナリのパス・実行権限を高速検証 (~1秒)
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onTest('execution');
            }}
            className="w-full text-left p-2 rounded-lg hover:bg-[#21262d] transition-colors flex items-start gap-2.5 group"
          >
            <Play className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                実行検証 (推論テスト)
              </div>
              <div className="text-[11px] text-[#8b949e] mt-0.5 leading-tight">
                テストプロンプトを送信しAI推論の応答を確認 (~10-30秒)
              </div>
            </div>
          </button>
        </div>
      )}
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
  const [testingEngine, setTestingEngine] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; mode?: 'version' | 'execution'; version?: string; output?: string; message?: string; error?: string }>>({});

  // EngineProfile state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<EngineProfile | null>(null);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const enabledEngines = formSettings.enabledEngines ?? ['antigravity', 'claude-code', 'mock'];

  const isEngineEnabled = (engineName: string) => {
    return enabledEngines.includes(engineName);
  };

  const currentBackend = formSettings.defaultBackendId || formSettings.reviewEngine || 'antigravity';

  const defaultProfiles: EngineProfile[] = [
    {
      id: 'default-agy',
      name: 'Antigravity (Default)',
      description: 'Google Antigravity CLI エンジン',
      isDefault: currentBackend === 'antigravity',
      engineType: 'antigravity',
      config: {
        binPath: formSettings.agyBin || 'agy',
        model: 'gemini-3.1-pro',
        effort: 'high',
        timeoutSeconds: 900,
        printTimeout: '',
        sandbox: false,
        disableSlashCommands: false,
      },
    },
    {
      id: 'default-claude',
      name: 'Claude Code (Default)',
      description: 'Anthropic Claude Code CLI エンジン',
      isDefault: currentBackend === 'claude-code',
      engineType: 'claude-code',
      config: {
        binPath: formSettings.claudeBin || 'claude',
        model: 'sonnet',
        effort: 'high',
        timeoutSeconds: 900,
        allowedTools: '',
        bare: false,
        apiBaseUrl: '',
        authToken: '',
        maxTurns: 15,
      },
    },
    {
      id: 'default-mock',
      name: 'Mock Engine',
      description: 'テスト用のモックエンジン',
      isDefault: currentBackend === 'mock',
      engineType: 'mock',
      config: {
        delayMs: 500,
      },
    },
  ];

  const profiles: EngineProfile[] =
    formSettings.engineProfiles && formSettings.engineProfiles.length > 0
      ? formSettings.engineProfiles
      : defaultProfiles;

  const toggleEngineEnabled = (engineName: string) => {
    if (enabledEngines.includes(engineName)) {
      if (enabledEngines.length <= 1) {
        onShowError('少なくとも1つのエンジンを有効にしておく必要があります');
        return;
      }
      const next = enabledEngines.filter((id) => id !== engineName);
      let nextBackend = currentBackend;
      if (currentBackend === engineName) {
        nextBackend = next[0] ?? 'antigravity';
      }
      setFormSettings((prev) => ({
        ...prev,
        enabledEngines: next,
        reviewEngine: nextBackend as any,
        defaultBackendId: nextBackend,
      }));
    } else {
      setFormSettings((prev) => ({
        ...prev,
        enabledEngines: [...enabledEngines, engineName],
      }));
    }
  };

  const handleTestEngine = async (
    engineName: 'antigravity' | 'claude-code' | 'mock' | string,
    mode: 'version' | 'execution' = 'version',
    customConfig?: any
  ) => {
    setTestingEngine(engineName);
    try {
      let binPath: string | undefined;
      let model: string | undefined;
      let effort: string | undefined;
      let apiBaseUrl: string | undefined;
      let authToken: string | undefined;

      if (customConfig) {
        binPath = customConfig.binPath;
        model = customConfig.model;
        effort = customConfig.effort;
        apiBaseUrl = customConfig.apiBaseUrl;
        authToken = customConfig.authToken;
      } else if (engineName === 'antigravity') {
        binPath = engines.antigravity.binPath;
        model = engines.antigravity.model;
        effort = engines.antigravity.effort;
      } else if (engineName === 'claude-code') {
        binPath = engines.claudeCode.binPath;
        model = engines.claudeCode.model;
        effort = engines.claudeCode.effort;
        apiBaseUrl = engines.claudeCode.apiBaseUrl;
        authToken = engines.claudeCode.authToken;
      }

      const res = await fetch(`/api/engines/${engineName}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, binPath, model, effort, apiBaseUrl, authToken }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [engineName]: data,
      }));
      if (data.success) {
        onShowSuccess(data.message || `${engineName} のテストに成功しました`);
      } else {
        onShowError(data.error || `${engineName} のテストに失敗しました`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'テストの実行に失敗しました';
      setTestResults((prev) => ({
        ...prev,
        [engineName]: { success: false, mode, error: errorMsg },
      }));
      onShowError(errorMsg);
    } finally {
      setTestingEngine(null);
    }
  };

  const handleOpenCreateProfile = () => {
    setEditingProfile(null);
    setIsProfileModalOpen(true);
  };

  const handleOpenEditProfile = (profile: EngineProfile) => {
    setEditingProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (saved: EngineProfile) => {
    let nextProfiles: EngineProfile[];
    const exists = profiles.some((p) => p.id === saved.id);

    if (saved.isDefault) {
      nextProfiles = profiles.map((p) => ({
        ...p,
        isDefault: p.id === saved.id,
      }));
      if (!exists) {
        nextProfiles.push(saved);
      } else {
        nextProfiles = nextProfiles.map((p) => (p.id === saved.id ? saved : p));
      }
    } else {
      if (exists) {
        nextProfiles = profiles.map((p) => (p.id === saved.id ? saved : p));
      } else {
        nextProfiles = [...profiles, saved];
      }
    }

    const updatedSettings: AppSettings = {
      ...formSettings,
      engineProfiles: nextProfiles,
      ...(saved.isDefault
        ? {
            defaultEngineProfileId: saved.id,
            defaultBackendId: saved.engineType,
            reviewEngine: saved.engineType as any,
          }
        : {}),
    };

    setFormSettings(updatedSettings);
    await onSaveSettings(updatedSettings);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      onShowError('少なくとも1つのプロファイルを保持する必要があります');
      return;
    }
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    if (!confirm(`プロファイル「${target.name}」を削除してもよろしいですか？`)) {
      return;
    }

    let nextProfiles = profiles.filter((p) => p.id !== profileId);
    let nextDefaultId = formSettings.defaultEngineProfileId;

    if (target.isDefault && nextProfiles.length > 0) {
      nextProfiles = nextProfiles.map((p, idx) => ({
        ...p,
        isDefault: idx === 0,
      }));
      nextDefaultId = nextProfiles[0].id;
    }

    const updatedSettings: AppSettings = {
      ...formSettings,
      engineProfiles: nextProfiles,
      defaultEngineProfileId: nextDefaultId,
    };

    setFormSettings(updatedSettings);
    await onSaveSettings(updatedSettings);
    onShowSuccess(`プロファイル「${target.name}」を削除しました`);
  };

  const handleDuplicateProfile = async (profile: EngineProfile) => {
    const newId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duplicated: EngineProfile = {
      ...profile,
      id: newId,
      name: `${profile.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextProfiles = [...profiles, duplicated];
    const updatedSettings: AppSettings = {
      ...formSettings,
      engineProfiles: nextProfiles,
    };

    setFormSettings(updatedSettings);
    await onSaveSettings(updatedSettings);
    onShowSuccess(`プロファイル「${duplicated.name}」を複製しました`);
  };

  const handleSetDefaultProfile = async (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;

    const nextProfiles = profiles.map((p) => ({
      ...p,
      isDefault: p.id === profileId,
    }));

    const updatedSettings: AppSettings = {
      ...formSettings,
      engineProfiles: nextProfiles,
      defaultEngineProfileId: profileId,
      defaultBackendId: target.engineType,
      reviewEngine: target.engineType as any,
    };

    setFormSettings(updatedSettings);
    await onSaveSettings(updatedSettings);
    onShowSuccess(`「${target.name}」をシステム既定プロファイルに設定しました`);
  };

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
              disabled={!isEngineEnabled('antigravity')}
              onClick={() =>
                setFormSettings({
                  ...formSettings,
                  reviewEngine: 'antigravity',
                  defaultBackendId: 'antigravity',
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                !isEngineEnabled('antigravity')
                  ? 'border-[#30363d]/50 bg-[#0d1117]/50 opacity-50 cursor-not-allowed text-[#8b949e]'
                  : currentBackend === 'antigravity'
                  ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              <div className="font-semibold text-sm text-sky-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>antigravity</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {!isEngineEnabled('antigravity') && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      無効化中
                    </span>
                  )}
                  {currentBackend === 'antigravity' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Google agy CLI を使用（推奨）。Gemini による多段階推論レビューを実行します。
              </p>
            </button>

            <button
              type="button"
              disabled={!isEngineEnabled('claude-code')}
              onClick={() =>
                setFormSettings({
                  ...formSettings,
                  reviewEngine: 'claude-code',
                  defaultBackendId: 'claude-code',
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                !isEngineEnabled('claude-code')
                  ? 'border-[#30363d]/50 bg-[#0d1117]/50 opacity-50 cursor-not-allowed text-[#8b949e]'
                  : currentBackend === 'claude-code'
                  ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              <div className="font-semibold text-sm text-sky-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>claude-code</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {!isEngineEnabled('claude-code') && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      無効化中
                    </span>
                  )}
                  {currentBackend === 'claude-code' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                claude -p を使用。Claude Code による自律型コードレビューを実行します。
              </p>
            </button>

            <button
              type="button"
              disabled={!isEngineEnabled('mock')}
              onClick={() =>
                setFormSettings({
                  ...formSettings,
                  reviewEngine: 'mock',
                  defaultBackendId: 'mock',
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                !isEngineEnabled('mock')
                  ? 'border-[#30363d]/50 bg-[#0d1117]/50 opacity-50 cursor-not-allowed text-[#8b949e]'
                  : currentBackend === 'mock'
                  ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              <div className="font-semibold text-sm text-sky-400 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Box className="w-4 h-4" />
                  <span>mock</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {!isEngineEnabled('mock') && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      無効化中
                    </span>
                  )}
                  {currentBackend === 'mock' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                テスト用モック。API 呼び出しを行わず、即座にダミー結果を生成します。
              </p>
            </button>
          </div>
        </div>

        {/* 1.5 Engine Profiles Section */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#30363d]">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">登録済みエンジンプロファイル</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                  {profiles.length} 件
                </span>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">
                モデルや接続先（Ollama ローカル推論、Claude CLI、Gemini 等）を個別のプロファイルとして定義できます。レビュールールごとに異なるプロファイルを割り当て可能です。
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>プロファイルを追加</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {profiles.map((p) => {
              const isDef = Boolean(p.isDefault);
              const model = p.engineType === 'mock' ? 'N/A' : (p.config as any).model;
              const apiBaseUrl = p.engineType === 'claude-code' ? (p.config as any).apiBaseUrl : undefined;
              const isThisTesting = testingEngine === p.id;
              const result = testResults[p.id];

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDef
                      ? 'border-sky-500/60 bg-sky-950/20 shadow-sm'
                      : 'border-[#30363d] bg-[#0d1117]/80 hover:border-[#8b949e]/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white truncate">
                          {p.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-sky-300 border border-[#30363d]">
                          {p.engineType === 'claude-code' && <Terminal className="w-3 h-3" />}
                          {p.engineType === 'antigravity' && <Cpu className="w-3 h-3" />}
                          {p.engineType === 'mock' && <Box className="w-3 h-3" />}
                          <span>{p.engineType}</span>
                        </span>
                        {isDef && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>システム既定</span>
                          </span>
                        )}
                      </div>

                      {p.description && (
                        <p className="text-xs text-[#8b949e] line-clamp-1">{p.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-[#8b949e] font-mono pt-1 flex-wrap">
                        <div>モデル: <span className="text-[#c9d1d9]">{model || '未指定'}</span></div>
                        {apiBaseUrl && (
                          <div>Base URL: <span className="text-sky-300">{apiBaseUrl}</span></div>
                        )}
                        <div>タイムアウト: <span className="text-[#c9d1d9]">{p.engineType === 'mock' ? `${(p.config as any).delayMs}ms` : `${(p.config as any).timeoutSeconds ?? 900}s`}</span></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#21262d]">
                      {/* テスト実行ボタン */}
                      <EngineTestButton
                        engineName={p.engineType}
                        isTesting={isThisTesting}
                        onTest={(mode) => handleTestEngine(p.id, mode, p.config)}
                      />

                      {!isDef && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultProfile(p.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white rounded-lg border border-[#30363d] transition-colors"
                          title="このプロファイルをシステム既定にする"
                        >
                          既定に設定
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditProfile(p)}
                        className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-colors border border-[#30363d]"
                        title="プロファイルを編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateProfile(p)}
                        className="p-1.5 text-[#8b949e] hover:text-white hover:bg-[#21262d] rounded-lg transition-colors border border-[#30363d]"
                        title="プロファイルを複製"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={profiles.length <= 1}
                        onClick={() => handleDeleteProfile(p.id)}
                        className="p-1.5 text-[#8b949e] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors border border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed"
                        title="プロファイルを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {result && (
                    <div
                      className={`mt-3 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                        result.success
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : 'bg-red-950/20 border-red-800/40 text-red-300'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold">
                          {result.success ? 'テスト成功' : 'テスト失敗'}
                          {result.version && ` (${result.version})`}
                        </div>
                        <div className="text-[11px] text-[#8b949e]">{result.message || result.error}</div>
                        {result.output && (
                          <pre className="font-mono text-[10px] bg-black/40 p-2 rounded mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {result.output}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Antigravity CLI Settings Card */}
        <div className={`bg-[#161b22] border rounded-xl p-5 space-y-4 transition-all ${
          isEngineEnabled('antigravity') ? 'border-[#30363d]' : 'border-[#30363d]/50 opacity-80'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Antigravity CLI (agy) 設定</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 font-mono border border-sky-800/60">
                engine: antigravity
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => toggleEngineEnabled('antigravity')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                  isEngineEnabled('antigravity')
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
                    : 'bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-white'
                }`}
                title={isEngineEnabled('antigravity') ? 'クリックして無効化' : 'クリックして有効化'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEngineEnabled('antigravity') ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                <span>{isEngineEnabled('antigravity') ? '有効' : '無効'}</span>
              </button>

              <EngineTestButton
                engineName="antigravity"
                isTesting={testingEngine === 'antigravity'}
                onTest={(mode) => handleTestEngine('antigravity', mode)}
                disabled={!isEngineEnabled('antigravity')}
              />
            </div>
          </div>

          {testResults.antigravity && (
            testResults.antigravity.success ? (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="font-semibold">{testResults.antigravity.message}</span>
                  </div>
                  {testResults.antigravity.version && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/60 shrink-0">
                      {testResults.antigravity.version}
                    </span>
                  )}
                </div>
                {testResults.antigravity.output && (
                  <div className="pt-1">
                    <div className="text-[10px] text-emerald-400/80 mb-1 font-mono">推論レスポンス:</div>
                    <pre className="font-mono text-[11px] text-emerald-200 whitespace-pre-wrap break-all bg-[#0d1117] p-2 rounded border border-emerald-900/60">
                      {testResults.antigravity.output}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testResults.antigravity.mode === 'execution' ? '実行検証（推論テスト）に失敗しました' : '接続テストに失敗しました'}</span>
                </div>
                <pre className="font-mono text-[11px] text-rose-200 whitespace-pre-wrap break-all bg-[#0d1117] p-2.5 rounded border border-rose-900/60">
                  {testResults.antigravity.error}
                </pre>
              </div>
            )
          )}

          {!isEngineEnabled('antigravity') && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              <Ban className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>このエンジンは現在無効化されています。ルール実行やデフォルトエンジンとしては選択・実行されません。</span>
            </div>
          )}

          <AntigravityFields
            values={engines.antigravity}
            onChange={updateAntigravity}
            showAdvanced={showAgyAdvanced}
            onToggleAdvanced={() => setShowAgyAdvanced(!showAgyAdvanced)}
            disabled={!isEngineEnabled('antigravity')}
          />

          <CommandPreview command={agyPreviewCommand} />
        </div>

        {/* 3. Claude Code Settings Card */}
        <div className={`bg-[#161b22] border rounded-xl p-5 space-y-4 transition-all ${
          isEngineEnabled('claude-code') ? 'border-[#30363d]' : 'border-[#30363d]/50 opacity-80'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Claude Code (claude) 設定</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 font-mono border border-purple-800/60">
                engine: claude-code
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => toggleEngineEnabled('claude-code')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                  isEngineEnabled('claude-code')
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
                    : 'bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-white'
                }`}
                title={isEngineEnabled('claude-code') ? 'クリックして無効化' : 'クリックして有効化'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEngineEnabled('claude-code') ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                <span>{isEngineEnabled('claude-code') ? '有効' : '無効'}</span>
              </button>

              <EngineTestButton
                engineName="claude-code"
                isTesting={testingEngine === 'claude-code'}
                onTest={(mode) => handleTestEngine('claude-code', mode)}
                disabled={!isEngineEnabled('claude-code')}
              />
            </div>
          </div>

          {testResults['claude-code'] && (
            testResults['claude-code'].success ? (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="font-semibold">{testResults['claude-code'].message}</span>
                  </div>
                  {testResults['claude-code'].version && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/60 shrink-0">
                      {testResults['claude-code'].version}
                    </span>
                  )}
                </div>
                {testResults['claude-code'].output && (
                  <div className="pt-1">
                    <div className="text-[10px] text-emerald-400/80 mb-1 font-mono">推論レスポンス:</div>
                    <pre className="font-mono text-[11px] text-emerald-200 whitespace-pre-wrap break-all bg-[#0d1117] p-2 rounded border border-emerald-900/60">
                      {testResults['claude-code'].output}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testResults['claude-code'].mode === 'execution' ? '実行検証（推論テスト）に失敗しました' : '接続テストに失敗しました'}</span>
                </div>
                <pre className="font-mono text-[11px] text-rose-200 whitespace-pre-wrap break-all bg-[#0d1117] p-2.5 rounded border border-rose-900/60">
                  {testResults['claude-code'].error}
                </pre>
              </div>
            )
          )}

          {!isEngineEnabled('claude-code') && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              <Ban className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>このエンジンは現在無効化されています。ルール実行やデフォルトエンジンとしては選択・実行されません。</span>
            </div>
          )}

          <ClaudeCodeFields
            values={engines.claudeCode}
            onChange={updateClaudeCode}
            showAdvanced={showClaudeAdvanced}
            onToggleAdvanced={() => setShowClaudeAdvanced(!showClaudeAdvanced)}
            disabled={!isEngineEnabled('claude-code')}
          />

          <CommandPreview command={claudePreviewCommand} />
        </div>

        {/* 4. Mock Engine Settings Card */}
        <div className={`bg-[#161b22] border rounded-xl p-5 space-y-4 transition-all ${
          isEngineEnabled('mock') ? 'border-[#30363d]' : 'border-[#30363d]/50 opacity-80'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Mock レビューエンジン設定</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono border border-neutral-700">
                engine: mock
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => toggleEngineEnabled('mock')}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                  isEngineEnabled('mock')
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
                    : 'bg-[#21262d] text-[#8b949e] border-[#30363d] hover:text-white'
                }`}
                title={isEngineEnabled('mock') ? 'クリックして無効化' : 'クリックして有効化'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEngineEnabled('mock') ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                <span>{isEngineEnabled('mock') ? '有効' : '無効'}</span>
              </button>

              <EngineTestButton
                engineName="mock"
                isTesting={testingEngine === 'mock'}
                onTest={(mode) => handleTestEngine('mock', mode)}
                disabled={!isEngineEnabled('mock')}
              />
            </div>
          </div>

          {testResults.mock && (
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="font-semibold">{testResults.mock.message}</span>
                </div>
                {testResults.mock.version && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/60 shrink-0">
                    {testResults.mock.version}
                  </span>
                )}
              </div>
              {testResults.mock.output && (
                <div className="pt-1">
                  <div className="text-[10px] text-emerald-400/80 mb-1 font-mono">シミュレート結果:</div>
                  <pre className="font-mono text-[11px] text-emerald-200 whitespace-pre-wrap break-all bg-[#0d1117] p-2 rounded border border-emerald-900/60">
                    {testResults.mock.output}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!isEngineEnabled('mock') && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              <Ban className="w-4 h-4 shrink-0 text-neutral-500" />
              <span>このエンジンは現在無効化されています。ルール実行やデフォルトエンジンとしては選択・実行されません。</span>
            </div>
          )}

          <div className="max-w-xs">
            <MockFields
              values={engines.mock}
              onChange={updateMock}
              disabled={!isEngineEnabled('mock')}
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

      {/* Engine Profile Modal */}
      <EngineProfileModal
        isOpen={isProfileModalOpen}
        profile={editingProfile}
        existingProfiles={profiles}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
        onShowSuccess={onShowSuccess}
        onShowError={onShowError}
      />
    </div>
  );
}
