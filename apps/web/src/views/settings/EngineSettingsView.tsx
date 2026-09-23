import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Terminal,
  Box,
  Copy,
  Check,
  ChevronDown,
  Play,
  RefreshCw,
  AlertCircle,
  FlaskConical,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Save,
} from 'lucide-react';
import {
  AppSettings,
  EngineProfile,
  EngineType,
  ClaudeCodeEngineConfig,
  AntigravityEngineConfig,
  MockEngineConfig,
} from '../../types.ts';
import {
  AntigravityFields,
  ClaudeCodeFields,
  MockFields,
} from '../../components/settings/EngineConfigFields.tsx';
import {
  SettingCard,
  SettingBadge,
  SettingActionButton,
} from '../../components/settings/SettingCard.tsx';
import {
  SettingViewHeader,
  SettingFormHeader,
  SettingEmptyState,
  SettingFormFooter,
} from '../../components/settings/SettingViewLayout.tsx';

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
          className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
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
        <button
          type="button"
          disabled={disabled || isTesting}
          onClick={() => onTest('version')}
          className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-r border-[#30363d] cursor-pointer flex items-center justify-center"
          title="接続テスト (バージョン確認 ~1秒)"
        >
          {isTesting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
          ) : (
            <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
          )}
        </button>

        <button
          type="button"
          disabled={disabled || isTesting}
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-1 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          title="テスト方法を選択"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl z-50 p-1.5 text-xs flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onTest('version');
            }}
            className="w-full text-left p-2 rounded-lg hover:bg-[#21262d] transition-colors flex items-start gap-2.5 group cursor-pointer"
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
            className="w-full text-left p-2 rounded-lg hover:bg-[#21262d] transition-colors flex items-start gap-2.5 group cursor-pointer"
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
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [testingProfileId, setTestingProfileId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        mode?: 'version' | 'execution';
        version?: string;
        output?: string;
        message?: string;
        error?: string;
      }
    >
  >({});

  // フォーム用ステート
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formEngineType, setFormEngineType] = useState<EngineType>('claude-code');

  const [formClaudeConfig, setFormClaudeConfig] = useState<ClaudeCodeEngineConfig>({
    binPath: 'claude',
    model: 'ornith-1.5:9b',
    effort: 'high',
    timeoutSeconds: 900,
    allowedTools: '',
    bare: false,
    apiBaseUrl: 'http://localhost:11434',
    authToken: '',
    maxTurns: 15,
  });

  const [formAgyConfig, setFormAgyConfig] = useState<AntigravityEngineConfig>({
    binPath: 'agy',
    model: 'gemini-3.1-pro',
    effort: 'high',
    timeoutSeconds: 900,
    printTimeout: '',
    sandbox: false,
    disableSlashCommands: false,
  });

  const [formMockConfig, setFormMockConfig] = useState<MockEngineConfig>({
    delayMs: 500,
  });

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const defaultProfiles: EngineProfile[] = [
    {
      id: 'default-agy',
      name: 'Antigravity (Default)',
      description: 'Google Antigravity CLI エンジン',
      isDefault: (formSettings.defaultBackendId || formSettings.reviewEngine || 'antigravity') === 'antigravity',
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
      isDefault: (formSettings.defaultBackendId || formSettings.reviewEngine) === 'claude-code',
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
      isDefault: (formSettings.defaultBackendId || formSettings.reviewEngine) === 'mock',
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

  const isFormMode = isCreatingProfile || editingProfileId !== null;

  const handleStartCreate = () => {
    setEditingProfileId(null);
    setIsCreatingProfile(true);
    setFormName('');
    setFormDescription('');
    setFormIsDefault(profiles.length === 0);
    setFormEngineType('claude-code');
    setFormClaudeConfig({
      binPath: 'claude',
      model: 'ornith-1.5:9b',
      effort: 'high',
      timeoutSeconds: 900,
      allowedTools: '',
      bare: false,
      apiBaseUrl: 'http://localhost:11434',
      authToken: '',
      maxTurns: 15,
    });
    setFormAgyConfig({
      binPath: 'agy',
      model: 'gemini-3.1-pro',
      effort: 'high',
      timeoutSeconds: 900,
      printTimeout: '',
      sandbox: false,
      disableSlashCommands: false,
    });
    setFormMockConfig({ delayMs: 500 });
  };

  const handleStartEdit = (profile: EngineProfile) => {
    setEditingProfileId(profile.id);
    setIsCreatingProfile(false);
    setFormName(profile.name);
    setFormDescription(profile.description ?? '');
    setFormIsDefault(Boolean(profile.isDefault));
    setFormEngineType(profile.engineType);

    if (profile.engineType === 'claude-code') {
      setFormClaudeConfig({ ...profile.config });
    } else if (profile.engineType === 'antigravity') {
      setFormAgyConfig({ ...profile.config });
    } else if (profile.engineType === 'mock') {
      setFormMockConfig({ ...profile.config });
    }
  };

  const handleCancelForm = () => {
    setIsCreatingProfile(false);
    setEditingProfileId(null);
  };

  const handleSaveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowError('プロファイル名を入力してください');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = editingProfileId ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      let savedProfile: EngineProfile;

      if (formEngineType === 'claude-code') {
        savedProfile = {
          id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          isDefault: formIsDefault,
          engineType: 'claude-code',
          config: {
            ...formClaudeConfig,
            timeoutSeconds: Number(formClaudeConfig.timeoutSeconds) || 900,
            maxTurns: formClaudeConfig.maxTurns ? Number(formClaudeConfig.maxTurns) : undefined,
          },
          createdAt: now,
          updatedAt: now,
        };
      } else if (formEngineType === 'antigravity') {
        savedProfile = {
          id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          isDefault: formIsDefault,
          engineType: 'antigravity',
          config: {
            ...formAgyConfig,
            timeoutSeconds: Number(formAgyConfig.timeoutSeconds) || 900,
          },
          createdAt: now,
          updatedAt: now,
        };
      } else {
        savedProfile = {
          id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          isDefault: formIsDefault,
          engineType: 'mock',
          config: {
            delayMs: Number(formMockConfig.delayMs) >= 0 ? Number(formMockConfig.delayMs) : 500,
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      let nextProfiles: EngineProfile[];
      const exists = profiles.some((p) => p.id === id);

      if (formIsDefault) {
        nextProfiles = profiles.map((p) => ({
          ...p,
          isDefault: p.id === id,
        }));
        if (!exists) {
          nextProfiles.push(savedProfile);
        } else {
          nextProfiles = nextProfiles.map((p) => (p.id === id ? savedProfile : p));
        }
      } else {
        if (exists) {
          nextProfiles = profiles.map((p) => (p.id === id ? savedProfile : p));
        } else {
          nextProfiles = [...profiles, savedProfile];
        }
      }

      const updatedSettings: AppSettings = {
        ...formSettings,
        engineProfiles: nextProfiles,
        ...(formIsDefault
          ? {
              defaultEngineProfileId: savedProfile.id,
              defaultBackendId: savedProfile.engineType,
              reviewEngine: savedProfile.engineType as any,
            }
          : {}),
      };

      setFormSettings(updatedSettings);
      await onSaveSettings(updatedSettings);
      onShowSuccess(`プロファイル「${savedProfile.name}」を保存しました`);
      handleCancelForm();
    } catch {
      onShowError('プロファイルの保存に失敗しました');
    } finally {
      setSaving(false);
    }
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

  const handleTest = async (
    targetId: string,
    engineType: EngineType,
    config: any,
    mode: 'version' | 'execution' = 'version'
  ) => {
    setTestingProfileId(targetId);
    try {
      const res = await fetch(`/api/engines/${engineType}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          binPath: config.binPath,
          model: config.model,
          effort: config.effort,
          apiBaseUrl: config.apiBaseUrl,
          authToken: config.authToken,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [targetId]: data,
      }));
      if (data.success) {
        onShowSuccess(data.message || '接続テストに成功しました');
      } else {
        onShowError(data.error || 'テストに失敗しました');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'テスト実行エラー';
      setTestResults((prev) => ({
        ...prev,
        [targetId]: { success: false, mode, error: errorMsg },
      }));
      onShowError(errorMsg);
    } finally {
      setTestingProfileId(null);
    }
  };

  // コマンドプレビュー計算
  const previewCommand = (() => {
    if (formEngineType === 'antigravity') {
      const parts = [
        formAgyConfig.binPath || 'agy',
        '--new-project',
        '-p',
        '"<prompt>"',
        '--dangerously-skip-permissions',
      ];
      if (formAgyConfig.model) parts.push('--model', formAgyConfig.model);
      if (formAgyConfig.effort) parts.push('--effort', formAgyConfig.effort);
      if (formAgyConfig.printTimeout?.trim()) {
        const val = formAgyConfig.printTimeout.trim();
        const formatted = /^\d+$/.test(val) ? `${val}s` : val;
        parts.push('--print-timeout', formatted);
      }
      if (formAgyConfig.sandbox) parts.push('--sandbox');
      if (formAgyConfig.disableSlashCommands) parts.push('--disable-slash-commands');
      if (formAgyConfig.customArgs?.trim()) {
        parts.push(...formAgyConfig.customArgs.trim().split(/\s+/));
      }
      return parts.join(' ');
    }
    if (formEngineType === 'claude-code') {
      const parts: string[] = [];
      if (formClaudeConfig.apiBaseUrl?.trim()) {
        parts.push(`ANTHROPIC_BASE_URL="${formClaudeConfig.apiBaseUrl.trim()}"`);
      }
      if (formClaudeConfig.authToken?.trim()) {
        parts.push(`ANTHROPIC_AUTH_TOKEN="***"`);
      }
      parts.push(formClaudeConfig.binPath || 'claude', '-p', '"<prompt>"', '--dangerously-skip-permissions');
      if (formClaudeConfig.model) parts.push('--model', formClaudeConfig.model);
      if (formClaudeConfig.effort) parts.push('--effort', formClaudeConfig.effort);
      if (formClaudeConfig.maxTurns && formClaudeConfig.maxTurns > 0) {
        parts.push('--max-turns', String(formClaudeConfig.maxTurns));
      }
      if (formClaudeConfig.bare) parts.push('--bare');
      if (formClaudeConfig.customArgs?.trim()) {
        parts.push(...formClaudeConfig.customArgs.trim().split(/\s+/));
      }
      return parts.join(' ');
    }
    return `プロセス起動なし (Mock 遅延: ${formMockConfig.delayMs}ms)`;
  })();

  // 1. 個別設定フォーム表示モード
  if (isFormMode) {
    const currentConfig =
      formEngineType === 'claude-code'
        ? formClaudeConfig
        : formEngineType === 'antigravity'
        ? formAgyConfig
        : formMockConfig;

    const currentTestResult = testResults['current-form'];

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingFormHeader
          icon={<Cpu className="w-5 h-5" />}
          backLabel="エンジンプロファイル一覧に戻る"
          onBack={handleCancelForm}
          title={editingProfileId ? 'エンジンプロファイルを編集' : '新規エンジンプロファイルを作成'}
          description={
            editingProfileId
              ? `「${formName || 'プロファイル'}」のモデル、接続先、推論パラメータを設定します。`
              : 'Ollama ローカル推論やクラウド AI CLI の新しいプロファイルを定義します。'
          }
        />

        <form
          onSubmit={handleSaveProfileForm}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-6 animate-in fade-in duration-150"
        >
          {/* 基本情報 */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#8b949e] block mb-1">
                  プロファイル名 *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: Ollama (ornith-1.5:9b), Claude 3.7 Cloud, Fast Haiku"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] block mb-1">
                  説明 (任意)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="例: ローカル RTX 5080 で高速実行する Ollama 推論プロファイル"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* エンジン種別選択 */}
            <div>
              <label className="text-xs font-semibold text-[#8b949e] block mb-1.5">
                エンジン種別
              </label>
              {!editingProfileId ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormEngineType('claude-code')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formEngineType === 'claude-code'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <Terminal className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">Claude Code</div>
                      <div className="text-[11px] text-[#8b949e]">Ollama / Claude CLI</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormEngineType('antigravity')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formEngineType === 'antigravity'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <Cpu className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">Antigravity</div>
                      <div className="text-[11px] text-[#8b949e]">Google agy CLI</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormEngineType('mock')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formEngineType === 'mock'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <Box className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">Mock</div>
                      <div className="text-[11px] text-[#8b949e]">テスト用ダミー</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-sky-400 font-mono">
                  {formEngineType === 'claude-code' && <Terminal className="w-3.5 h-3.5" />}
                  {formEngineType === 'antigravity' && <Cpu className="w-3.5 h-3.5" />}
                  {formEngineType === 'mock' && <Box className="w-3.5 h-3.5" />}
                  <span>{formEngineType}</span>
                </div>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c9d1d9]">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded bg-[#0d1117] border-[#30363d] text-sky-500 focus:ring-sky-500/30"
                />
                <span>システム既定のプロファイルとして使用する（レビュールールで default 指定時に適用）</span>
              </label>
            </div>
          </div>

          {/* 動作パラメータ設定 */}
          <div className="border-t border-[#30363d] pt-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  動作パラメータ設定 ({formEngineType})
                </h4>
              </div>

              {/* フォーム内でのテスト実行 */}
              <div className="flex items-center gap-2">
                <EngineTestButton
                  isTesting={testingProfileId === 'current-form'}
                  onTest={(mode) => handleTest('current-form', formEngineType, currentConfig, mode)}
                />
              </div>
            </div>

            {currentTestResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  currentTestResult.success
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/30 border-red-800/50 text-red-300'
                }`}
              >
                {currentTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                )}
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold">
                    {currentTestResult.success ? 'テスト成功' : 'テスト失敗'}
                    {currentTestResult.version && ` (${currentTestResult.version})`}
                  </div>
                  <div>{currentTestResult.message || currentTestResult.error}</div>
                  {currentTestResult.output && (
                    <pre className="font-mono text-[11px] bg-black/40 p-2 rounded mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {currentTestResult.output}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {formEngineType === 'claude-code' && (
              <ClaudeCodeFields
                values={formClaudeConfig}
                onChange={(updates) => setFormClaudeConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}

            {formEngineType === 'antigravity' && (
              <AntigravityFields
                values={formAgyConfig}
                onChange={(updates) => setFormAgyConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}

            {formEngineType === 'mock' && (
              <MockFields
                values={formMockConfig}
                onChange={(updates) => setFormMockConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}

            <CommandPreview command={previewCommand} />
          </div>

          {/* Form Actions */}
          <SettingFormFooter
            onCancel={handleCancelForm}
            submitLabel="プロファイルを保存"
            saving={saving}
          />
        </form>
      </div>
    );
  }

  // 2. 一覧表示モード
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <SettingViewHeader
        icon={<Cpu className="w-5 h-5" />}
        title="AI 実行エンジン"
        description="レビューを実行する AI エージェント CLI / バックエンドのプロファイルを管理します。"
        action={{
          label: '新しいプロファイルを追加',
          onClick: handleStartCreate,
        }}
      />

      {/* Profile List */}
      <div className="space-y-3">
        {profiles.length === 0 ? (
          <SettingEmptyState
            icon={<Cpu className="w-8 h-8" />}
            message="エンジンプロファイルが登録されていません。"
            description="プロファイルを追加して、AI レビュー実行エンジンを設定してください。"
            action={{
              label: '最初のプロファイルを作成',
              onClick: handleStartCreate,
            }}
          />
        ) : (
          profiles.map((p) => {
          const isDef = Boolean(p.isDefault);
          const model = p.engineType === 'mock' ? 'N/A' : (p.config as any).model;
          const apiBaseUrl = p.engineType === 'claude-code' ? (p.config as any).apiBaseUrl : undefined;
          const isThisTesting = testingProfileId === p.id;
          const result = testResults[p.id];

          return (
            <SettingCard
              key={p.id}
              isDefault={isDef}
              title={p.name}
              badges={
                <>
                  <SettingBadge
                    variant="neutral"
                    icon={
                      p.engineType === 'claude-code' ? (
                        <Terminal className="w-3 h-3" />
                      ) : p.engineType === 'antigravity' ? (
                        <Cpu className="w-3 h-3" />
                      ) : (
                        <Box className="w-3 h-3" />
                      )
                    }
                  >
                    {p.engineType}
                  </SettingBadge>
                  {isDef && (
                    <SettingBadge variant="default" icon={<CheckCircle2 className="w-3 h-3" />}>
                      既定
                    </SettingBadge>
                  )}
                </>
              }
              description={p.description}
              metadata={
                <>
                  <div>
                    モデル: <span className="text-[#c9d1d9]">{model || '未指定'}</span>
                  </div>
                  {apiBaseUrl && (
                    <div>
                      Base URL: <span className="text-sky-300">{apiBaseUrl}</span>
                    </div>
                  )}
                  <div>
                    タイムアウト:{' '}
                    <span className="text-[#c9d1d9]">
                      {p.engineType === 'mock'
                        ? `${(p.config as any).delayMs}ms`
                        : `${(p.config as any).timeoutSeconds ?? 900}s`}
                    </span>
                  </div>
                </>
              }
              actions={
                <>
                  {/* 1. 既定トグルボタン (最左に固定) */}
                  <SettingActionButton
                    active={isDef}
                    disabled={isDef}
                    onClick={() => handleSetDefaultProfile(p.id)}
                    title={isDef ? 'システム既定のプロファイルです' : 'このプロファイルをシステム既定にする'}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isDef ? 'fill-emerald-400/20' : ''}`} />
                  </SettingActionButton>

                  {/* 2. テスト実行ボタン */}
                  <EngineTestButton
                    isTesting={isThisTesting}
                    onTest={(mode) => handleTest(p.id, p.engineType, p.config, mode)}
                  />

                  {/* 3. 編集ボタン */}
                  <SettingActionButton onClick={() => handleStartEdit(p)} title="プロファイルを編集">
                    <Edit2 className="w-3.5 h-3.5" />
                  </SettingActionButton>

                  {/* 4. 複製ボタン */}
                  <SettingActionButton onClick={() => handleDuplicateProfile(p)} title="プロファイルを複製">
                    <Copy className="w-3.5 h-3.5" />
                  </SettingActionButton>

                  {/* 5. 削除ボタン */}
                  <SettingActionButton
                    danger
                    disabled={profiles.length <= 1}
                    onClick={() => handleDeleteProfile(p.id)}
                    title="プロファイルを削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </SettingActionButton>
                </>
              }
            >
              {result && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
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
                </div>
              )}
            </SettingCard>
          );
        })
      )}
      </div>
    </div>
  );
}
