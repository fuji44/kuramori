import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  FileCode,
  Tag,
  Cpu,
  CheckCircle2,
  Ban,
  Clock,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { ReviewRule, EngineOverrideConfig } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';

interface RuleSettingsViewProps {
  rules: ReviewRule[];
  defaultRuleId?: string;
  onCreateRule: (rule: Partial<ReviewRule>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<ReviewRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function RuleSettingsView({
  rules,
  defaultRuleId,
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
    paths: string;
    cancelInProgress: boolean;
    enabled: boolean;
    overrideModel: string;
    overrideEffort: string;
    overrideTimeoutSeconds: string;
    overrideSystemPrompt: string;
    overrideCustomArgs: string;
  }>({
    name: '',
    description: '',
    category: 'correctness',
    engine: 'default',
    instructions: '',
    paths: '',
    cancelInProgress: true,
    enabled: true,
    overrideModel: '',
    overrideEffort: '',
    overrideTimeoutSeconds: '',
    overrideSystemPrompt: '',
    overrideCustomArgs: '',
  });

  const [showOverride, setShowOverride] = useState(false);

  const handleOpenCreateRule = () => {
    setRuleForm({
      name: '',
      description: '',
      category: 'correctness',
      engine: 'default',
      instructions: '',
      paths: '',
      cancelInProgress: true,
      enabled: true,
      overrideModel: '',
      overrideEffort: '',
      overrideTimeoutSeconds: '',
      overrideSystemPrompt: '',
      overrideCustomArgs: '',
    });
    setShowOverride(false);
    setIsCreatingRule(true);
    setEditingRuleId(null);
    setConfirmDeleteId(null);
  };

  const handleOpenEditRule = (rule: ReviewRule) => {
    const hasOverride = Boolean(
      rule.engineOverride?.model ||
      rule.engineOverride?.effort ||
      rule.engineOverride?.timeoutSeconds ||
      rule.engineOverride?.systemPrompt ||
      rule.engineOverride?.customArgs
    );
    setRuleForm({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      engine: rule.engine,
      instructions: rule.instructions,
      paths: rule.trigger?.paths ? rule.trigger.paths.join(', ') : '',
      cancelInProgress: rule.concurrency?.cancelInProgress ?? true,
      enabled: rule.enabled,
      overrideModel: rule.engineOverride?.model ?? '',
      overrideEffort: rule.engineOverride?.effort ?? '',
      overrideTimeoutSeconds: rule.engineOverride?.timeoutSeconds
        ? String(rule.engineOverride.timeoutSeconds)
        : '',
      overrideSystemPrompt: rule.engineOverride?.systemPrompt ?? '',
      overrideCustomArgs: rule.engineOverride?.customArgs ?? '',
    });
    setShowOverride(hasOverride);
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
      const pathsArray = ruleForm.paths
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const overridePayload: EngineOverrideConfig = {};
      if (ruleForm.overrideModel.trim()) overridePayload.model = ruleForm.overrideModel.trim();
      if (ruleForm.overrideEffort.trim()) overridePayload.effort = ruleForm.overrideEffort.trim();
      if (ruleForm.overrideTimeoutSeconds.trim()) {
        const parsed = parseInt(ruleForm.overrideTimeoutSeconds.trim(), 10);
        if (!isNaN(parsed) && parsed > 0) overridePayload.timeoutSeconds = parsed;
      }
      if (ruleForm.overrideSystemPrompt.trim()) {
        overridePayload.systemPrompt = ruleForm.overrideSystemPrompt.trim();
      }
      if (ruleForm.overrideCustomArgs.trim()) {
        overridePayload.customArgs = ruleForm.overrideCustomArgs.trim();
      }

      const rulePayload: Partial<ReviewRule> = {
        name: ruleForm.name.trim(),
        description: ruleForm.description.trim(),
        category: ruleForm.category,
        engine: ruleForm.engine,
        instructions: ruleForm.instructions.trim(),
        engineOverride: Object.keys(overridePayload).length > 0 ? overridePayload : undefined,
        trigger: {
          types: ['opened', 'synchronize'],
          paths: pathsArray.length > 0 ? pathsArray : undefined,
          draft: false,
        },
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">レビュールール設定</h2>
          <p className="text-xs text-[#8b949e] mt-1">
            PR 評価時に並列実行される独立した観点（セキュリティ、正確性、設計など）のルールを定義・管理します。
          </p>
        </div>
        {!isCreatingRule && !editingRuleId && (
          <button
            type="button"
            onClick={handleOpenCreateRule}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>新しいルールを追加</span>
          </button>
        )}
      </div>

      {/* Rule Form (Create or Edit) */}
      {(isCreatingRule || editingRuleId) && (
        <form
          onSubmit={handleSubmitRule}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">
                {editingRuleId ? 'レビュールールを編集' : '新規レビュールールを作成'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                対象ファイルパス (Globカンマ区切り)
              </label>
              <input
                type="text"
                value={ruleForm.paths}
                onChange={(e) => setRuleForm({ ...ruleForm, paths: e.target.value })}
                placeholder="例: **/auth/**, **/security/**, **/api/** (空欄で全ファイル)"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
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

          {/* Engine Override Accordion */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowOverride(!showOverride)}
              aria-expanded={showOverride}
              className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>エンジン設定の上書き（任意）</span>
                {(() => {
                  const count = [
                    Boolean(ruleForm.overrideModel.trim()),
                    Boolean(ruleForm.overrideEffort.trim()),
                    Boolean(ruleForm.overrideTimeoutSeconds.trim()),
                    Boolean(ruleForm.overrideSystemPrompt.trim()),
                    Boolean(ruleForm.overrideCustomArgs.trim()),
                  ].filter(Boolean).length;
                  return count > 0 ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                      {count} 項目上書き中
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                <span>{showOverride ? '閉じる' : '設定する'}</span>
                {showOverride ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          </div>

          {showOverride && (
            <div className="space-y-4 p-4 rounded-lg bg-[#0d1117]/60 border border-[#30363d] border-l-2 border-l-sky-500">
              <p className="text-[11px] text-[#8b949e]">
                このルールを実行する際、エンジンの全体設定を包括的に上書き（完全置換）します。空欄の項目はエンジンの全体設定がそのまま適用されます。
              </p>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  システムプロンプト / インタラクション (System Prompt 上書き)
                </label>
                <textarea
                  rows={3}
                  value={ruleForm.overrideSystemPrompt}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, overrideSystemPrompt: e.target.value })
                  }
                  placeholder="例: あなたはセキュリティ監査官です。脆弱性の悪用シナリオと緩和策を厳格に報告してください。"
                  className="w-full bg-[#161b22] border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono"
                />
                <p className="text-[11px] text-[#8b949e] mt-1">
                  指定した場合、エンジンの既定システムプロンプトをこの内容で完全に置き換えます。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">モデル (--model)</label>
                  <input
                    type="text"
                    value={ruleForm.overrideModel}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, overrideModel: e.target.value })
                    }
                    placeholder="例: gemini-3.8-flash"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">推論レベル (--effort)</label>
                  <input
                    type="text"
                    value={ruleForm.overrideEffort}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, overrideEffort: e.target.value })
                    }
                    placeholder="例: low / high"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8b949e] block mb-1">タイムアウト (秒)</label>
                  <input
                    type="number"
                    min={30}
                    max={3600}
                    step={30}
                    value={ruleForm.overrideTimeoutSeconds}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, overrideTimeoutSeconds: e.target.value })
                    }
                    placeholder="例: 300"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8b949e] block mb-1">追加カスタム引数 (Custom Args)</label>
                <input
                  type="text"
                  value={ruleForm.overrideCustomArgs}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, overrideCustomArgs: e.target.value })
                  }
                  placeholder="例: --sandbox または追加の CLI フラグ"
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

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
      )}

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

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8b949e] pt-1">
                      {rule.trigger?.paths && rule.trigger.paths.length > 0 ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-teal-400/90">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>パス: {rule.trigger.paths.join(', ')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>パス: 全ファイル対象</span>
                        </div>
                      )}

                      {rule.concurrency?.cancelInProgress && (
                        <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                          <Clock className="w-3 h-3" />
                          <span>新コミット時キャンセル</span>
                        </div>
                      )}
                    </div>
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
