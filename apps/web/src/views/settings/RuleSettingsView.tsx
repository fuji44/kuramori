import React, { useState } from 'react';
import {
  Shield,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Terminal,
  Box,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  Power,
  Copy,
} from 'lucide-react';
import { ReviewRule, AppSettings } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
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
  }>({
    name: '',
    description: '',
    category: 'correctness',
    engine: 'default',
    instructions: '',
    cancelInProgress: true,
    enabled: true,
  });


  const handleOpenCreateRule = () => {
    setRuleForm({
      name: '',
      description: '',
      category: 'correctness',
      engine: 'default',
      instructions: '',
      cancelInProgress: true,
      enabled: true,
    });
    setIsCreatingRule(true);
    setEditingRuleId(null);
    setConfirmDeleteId(null);
  };

  const handleOpenEditRule = (rule: ReviewRule) => {
    setRuleForm({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      engine: settings?.engineProfiles?.some((profile) => profile.id === rule.engine) ? rule.engine : 'default',
      instructions: rule.instructions,
      cancelInProgress: rule.concurrency?.cancelInProgress ?? true,
      enabled: rule.enabled,
    });
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
      const rulePayload: Partial<ReviewRule> = {
        name: ruleForm.name.trim(),
        description: ruleForm.description.trim(),
        category: ruleForm.category,
        engine: ruleForm.engine,
        instructions: ruleForm.instructions.trim(),
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
              ? `「${ruleForm.name || 'ルール'}」の指示文、対象ファイル、実行プロファイルを更新します。`
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
            <label className="text-xs text-[#8b949e] block mb-1">実行プロファイル</label>
            <select
              value={ruleForm.engine}
              onChange={(e) => setRuleForm({ ...ruleForm, engine: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="default">システム既定の実行プロファイルに従う</option>

              {settings?.engineProfiles && settings.engineProfiles.length > 0 && (
                <optgroup label="実行プロファイル">
                  {settings.engineProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.engineType}){p.isDefault ? ' ★既定' : ''}{settings.enabledEngines && !settings.enabledEngines.includes(p.engineType) ? ' (無効化中)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}

            </select>
          </div>

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
                      const matchedProfile = settings?.engineProfiles?.find((p) => p.id === rule.engine)
                        ?? settings?.engineProfiles?.find((p) => p.id === settings?.defaultEngineProfileId);
                      const label = matchedProfile?.name ?? rule.engine;
                      const engineType = matchedProfile?.engineType ?? rule.engine;
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
                          実行プロファイル: {label}
                        </SettingBadge>
                      );
                    })()}

                    {(() => {
                      const profile = settings?.engineProfiles?.find((p) => p.id === rule.engine);
                      return profile && settings?.enabledEngines && !settings.enabledEngines.includes(profile.engineType);
                    })() && (
                        <SettingBadge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>
                          エンジン種別無効化中
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
                    </SettingButtonGroup>

                    {/* 管理操作系グループ */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                        <span className="text-[11px] text-rose-300 px-1">「{rule.name}」を削除しますか?</span>
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
                <button
                  type="button"
                  onClick={() => toggleInstructions(rule.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`rule-instructions-${rule.id}`}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-t border-[#30363d]/60 text-left text-xs text-[#8b949e] hover:text-white hover:bg-[#21262d]/60 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-[-2px]"
                >
                  <span>{isExpanded ? 'レビュー指示文を隠す' : 'レビュー指示文を表示'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
                <div
                  id={`rule-instructions-${rule.id}`}
                  hidden={!isExpanded}
                  className="px-5 py-4 bg-[#0d1117] border-t border-[#30363d] space-y-2"
                >
                  <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider block">
                    レビュー指示文 (Instructions)
                  </span>
                  <pre className="text-xs text-white/90 font-mono whitespace-pre-wrap leading-relaxed bg-[#161b22] p-3 rounded-lg border border-[#30363d]/60">
                    {rule.instructions}
                  </pre>
                </div>
              </SettingCard>
            );
          })
        )}
      </div>
    </div>
  );
}
