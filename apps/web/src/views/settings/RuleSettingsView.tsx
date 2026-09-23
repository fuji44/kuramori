import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Save,
  Tag,
  Cpu,
  Terminal,
  Box,
  CheckCircle2,
  Ban,
  Clock,
  Sparkles,
  Sliders,
  ArrowLeft,
  AlertCircle,
  Power,
  Copy,
} from 'lucide-react';
import { ReviewRule, EngineOverrideConfig, AppSettings } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
import { EngineConfigFields } from '../../components/settings/EngineConfigFields.tsx';
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

interface RuleSettingsViewProps {
  rules: ReviewRule[];
  settings?: AppSettings;
  defaultRuleIds?: string[];
  defaultBackendId?: string;
  onCreateRule: (rule: Partial<ReviewRule>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<ReviewRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onUpdateDefaultRuleIds?: (ids: string[]) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function RuleSettingsView({
  rules,
  settings,
  defaultRuleIds = [],
  defaultBackendId = 'antigravity',
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onUpdateDefaultRuleIds,
  onShowSuccess,
  onShowError,
}: RuleSettingsViewProps) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [expandedInstructionId, setExpandedInstructionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [ruleForm, setRuleForm] = useState<{
    id?: string;
    name: string;
    description: string;
    category: string;
    engine: string;
    instructions: string;
    cancelInProgress: boolean;
    enabled: boolean;
    engineOverride: EngineOverrideConfig;
  }>({
    name: '',
    description: '',
    category: 'correctness',
    engine: 'default',
    instructions: '',
    cancelInProgress: true,
    enabled: true,
    engineOverride: {},
  });

  const [overrideEnabled, setOverrideEnabled] = useState(false);

  const handleOpenCreateRule = () => {
    setRuleForm({
      name: '',
      description: '',
      category: 'correctness',
      engine: 'default',
      instructions: '',
      cancelInProgress: true,
      enabled: true,
      engineOverride: {},
    });
    setOverrideEnabled(false);
    setIsCreatingRule(true);
    setEditingRuleId(null);
    setConfirmDeleteId(null);
  };

  const handleOpenEditRule = (rule: ReviewRule) => {
    const hasOverride = Boolean(
      rule.engineOverride &&
        Object.values(rule.engineOverride).some(
          (v) => v !== undefined && v !== null && v !== ''
        )
    );
    setRuleForm({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      engine: rule.engine,
      instructions: rule.instructions,
      cancelInProgress: rule.concurrency?.cancelInProgress ?? true,
      enabled: rule.enabled,
      engineOverride: rule.engineOverride ? { ...rule.engineOverride } : {},
    });
    setOverrideEnabled(hasOverride);
    setEditingRuleId(rule.id);
    setIsCreatingRule(false);
    setConfirmDeleteId(null);
  };

  const handleCancelForm = () => {
    setIsCreatingRule(false);
    setEditingRuleId(null);
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanOverride: EngineOverrideConfig = {};
      if (overrideEnabled) {
        for (const [key, value] of Object.entries(ruleForm.engineOverride)) {
          if (value !== undefined && value !== null && value !== '') {
            (cleanOverride as any)[key] = value;
          }
        }
      }

      const rulePayload: Partial<ReviewRule> = {
        name: ruleForm.name.trim(),
        description: ruleForm.description.trim(),
        category: ruleForm.category,
        engine: ruleForm.engine,
        instructions: ruleForm.instructions.trim(),
        engineOverride:
          overrideEnabled && Object.keys(cleanOverride).length > 0
            ? cleanOverride
            : undefined,
        concurrency: {
          cancelInProgress: ruleForm.cancelInProgress,
        },
        enabled: ruleForm.enabled,
      };

      if (editingRuleId) {
        await onUpdateRule(editingRuleId, rulePayload);
        onShowSuccess(`ルール「${ruleForm.name}」を更新しました`);
        setEditingRuleId(null);
      } else {
        await onCreateRule(rulePayload);
        onShowSuccess(`新しいルール「${ruleForm.name}」を作成しました`);
        setIsCreatingRule(false);
      }
    } catch {
      onShowError('ルールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await onDeleteRule(id);
      onShowSuccess(`ルール「${name}」を削除しました`);
      setConfirmDeleteId(null);
    } catch {
      onShowError('ルールの削除に失敗しました');
    }
  };

  const handleDuplicateRule = async (rule: ReviewRule) => {
    try {
      await onCreateRule({
        name: `${rule.name} (Copy)`,
        description: rule.description,
        category: rule.category,
        engine: rule.engine,
        instructions: rule.instructions,
        engineOverride: rule.engineOverride ? { ...rule.engineOverride } : undefined,
        trigger: rule.trigger ? { ...rule.trigger } : undefined,
        concurrency: rule.concurrency ? { ...rule.concurrency } : undefined,
        enabled: rule.enabled,
      });
      onShowSuccess(`ルール「${rule.name} (Copy)」を作成しました`);
    } catch {
      onShowError('ルールの複製に失敗しました');
    }
  };

  const toggleInstructions = (id: string) => {
    setExpandedInstructionId((prev) => (prev === id ? null : id));
  };

  const isFormMode = isCreatingRule || editingRuleId !== null;

  if (isFormMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingFormHeader
          icon={<Shield className="w-5 h-5" />}
          backLabel="ルール一覧に戻る"
          onBack={handleCancelForm}
          title={editingRuleId ? 'ルールを編集' : '新規ルールを作成'}
          description={
            editingRuleId
              ? `「${ruleForm.name || 'ルール'}」の指示文、対象ファイル、実行エンジンや上書き設定を更新します。`
              : 'PR 評価時に並列実行される新しい観点のルールを定義します。'
          }
        />

        {/* Rule Form */}
        <form
          onSubmit={handleSubmitRule}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">ルール名 *</label>
              <input
                type="text"
                required
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="例: Security Audit"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">カテゴリ</label>
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="correctness">correctness (正確性・バグ・回帰リスク)</option>
                <option value="security">security (セキュリティ監査・脆弱性)</option>
                <option value="architecture">architecture (設計・モジュール境界)</option>
                <option value="performance">performance (パフォーマンス)</option>
                <option value="general">general (総合)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">ルールの説明</label>
            <input
              type="text"
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              placeholder="例: 認証認可や機密情報漏洩、入力値検証の脆弱性を重点監査"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              レビュー指示文 (Instructions / Prompt) *
            </label>
            <textarea
              required
              rows={6}
              value={ruleForm.instructions}
              onChange={(e) => setRuleForm({ ...ruleForm, instructions: e.target.value })}
              placeholder="AI エージェントに重点的に検査させたい観点や評価基準をプロンプトとして記述してください..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              この指示文は、PR レビュー実行時に AI エージェントのプロンプトへ自動的に注入されます。
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">実行エンジン / プロファイル</label>
            <select
              value={ruleForm.engine}
              onChange={(e) => setRuleForm({ ...ruleForm, engine: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="default">default (システム既定エンジン/プロファイルに追従)</option>

              {settings?.engineProfiles && settings.engineProfiles.length > 0 && (
                <optgroup label="登録済みエンジンプロファイル">
                  {settings.engineProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.engineType}) {p.isDefault ? '★既定' : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="基本エンジン (レガシー)">
                <option value="antigravity">
                  antigravity{settings?.enabledEngines && !settings.enabledEngines.includes('antigravity') ? ' (無効化中)' : ''}
                </option>
                <option value="claude-code">
                  claude-code{settings?.enabledEngines && !settings.enabledEngines.includes('claude-code') ? ' (無効化中)' : ''}
                </option>
                <option value="mock">
                  mock{settings?.enabledEngines && !settings.enabledEngines.includes('mock') ? ' (無効化中)' : ''}
                </option>
              </optgroup>
            </select>
            {ruleForm.engine !== 'default' &&
              !settings?.engineProfiles?.some((p) => p.id === ruleForm.engine) &&
              settings?.enabledEngines &&
              !settings.enabledEngines.includes(ruleForm.engine) && (
                <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>選択されたエンジンは現在エンジン設定で無効化されています。実行時にエラーとなる可能性があります。</span>
                </p>
              )}
          </div>

          {/* Engine Override Section */}
          {(() => {
            const matchedProfile = settings?.engineProfiles?.find((p) => p.id === ruleForm.engine);
            const effectiveEngine = matchedProfile
              ? matchedProfile.engineType
              : ruleForm.engine === 'default'
              ? (defaultBackendId || 'antigravity')
              : ruleForm.engine;

            const globalConfig = (() => {
              if (matchedProfile) {
                return matchedProfile.config;
              }
              if (effectiveEngine === 'antigravity') {
                return settings?.engineSettings?.antigravity ?? {
                  binPath: settings?.agyBin || 'agy',
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
                };
              }
              if (effectiveEngine === 'claude-code' || effectiveEngine === 'claudeCode') {
                return settings?.engineSettings?.claudeCode ?? {
                  binPath: settings?.claudeBin || 'claude',
                  model: 'sonnet',
                  effort: 'high',
                  timeoutSeconds: 900,
                  allowedTools: '',
                  bare: false,
                  inputFormat: 'text',
                  outputFormat: 'text',
                  jsonSchema: '',
                  customArgs: '',
                };
              }
              if (effectiveEngine === 'mock') {
                return settings?.engineSettings?.mock ?? {
                  delayMs: 1500,
                };
              }
              return {};
            })();

            const overrideCount = Object.values(ruleForm.engineOverride).filter(
              (v) => v !== undefined && v !== null && v !== ''
            ).length;

            return (
              <div className="space-y-3 pt-1">
                <Checkbox
                  variant="card"
                  checked={overrideEnabled}
                  onChange={(checked) => setOverrideEnabled(checked)}
                  label="エンジン設定を上書きする"
                  description="このルール固有のモデル・推論レベル・タイムアウト・システムプロンプト等のパラメータを適用します。チェックを外すとエンジンの全体設定が適用されます。"
                />

                <div
                  className={`transition-all duration-200 ml-4 pl-3 border-l-2 ${
                    overrideEnabled ? 'border-sky-500' : 'border-[#30363d]/60'
                  }`}
                >
                  <div className="space-y-4 p-4 rounded-lg bg-[#0d1117]/60 border border-[#30363d]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-xs font-semibold text-white">
                          {overrideEnabled ? 'ルール固有設定（編集中）' : '全体設定（適用中・読み取り専用）'}
                        </span>
                        {overrideEnabled && overrideCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                            {overrideCount} 項目上書き中
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 shrink-0 self-start sm:self-auto">
                        対象エンジン: {effectiveEngine}
                      </div>
                    </div>

                    {!overrideEnabled && (
                      <p className="text-[11px] text-[#8b949e]">
                        現在はエンジンの全体設定が表示されています。設定を変更したい場合は、上の「エンジン設定を上書きする」にチェックを入れてください。
                      </p>
                    )}

                    {overrideEnabled && (
                      <p className="text-[11px] text-[#8b949e]">
                        このルールを実行する際、エンジンの全体設定を包括的に上書き（完全置換）します。空欄の項目はエンジンの全体設定がそのまま適用されます。
                      </p>
                    )}

                    {ruleForm.engine === 'default' && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/60 text-xs text-sky-300">
                        <Sparkles className="w-4 h-4 shrink-0 text-sky-400" />
                        <span>
                          実行エンジンが「既定 (default)」のため、現在のシステム既定エンジン（<strong>{effectiveEngine}</strong>）向けの設定が表示されています。
                        </span>
                      </div>
                    )}

                    <EngineConfigFields
                      engine={effectiveEngine}
                      values={overrideEnabled ? ruleForm.engineOverride : globalConfig}
                      onChange={(updates) => {
                        if (!overrideEnabled) return;
                        setRuleForm((prev) => ({
                          ...prev,
                          engineOverride: { ...prev.engineOverride, ...updates },
                        }));
                      }}
                      isOverride={true}
                      disabled={!overrideEnabled}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          <SettingFormFooter
            onCancel={handleCancelForm}
            submitLabel="ルールを保存"
            saving={saving}
            leftContent={
              <div className="flex items-center gap-6">
                <Checkbox
                  checked={ruleForm.enabled}
                  onChange={(checked) => setRuleForm({ ...ruleForm, enabled: checked })}
                  label="ルールを有効化"
                />

                <Checkbox
                  checked={ruleForm.cancelInProgress}
                  onChange={(checked) =>
                    setRuleForm({ ...ruleForm, cancelInProgress: checked })
                  }
                  label="新コミット時に進行中ジョブをキャンセル"
                />
              </div>
            }
          />
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SettingViewHeader
        icon={<Shield className="w-5 h-5" />}
        title="レビュールール"
        description="PR 評価時に並列実行される独立した観点（セキュリティ、正確性、設計など）のルールを管理します。"
        action={{
          label: '新しいルールを追加',
          onClick: handleOpenCreateRule,
        }}
      />

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <SettingEmptyState
            icon={<Shield className="w-8 h-8" />}
            message="ルールがまだ登録されていません。"
            description="レビュールールを追加して、PR 評価時の検証観点を設定してください。"
            action={{
              label: '最初のルールを作成',
              onClick: handleOpenCreateRule,
            }}
          />
        ) : (
          rules.map((rule) => {
            const isDefault = defaultRuleIds.includes(rule.id);
            const isExpanded = expandedInstructionId === rule.id;
            const isConfirmingDelete = confirmDeleteId === rule.id;

            return (
              <SettingCard
                key={rule.id}
                isDefault={isDefault}
                disabled={!rule.enabled}
                title={rule.name}
                badges={
                  <>
                    <SettingBadge variant="primary">{rule.category}</SettingBadge>

                    {(() => {
                      const matchedProfile = settings?.engineProfiles?.find((p) => p.id === rule.engine);
                      const label = matchedProfile ? matchedProfile.name : rule.engine;
                      const engineType = matchedProfile ? matchedProfile.engineType : rule.engine;
                      return (
                        <SettingBadge
                          variant="neutral"
                          icon={
                            engineType === 'claude-code' ? (
                              <Terminal className="w-3 h-3" />
                            ) : engineType === 'antigravity' ? (
                              <Cpu className="w-3 h-3" />
                            ) : (
                              <Box className="w-3 h-3" />
                            )
                          }
                        >
                          engine: {label}
                        </SettingBadge>
                      );
                    })()}

                    {rule.engine !== 'default' &&
                      settings?.enabledEngines &&
                      !settings.enabledEngines.includes(rule.engine) && (
                        <SettingBadge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>
                          エンジン無効化中
                        </SettingBadge>
                      )}

                    {rule.engineOverride && Object.keys(rule.engineOverride).length > 0 && (
                      <SettingBadge variant="purple" icon={<Sliders className="w-3 h-3" />}>
                        設定上書きあり
                      </SettingBadge>
                    )}

                    {isDefault && (
                      <SettingBadge variant="default" icon={<CheckCircle2 className="w-3 h-3" />}>
                        既定
                      </SettingBadge>
                    )}

                    {!rule.enabled && (
                      <SettingBadge variant="muted" icon={<Ban className="w-3 h-3" />}>
                        無効
                      </SettingBadge>
                    )}
                  </>
                }
                description={rule.description}
                metadata={
                  rule.concurrency?.cancelInProgress ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                      <Clock className="w-3 h-3" />
                      <span>新コミット時キャンセル</span>
                    </div>
                  ) : undefined
                }
                actions={
                  <>
                    {/* 状態・トグル系グループ */}
                    <SettingButtonGroup>
                      {/* 1. 既定トグル */}
                      {onUpdateDefaultRuleIds && (
                        <SettingActionButton
                          active={isDefault}
                          onClick={() => {
                            const next = isDefault
                              ? defaultRuleIds.filter((id) => id !== rule.id)
                              : [...defaultRuleIds, rule.id];
                            onUpdateDefaultRuleIds(next);
                          }}
                          title={isDefault ? '既定ルールから外す' : '既定ルールに追加'}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isDefault ? 'fill-emerald-400/20' : ''}`} />
                        </SettingActionButton>
                      )}

                      {/* 2. 有効/無効トグル */}
                      <SettingActionButton
                        active={rule.enabled}
                        onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                        title={rule.enabled ? 'ルールを無効化' : 'ルールを有効化'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </SettingActionButton>

                      {/* 3. 指示文ドロワートグル */}
                      <button
                        type="button"
                        onClick={() => toggleInstructions(rule.id)}
                        className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-sky-950/60 text-sky-400'
                            : 'text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                        }`}
                        title="レビュー指示文の表示/非表示"
                      >
                        <span>指示文</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </SettingButtonGroup>

                    {/* 管理操作系グループ */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                        <span className="text-[11px] text-rose-300 px-1">削除しますか?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id, rule.name)}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          削除
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 rounded text-[#8b949e] hover:text-white text-[11px] cursor-pointer"
                        >
                          戻る
                        </button>
                      </div>
                    ) : (
                      <SettingButtonGroup>
                        <SettingActionButton onClick={() => handleOpenEditRule(rule)} title="ルールを編集">
                          <Edit2 className="w-3.5 h-3.5" />
                        </SettingActionButton>
                        <SettingActionButton onClick={() => handleDuplicateRule(rule)} title="ルールを複製">
                          <Copy className="w-3.5 h-3.5" />
                        </SettingActionButton>
                        <SettingActionButton
                          danger
                          onClick={() => setConfirmDeleteId(rule.id)}
                          title="ルールを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </SettingActionButton>
                      </SettingButtonGroup>
                    )}
                  </>
                }
              >
                {/* Collapsible Instructions Drawer */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-[#0d1117] border-t border-[#30363d] space-y-2 animate-in fade-in duration-100">
                    <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider block">
                      レビュー指示文 (Instructions)
                    </span>
                    <pre className="text-xs text-white/90 font-mono whitespace-pre-wrap leading-relaxed bg-[#161b22] p-3 rounded-lg border border-[#30363d]/60">
                      {rule.instructions}
                    </pre>
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
