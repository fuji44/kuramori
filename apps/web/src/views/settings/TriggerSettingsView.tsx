import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  Save,
  ArrowLeft,
  FolderGit2,
  FileCode,
  Shield,
  CheckCircle2,
  Ban,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { ReviewTrigger, ReviewRule } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
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

interface TriggerSettingsViewProps {
  triggers: ReviewTrigger[];
  rules: ReviewRule[];
  knownRepositories: string[];
  onCreateTrigger: (trigger: Partial<ReviewTrigger>) => Promise<void>;
  onUpdateTrigger: (id: string, updates: Partial<ReviewTrigger>) => Promise<void>;
  onDeleteTrigger: (id: string) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function TriggerSettingsView({
  triggers,
  rules,
  knownRepositories,
  onCreateTrigger,
  onUpdateTrigger,
  onDeleteTrigger,
  onShowSuccess,
  onShowError,
}: TriggerSettingsViewProps) {
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [triggerForm, setTriggerForm] = useState<{
    id?: string;
    name: string;
    repository: string;
    paths: string;
    pathsIgnore: string;
    ruleIds: string[];
    enabled: boolean;
  }>({
    name: '',
    repository: '',
    paths: '',
    pathsIgnore: '',
    ruleIds: [],
    enabled: true,
  });

  const handleOpenCreateTrigger = () => {
    setTriggerForm({
      name: '',
      repository: knownRepositories[0] || '*',
      paths: '',
      pathsIgnore: '',
      ruleIds: rules.filter((r) => r.enabled).slice(0, 1).map((r) => r.id),
      enabled: true,
    });
    setIsCreatingTrigger(true);
    setEditingTriggerId(null);
    setConfirmDeleteId(null);
  };

  const handleOpenEditTrigger = (trigger: ReviewTrigger) => {
    setTriggerForm({
      id: trigger.id,
      name: trigger.name,
      repository: trigger.repository,
      paths: trigger.paths ? trigger.paths.join(', ') : '',
      pathsIgnore: trigger.pathsIgnore ? trigger.pathsIgnore.join(', ') : '',
      ruleIds: trigger.ruleIds || [],
      enabled: trigger.enabled,
    });
    setEditingTriggerId(trigger.id);
    setIsCreatingTrigger(false);
    setConfirmDeleteId(null);
  };

  const handleCancelForm = () => {
    setIsCreatingTrigger(false);
    setEditingTriggerId(null);
  };

  const handleToggleRule = (ruleId: string) => {
    setTriggerForm((prev) => {
      const exists = prev.ruleIds.includes(ruleId);
      const next = exists
        ? prev.ruleIds.filter((id) => id !== ruleId)
        : [...prev.ruleIds, ruleId];
      return { ...prev, ruleIds: next };
    });
  };

  const handleSelectAllRules = () => {
    setTriggerForm((prev) => ({
      ...prev,
      ruleIds: rules.map((r) => r.id),
    }));
  };

  const handleClearRuleSelection = () => {
    setTriggerForm((prev) => ({
      ...prev,
      ruleIds: [],
    }));
  };

  const handleSubmitTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (triggerForm.ruleIds.length === 0) {
      onShowError('実行するルールを少なくとも1つ選択してください');
      return;
    }

    setSaving(true);
    try {
      const pathsArray = triggerForm.paths
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const pathsIgnoreArray = triggerForm.pathsIgnore
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const payload: Partial<ReviewTrigger> = {
        name: triggerForm.name.trim(),
        repository: triggerForm.repository.trim() || '*',
        paths: pathsArray.length > 0 ? pathsArray : undefined,
        pathsIgnore: pathsIgnoreArray.length > 0 ? pathsIgnoreArray : undefined,
        ruleIds: triggerForm.ruleIds,
        enabled: triggerForm.enabled,
      };

      if (editingTriggerId) {
        await onUpdateTrigger(editingTriggerId, payload);
        onShowSuccess(`トリガー「${triggerForm.name}」を更新しました`);
        setEditingTriggerId(null);
      } else {
        await onCreateTrigger(payload);
        onShowSuccess(`新しいトリガー「${triggerForm.name}」を作成しました`);
        setIsCreatingTrigger(false);
      }
    } catch {
      onShowError('トリガーの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await onDeleteTrigger(id);
      onShowSuccess(`トリガー「${name}」を削除しました`);
      setConfirmDeleteId(null);
    } catch {
      onShowError('トリガーの削除に失敗しました');
    }
  };

  const isFormMode = isCreatingTrigger || editingTriggerId !== null;

  if (isFormMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingFormHeader
          icon={<Zap className="w-5 h-5" />}
          backLabel="トリガー一覧に戻る"
          onBack={handleCancelForm}
          title={editingTriggerId ? 'トリガー設定を編集' : '新規トリガーを作成'}
          description="対象リポジトリと変更ファイルパスの組み合わせに対して、実行するルールを紐づけます。"
        />

        <form
          onSubmit={handleSubmitTrigger}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">トリガー名 *</label>
              <input
                type="text"
                required
                value={triggerForm.name}
                onChange={(e) => setTriggerForm({ ...triggerForm, name: e.target.value })}
                placeholder="例: Runner パッケージ変更検知"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">対象リポジトリ *</label>
              <input
                type="text"
                required
                list="trigger-known-repos"
                value={triggerForm.repository}
                onChange={(e) => setTriggerForm({ ...triggerForm, repository: e.target.value })}
                placeholder="例: fuji44/review-base (または * で全リポジトリ)"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <datalist id="trigger-known-repos">
                <option value="*" label="全リポジトリ対象" />
                {knownRepositories.map((repo) => (
                  <option key={repo} value={repo} />
                ))}
              </datalist>
              <span className="text-[11px] text-[#8b949e] mt-1 block">
                特定のリポジトリ名（owner/repo 形式）または * （全リポジトリ対象）を入力します。
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                対象ファイルパス (Globカンマ区切り)
              </label>
              <input
                type="text"
                value={triggerForm.paths}
                onChange={(e) => setTriggerForm({ ...triggerForm, paths: e.target.value })}
                placeholder="例: packages/runner/**, apps/server/** (空欄で全ファイル対象)"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-[#8b949e] mt-1 block">
                変更ファイルがこのパスに含まれる場合にルールが発動します。
              </span>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                除外ファイルパス (Globカンマ区切り・任意)
              </label>
              <input
                type="text"
                value={triggerForm.pathsIgnore}
                onChange={(e) => setTriggerForm({ ...triggerForm, pathsIgnore: e.target.value })}
                placeholder="例: **/*.md, **/*.test.ts (空欄で除外なし)"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-[#8b949e] mt-1 block">
                変更が除外パスのみで構成される場合、実行をスキップします。
              </span>
            </div>
          </div>

          {/* Rules Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
              <div>
                <label className="text-xs font-semibold text-white block">
                  発動させるルール (複数選択) *
                </label>
                <p className="text-[11px] text-[#8b949e]">
                  この条件に合致した PR に対して自動投入されるルールを選択してください。
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllRules}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>すべて選択</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearRuleSelection}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors"
                >
                  <Square className="w-3.5 h-3.5 text-[#8b949e]" />
                  <span>全解除</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {rules.map((rule) => {
                const isSelected = triggerForm.ruleIds.includes(rule.id);
                return (
                  <div
                    key={rule.id}
                    onClick={() => handleToggleRule(rule.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-sky-950/30 border-sky-800/80 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-sky-400">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8b949e]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#c9d1d9]'}`}>
                          {rule.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161b22] text-sky-400 border border-sky-800/40">
                          {rule.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#21262d] text-[#8b949e] font-mono">
                          engine: {rule.engine}
                        </span>
                        {!rule.enabled && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                            無効化中
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-[#8b949e] line-clamp-1">{rule.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-sky-400/90 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>現在 {triggerForm.ruleIds.length} 件のルールが選択されています</span>
            </div>
          </div>

          <SettingFormFooter
            onCancel={handleCancelForm}
            submitLabel="トリガーを保存"
            saving={saving}
            leftContent={
              <Checkbox
                checked={triggerForm.enabled}
                onChange={(checked) => setTriggerForm({ ...triggerForm, enabled: checked })}
                label="トリガーを有効化"
              />
            }
          />
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SettingViewHeader
        icon={<Zap className="w-5 h-5" />}
        title="トリガー"
        description="対象リポジトリやファイル変更パスの条件と、自動実行するルールの紐づけを管理します。"
        action={{
          label: '新しいトリガーを追加',
          onClick: handleOpenCreateTrigger,
        }}
      />

      {/* Triggers List */}
      <div className="space-y-3">
        {triggers.length === 0 ? (
          <SettingEmptyState
            icon={<Zap className="w-8 h-8" />}
            message="トリガーがまだ登録されていません。"
            description="トリガーを登録すると、特定のリポジトリやファイルパス変更時に合致するルールが自動投入されます。"
            action={{
              label: '最初のトリガーを作成',
              onClick: handleOpenCreateTrigger,
            }}
          />
        ) : (
          triggers.map((trigger) => {
            const isConfirmingDelete = confirmDeleteId === trigger.id;
            const boundRules = rules.filter((r) => trigger.ruleIds?.includes(r.id));

            return (
              <SettingCard
                key={trigger.id}
                disabled={!trigger.enabled}
                title={trigger.name}
                badges={
                  !trigger.enabled ? (
                    <SettingBadge variant="muted" icon={<Ban className="w-3 h-3" />}>
                      無効
                    </SettingBadge>
                  ) : undefined
                }
                metadata={
                  <>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-sky-400">
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>リポジトリ: {trigger.repository === '*' ? '* (全リポジトリ)' : trigger.repository}</span>
                    </div>

                    {trigger.paths && trigger.paths.length > 0 ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-teal-400">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>パス: {trigger.paths.join(', ')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>パス: 全ファイル対象</span>
                      </div>
                    )}

                    {trigger.pathsIgnore && trigger.pathsIgnore.length > 0 && (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400/80">
                        <span>除外: {trigger.pathsIgnore.join(', ')}</span>
                      </div>
                    )}
                  </>
                }
                actions={
                  <>
                    <SettingActionButton
                      onClick={() => handleOpenEditTrigger(trigger)}
                      title="トリガーを編集"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </SettingActionButton>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                        <span className="text-[11px] text-rose-300 px-1">削除しますか?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(trigger.id, trigger.name)}
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
                      <SettingActionButton
                        danger
                        onClick={() => setConfirmDeleteId(trigger.id)}
                        title="トリガーを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </SettingActionButton>
                    )}
                  </>
                }
              >
                <div className="border-t border-[#30363d]/60 px-4 sm:px-5 py-3 bg-[#0d1117]/30">
                  <div className="text-[11px] text-[#8b949e] mb-1.5 font-medium">発動ルール ({boundRules.length}件):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {boundRules.map((r) => (
                      <SettingBadge
                        key={r.id}
                        variant="primary"
                        icon={<Shield className="w-3 h-3 text-sky-400" />}
                      >
                        {r.name}
                      </SettingBadge>
                    ))}
                    {boundRules.length === 0 && (
                      <span className="text-xs text-amber-400/80">（紐づくルールがありません）</span>
                    )}
                  </div>
                </div>
              </SettingCard>
            );
          })
        )}
      </div>
    </div>
  );
}
