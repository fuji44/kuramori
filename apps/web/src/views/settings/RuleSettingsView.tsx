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
  CheckCircle2,
  Ban,
  Clock,
  Sparkles,
  Sliders,
  ArrowLeft,
} from 'lucide-react';
import { ReviewRule, EngineOverrideConfig, AppSettings } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
import { EngineConfigFields } from '../../components/settings/EngineConfigFields.tsx';

interface RuleSettingsViewProps {
  rules: ReviewRule[];
  settings?: AppSettings;
  defaultRuleId?: string;
  defaultBackendId?: string;
  onCreateRule: (rule: Partial<ReviewRule>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<ReviewRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function RuleSettingsView({
  rules,
  settings,
  defaultRuleId,
  defaultBackendId = 'antigravity',
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
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

  const toggleInstructions = (id: string) => {
    setExpandedInstructionId((prev) => (prev === id ? null : id));
  };

  const isFormMode = isCreatingRule || editingRuleId !== null;

  if (isFormMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCancelForm}
            className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white transition-colors self-start cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>ルール一覧に戻る</span>
          </button>

          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {editingRuleId ? 'レビュールールを編集' : '新規レビュールールを作成'}
              </h2>
              <p className="text-xs text-[#8b949e] mt-0.5">
                {editingRuleId
                  ? `「${ruleForm.name || 'ルール'}」の指示文、対象ファイル、実行エンジンや上書き設定を更新します。`
                  : 'PR 評価時に並列実行される新しい観点のレビュールールを定義します。'}
              </p>
            </div>
          </div>
        </div>

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
            <label className="text-xs text-[#8b949e] block mb-1">実行エンジン</label>
            <select
              value={ruleForm.engine}
              onChange={(e) => setRuleForm({ ...ruleForm, engine: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="default">default (システム既定エンジンに追従)</option>
              <option value="antigravity">antigravity</option>
              <option value="claude-code">claude-code</option>
              <option value="mock">mock</option>
            </select>
          </div>

          {/* Engine Override Section */}
          {(() => {
            const effectiveEngine =
              ruleForm.engine === 'default'
                ? (defaultBackendId || 'antigravity')
                : ruleForm.engine;

            const globalConfig = (() => {
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#30363d]">
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

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#8b949e] hover:text-white bg-[#21262d] hover:bg-[#30363d] transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? '保存中...' : 'ルールを保存'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">レビュールール設定</h2>
          <p className="text-xs text-[#8b949e] mt-1">
            PR 評価時に並列実行される独立した観点（セキュリティ、正確性、設計など）のルールを定義・管理します。
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateRule}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>新しいルールを追加</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center text-[#8b949e]">
            <Shield className="w-8 h-8 mx-auto mb-2 text-[#8b949e]/60" />
            <p className="text-sm">レビュールールがまだ登録されていません。</p>
            <button
              type="button"
              onClick={handleOpenCreateRule}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>最初のルールを作成</span>
            </button>
          </div>
        ) : (
          rules.map((rule) => {
            const isDefault = rule.id === (defaultRuleId || 'preset-correctness');
            const isExpanded = expandedInstructionId === rule.id;
            const isConfirmingDelete = confirmDeleteId === rule.id;

            return (
              <div
                key={rule.id}
                className={`bg-[#161b22] border rounded-xl overflow-hidden transition-all ${
                  rule.enabled
                    ? 'border-[#30363d] hover:border-[#8b949e]/50'
                    : 'border-[#30363d]/50 opacity-75'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-white">{rule.name}</span>

                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/60 font-medium">
                        {rule.category}
                      </span>

                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] font-mono border border-[#30363d]">
                        engine: {rule.engine}
                      </span>

                      {rule.engineOverride && Object.keys(rule.engineOverride).length > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 font-mono border border-purple-800/60 flex items-center gap-1">
                          <Sliders className="w-3 h-3" />
                          <span>設定上書きあり</span>
                        </span>
                      )}

                      {isDefault && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>既定ルール</span>
                        </span>
                      )}

                      {!rule.enabled && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          <span>無効</span>
                        </span>
                      )}
                    </div>

                    {rule.description && (
                      <p className="text-xs text-[#8b949e] leading-relaxed">
                        {rule.description}
                      </p>
                    )}

                    {rule.concurrency?.cancelInProgress && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8b949e] pt-1">
                        <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                          <Clock className="w-3 h-3" />
                          <span>新コミット時キャンセル</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleInstructions(rule.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] flex items-center gap-1 transition-colors"
                    >
                      <span>指示文</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditRule(rule)}
                      className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
                      title="ルールを編集"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                        <span className="text-[11px] text-rose-300 px-1">削除しますか?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id, rule.name)}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition-colors"
                        >
                          削除
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 rounded text-[#8b949e] hover:text-white text-[11px]"
                        >
                          戻る
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(rule.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-950/40 text-[#8b949e] hover:text-rose-400 transition-colors"
                        title="ルールを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
