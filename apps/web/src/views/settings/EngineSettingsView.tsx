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
  Power,
  Save,
} from 'lucide-react';
import {
  AppSettings,
  EngineProfile,
  EngineType,
  ClaudeCodeEngineConfig,
  AntigravityEngineConfig,
  MockEngineConfig,
  CodexEngineConfig,
} from '../../types.ts';
import {
  AntigravityFields,
  ClaudeCodeFields,
  MockFields,
  CodexFields,
} from '../../components/settings/EngineConfigFields.tsx';
import {
  SettingCard,
  SettingBadge,
  SettingActionButton,
  SettingButtonGroup,
} from '../../components/settings/SettingCard.tsx';
import {
  SettingViewHeader,
  SettingFormHeader,
  SettingEmptyState,
  SettingFormFooter,
} from '../../components/settings/SettingViewLayout.tsx';
import { AnchoredPopover } from '../../components/AnchoredPopover.tsx';
import { useI18n } from '../../i18n/context.tsx';

interface EngineSettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

function CommandPreview({ command, title }: { command: string; title?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const displayTitle = title ?? t('settings.engines.commandPreviewTitle');

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
          <span>{displayTitle}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
          title={t('settings.engines.copyCommandTooltip')}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">{t('settings.engines.copiedCommand')}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{t('settings.engines.copyCommand')}</span>
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
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <div className="inline-flex rounded-lg border border-[#30363d] overflow-hidden shadow-sm">
        <button
          type="button"
          disabled={disabled || isTesting}
          onClick={() => onTest('version')}
          className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-r border-[#30363d] cursor-pointer flex items-center justify-center"
          title={t('settings.engines.testConnectionTooltip')}
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
          title={t('settings.engines.testMethodSelect')}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <AnchoredPopover
          anchorRef={dropdownRef}
          placement="bottom-end"
          onDismiss={() => setIsOpen(false)}
          className="w-64 max-w-[calc(100vw-16px)] bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl z-[1000] p-1.5 text-xs flex flex-col gap-1"
        >
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
                {t('settings.engines.testVersionTitle')}
              </div>
              <div className="text-[11px] text-[#8b949e] mt-0.5 leading-tight">
                {t('settings.engines.testVersionDesc')}
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
                {t('settings.engines.testInferenceTitle')}
              </div>
              <div className="text-[11px] text-[#8b949e] mt-0.5 leading-tight">
                {t('settings.engines.testInferenceDesc')}
              </div>
            </div>
          </button>
        </AnchoredPopover>
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
  const { t } = useI18n();
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<string | null>(null);

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
    model: 'sonnet',
    effort: 'high',
    timeoutSeconds: 900,
    allowedTools: '',
    bare: false,
    customEnv: {},
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
  const [formCodexConfig, setFormCodexConfig] = useState<CodexEngineConfig>({
    binPath: 'codex', model: 'gpt-6-sol', effort: 'high', timeoutSeconds: 900,
    sandboxMode: 'workspace-write', ephemeral: true, customEnv: {},
  });

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const profiles: EngineProfile[] = formSettings.engineProfiles ?? [];

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
      model: 'sonnet',
      effort: 'high',
      timeoutSeconds: 900,
      allowedTools: '',
      bare: false,
      customEnv: {},
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
    setFormCodexConfig({ binPath: 'codex', model: 'gpt-6-sol', effort: 'high', timeoutSeconds: 900, sandboxMode: 'workspace-write', ephemeral: true, customEnv: {} });
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
    } else if (profile.engineType === 'codex') {
      setFormCodexConfig({ ...profile.config });
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
      onShowError(t('settings.engines.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = editingProfileId ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const existingProfile = profiles.find((profile) => profile.id === id);

      let savedProfile: EngineProfile;

      if (formEngineType === 'claude-code') {
        savedProfile = {
          id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          isDefault: formIsDefault,
          enabled: existingProfile?.enabled ?? true,
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
          enabled: existingProfile?.enabled ?? true,
          engineType: 'antigravity',
          config: {
            ...formAgyConfig,
            timeoutSeconds: Number(formAgyConfig.timeoutSeconds) || 900,
          },
          createdAt: now,
          updatedAt: now,
        };
      } else if (formEngineType === 'codex') {
        savedProfile = {
          id, name: formName.trim(), description: formDescription.trim() || undefined,
          isDefault: formIsDefault, enabled: existingProfile?.enabled ?? true,
          engineType: 'codex',
          config: { ...formCodexConfig, timeoutSeconds: Number(formCodexConfig.timeoutSeconds) || 900 },
          createdAt: now, updatedAt: now,
        };
      } else {
        savedProfile = {
          id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          isDefault: formIsDefault,
          enabled: existingProfile?.enabled ?? true,
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
      onShowSuccess(t('settings.engines.savedProfile', { name: savedProfile.name }));
      handleCancelForm();
    } catch {
      onShowError(t('settings.engines.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length <= 1) {
      onShowError(t('settings.engines.requireOneProfile'));
      return;
    }
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;
    const isCurrentDefault = target.isDefault || formSettings.defaultEngineProfileId === profileId;

    let nextProfiles = profiles.filter((p) => p.id !== profileId);
    let nextDefaultId = formSettings.defaultEngineProfileId;

    if (isCurrentDefault && nextProfiles.length > 0) {
      const nextDefaultProfile = nextProfiles.find((profile) => profile.enabled !== false);
      if (!nextDefaultProfile) {
        onShowError(t('settings.engines.requireOneActive'));
        return;
      }
      nextProfiles = nextProfiles.map((p) => ({
        ...p,
        isDefault: p.id === nextDefaultProfile.id,
      }));
      nextDefaultId = nextDefaultProfile.id;
    }

    const updatedSettings: AppSettings = {
      ...formSettings,
      engineProfiles: nextProfiles,
      defaultEngineProfileId: nextDefaultId,
      ...(isCurrentDefault
        ? {
            defaultBackendId: nextProfiles.find((profile) => profile.id === nextDefaultId)?.engineType,
            reviewEngine: nextProfiles.find((profile) => profile.id === nextDefaultId)?.engineType,
          }
        : {}),
    };

    setFormSettings(updatedSettings);
    await onSaveSettings(updatedSettings);
    onShowSuccess(t('settings.engines.deletedProfile', { name: target.name }));
    setConfirmDeleteProfileId(null);
  };

  const handleDuplicateProfile = async (profile: EngineProfile) => {
    const newId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duplicated: EngineProfile = {
      ...profile,
      id: newId,
      name: `${profile.name} (Copy)`,
      isDefault: false,
      enabled: true,
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
    onShowSuccess(t('settings.engines.duplicatedProfile', { name: duplicated.name }));
  };

  const handleSetDefaultProfile = async (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target || target.enabled === false) return;

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
    onShowSuccess(t('settings.engines.setAsDefaultSuccess', { name: target.name }));
  };

  const handleToggleProfileEnabled = async (profileId: string) => {
    const target = profiles.find((profile) => profile.id === profileId);
    if (!target) return;

    const enabled = target.enabled === false;
    let nextProfiles = profiles.map((profile) =>
      profile.id === profileId ? { ...profile, enabled } : profile
    );
    const isCurrentDefault = target.isDefault || formSettings.defaultEngineProfileId === profileId;
    let nextSettings: AppSettings = {
      ...formSettings,
      engineProfiles: nextProfiles,
    };

    if (!enabled) {
      const nextDefaultProfile = profiles.find(
        (profile) => profile.id !== profileId && profile.enabled !== false,
      );
      if (!nextDefaultProfile) {
        onShowError(t('settings.engines.requireOneActive'));
        return;
      }
      if (isCurrentDefault) {
        nextProfiles = nextProfiles.map((profile) => ({
          ...profile,
          isDefault: profile.id === nextDefaultProfile.id,
        }));
        nextSettings = {
          ...nextSettings,
          engineProfiles: nextProfiles,
          defaultEngineProfileId: nextDefaultProfile.id,
          defaultBackendId: nextDefaultProfile.engineType,
          reviewEngine: nextDefaultProfile.engineType,
        };
      }
    }

    setFormSettings(nextSettings);
    await onSaveSettings(nextSettings);
    onShowSuccess(t('settings.engines.statusChanged', { name: target.name, status: enabled ? t('settings.engines.statusEnabled') : t('settings.engines.statusDisabled') }));
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
          profileId: targetId === 'current-form' ? editingProfileId : targetId,
          binPath: config.binPath,
          model: config.model,
          effort: config.effort,
          customEnv: config.customEnv,
          sandboxMode: config.sandboxMode,
          ephemeral: config.ephemeral,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [targetId]: data,
      }));
      if (data.success) {
        onShowSuccess(data.message || t('settings.engines.testSuccessMsg'));
      } else {
        onShowError(data.error || t('settings.engines.testFailedMsg'));
      }
    } catch (err: any) {
      const errorMsg = err.message || t('settings.engines.testError');
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
    if (formEngineType === 'codex') {
      const parts = [formCodexConfig.binPath || 'codex', 'exec', '--json', '--sandbox', formCodexConfig.sandboxMode, '--output-schema', '<schema.json>', '-'];
      if (formCodexConfig.model) parts.push('--model', formCodexConfig.model);
      if (formCodexConfig.effort) parts.push('--config', `model_reasoning_effort=${JSON.stringify(formCodexConfig.effort)}`);
      if (formCodexConfig.ephemeral) parts.push('--ephemeral');
      return parts.join(' ');
    }
    if (formEngineType === 'claude-code') {
      const environmentNames = new Set(Object.keys(formClaudeConfig.customEnv ?? {}));
      const parts = [...environmentNames].map((name) => `${name}="<value>"`);
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
    return t('settings.engines.mockNoProcess', { delay: formMockConfig.delayMs });
  })();

  // 1. 個別設定フォーム表示モード
  if (isFormMode) {
    const currentConfig =
      formEngineType === 'claude-code'
        ? formClaudeConfig
        : formEngineType === 'antigravity'
        ? formAgyConfig
        : formEngineType === 'codex'
        ? formCodexConfig
        : formMockConfig;

    const currentTestResult = testResults['current-form'];

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingFormHeader
          icon={<Cpu className="w-5 h-5" />}
          backLabel={t('common.back')}
          onBack={handleCancelForm}
          title={editingProfileId ? t('settings.editProfile') : t('settings.createProfile')}
          description={
            editingProfileId
              ? (formName || 'Profile')
              : t('settings.engineProfilesDesc')
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
                  {t('settings.profileName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('settings.profileNamePlaceholder')}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] block mb-1">
                  {t('settings.profileDesc')}
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('settings.profileDescPlaceholder')}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* エンジン種別選択 */}
            <div>
              <label className="text-xs font-semibold text-[#8b949e] block mb-1.5">
                {t('settings.engineType')}
              </label>
              {!editingProfileId ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                      <div className="text-[11px] text-[#8b949e]">Claude Code CLI</div>
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
                    onClick={() => setFormEngineType('codex')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${formEngineType === 'codex' ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500' : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'}`}
                  >
                    <Terminal className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div><div className="text-sm font-semibold">Codex</div><div className="text-[11px] text-[#8b949e]">OpenAI Codex CLI</div></div>
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
                      <div className="text-[11px] text-[#8b949e]">{t('settings.engines.mockDummy')}</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-sky-400 font-mono">
                  {formEngineType === 'claude-code' && <Terminal className="w-3.5 h-3.5" />}
                  {formEngineType === 'antigravity' && <Cpu className="w-3.5 h-3.5" />}
                  {formEngineType === 'codex' && <Terminal className="w-3.5 h-3.5" />}
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
                <span>{t('settings.engines.systemDefaultNotice')}</span>
              </label>
            </div>
          </div>

          {/* 動作パラメータ設定 */}
          <div className="border-t border-[#30363d] pt-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#30363d]/60">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                {t('settings.engines.paramSettings', { type: formEngineType })}
              </h4>
            </div>

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

            {formEngineType === 'codex' && (
              <CodexFields values={formCodexConfig} onChange={(updates) => setFormCodexConfig((prev) => ({ ...prev, ...updates }))} />
            )}

            {formEngineType === 'mock' && (
              <MockFields
                values={formMockConfig}
                onChange={(updates) => setFormMockConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}

            <CommandPreview command={previewCommand} />
          </div>

          {/* テスト実行結果 */}
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
                  {currentTestResult.success ? t('settings.engines.testSuccessBadge') : t('settings.engines.testFailedBadge')}
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

          {/* Form Actions */}
          <SettingFormFooter
            onCancel={handleCancelForm}
            submitLabel={t('settings.engines.saveProfileBtn')}
            saving={saving}
            extraActions={
              <EngineTestButton
                isTesting={testingProfileId === 'current-form'}
                onTest={(mode) => handleTest('current-form', formEngineType, currentConfig, mode)}
              />
            }
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
        title={t('settings.engineProfilesTitle')}
        description={t('settings.engineProfilesDesc')}
        action={{
          label: t('settings.newProfileBtn'),
          onClick: handleStartCreate,
        }}
      />

      {/* Profile List */}
      <div className="space-y-3">
        {profiles.length === 0 ? (
          <SettingEmptyState
            icon={<Cpu className="w-8 h-8" />}
            message={t('settings.noProfilesMessage')}
            description={t('settings.noProfilesDesc')}
            action={{
              label: t('settings.newProfileBtn'),
              onClick: handleStartCreate,
            }}
          />
        ) : (
          profiles.map((p) => {
          const isDef = Boolean(p.isDefault);
          const isEnabled = p.enabled !== false;
          const model = p.engineType === 'mock' ? 'N/A' : (p.config as any).model;
          const isThisTesting = testingProfileId === p.id;
          const result = testResults[p.id];

          return (
            <SettingCard
              key={p.id}
              isDefault={isDef}
              disabled={!isEnabled}
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
                      ) : p.engineType === 'codex' ? (
                        <Terminal className="w-3 h-3" />
                      ) : (
                        <Box className="w-3 h-3" />
                      )
                    }
                  >
                    {p.engineType}
                  </SettingBadge>
                  {isDef && (
                    <SettingBadge variant="default" icon={<CheckCircle2 className="w-3 h-3" />}>
                      {t('settings.engines.defaultBadge')}
                    </SettingBadge>
                  )}
                  {!isEnabled && <SettingBadge variant="muted">{t('settings.engines.disabledBadge')}</SettingBadge>}
                </>
              }
              description={p.description}
              metadata={
                <>
                  <div>
                    {t('settings.engines.modelLabelShort')} <span className="text-[#c9d1d9]">{model || t('settings.engines.modelUnspecified')}</span>
                  </div>
                  <div>
                    {t('settings.engines.timeoutLabelShort')}{' '}
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
                  {/* テスト実行ボタン */}
                  <EngineTestButton
                    isTesting={isThisTesting}
                    onTest={(mode) => handleTest(p.id, p.engineType, p.config, mode)}
                  />

                  {/* 状態・トグル系グループ */}
                  <SettingButtonGroup>
                    {/* 既定トグルボタン */}
                    <SettingActionButton
                      active={isDef}
                      disabled={isDef || !isEnabled}
                      onClick={() => handleSetDefaultProfile(p.id)}
                      title={isDef ? t('settings.engines.defaultProfileLabel') : t('settings.engines.setAsDefaultTooltip')}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isDef ? 'fill-emerald-400/20' : ''}`} />
                    </SettingActionButton>

                    <SettingActionButton
                      active={isEnabled}
                      onClick={() => handleToggleProfileEnabled(p.id)}
                      title={isEnabled ? t('settings.engines.disableProfileTooltip') : t('settings.engines.enableProfileTooltip')}
                      aria-label={isEnabled ? t('settings.engines.disableProfileTooltip') : t('settings.engines.enableProfileTooltip')}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </SettingActionButton>
                  </SettingButtonGroup>

                  {/* 管理操作系グループ */}
                  {confirmDeleteProfileId === p.id ? (
                    <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                      <span className="text-[11px] text-rose-300 px-1">{t('settings.engines.confirmDelete', { name: p.name })}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p.id)}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        {t('common.delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProfileId(null)}
                        className="px-1.5 py-0.5 rounded text-[#8b949e] hover:text-white text-[11px] cursor-pointer"
                      >
                        {t('common.back')}
                      </button>
                    </div>
                  ) : (
                    <SettingButtonGroup>
                      <SettingActionButton onClick={() => handleStartEdit(p)} title={t('settings.engines.editProfileTooltip')}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </SettingActionButton>
                      <SettingActionButton onClick={() => handleDuplicateProfile(p)} title={t('settings.engines.duplicateProfileTooltip')}>
                        <Copy className="w-3.5 h-3.5" />
                      </SettingActionButton>
                      <SettingActionButton
                        danger
                        disabled={profiles.length <= 1}
                        onClick={() => setConfirmDeleteProfileId(p.id)}
                        title={t('settings.engines.deleteProfileTooltip')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </SettingActionButton>
                    </SettingButtonGroup>
                  )}
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
                        {result.success ? t('settings.engines.testSuccessBadge') : t('settings.engines.testFailedBadge')}
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
