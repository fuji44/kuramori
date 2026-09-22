import React, { useState, useEffect } from 'react';
import {
  Save,
  Sliders,
  Shield,
  Zap,
  CheckSquare,
  Square,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings, ReviewRule } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';

interface GeneralSettingsViewProps {
  settings: AppSettings;
  rules: ReviewRule[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function GeneralSettingsView({
  settings,
  rules,
  onSaveSettings,
  onShowSuccess,
  onShowError,
}: GeneralSettingsViewProps) {
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const selectedRuleIds = formSettings.defaultRuleIds || (formSettings.defaultRuleId ? [formSettings.defaultRuleId] : ['preset-correctness']);

  const handleToggleRule = (ruleId: string) => {
    let next: string[];
    if (selectedRuleIds.includes(ruleId)) {
      next = selectedRuleIds.filter((id) => id !== ruleId);
    } else {
      next = [...selectedRuleIds, ruleId];
    }
    setFormSettings({
      ...formSettings,
      defaultRuleIds: next,
      defaultRuleId: next[0] ?? '',
    });
  };

  const handleSelectAllRules = () => {
    const all = rules.map((r) => r.id);
    setFormSettings({
      ...formSettings,
      defaultRuleIds: all,
      defaultRuleId: all[0] ?? '',
    });
  };

  const handleClearRuleSelection = () => {
    setFormSettings({
      ...formSettings,
      defaultRuleIds: [],
      defaultRuleId: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(formSettings);
      onShowSuccess('全般設定を保存しました');
    } catch {
      onShowError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Sliders className="w-5 h-5 text-sky-400" />
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">全般</h2>
          <p className="text-xs text-[#8b949e] mt-0.5">
            デフォルト実行ルール、並列スロットル制限、新着 PR の自動キューイングなど、システム全体の動作を管理します。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Default Review Rules Card (Multiple Selection) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">デフォルト レビュールール (複数選択)</h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAllRules}
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                すべて選択
              </button>
              <span className="text-[#30363d]">|</span>
              <button
                type="button"
                onClick={handleClearRuleSelection}
                className="text-[#8b949e] hover:text-white transition-colors"
              >
                選択解除
              </button>
            </div>
          </div>

          <p className="text-xs text-[#8b949e]">
            PR カードの「今すぐレビュー」ボタンをクリックした際、またはルール指定なしでキュー投入された際に**並列実行される既定ルール**を選択してください。
          </p>

          <div className="space-y-2 pt-1">
            {rules.map((rule) => {
              const isSelected = selectedRuleIds.includes(rule.id);
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
            <span>現在 {selectedRuleIds.length} 件のルールが既定実行対象として選択されています</span>
          </div>
        </div>

        {/* Concurrency Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">並列実行制御 (スロットル)</h3>
          </div>

          <p className="text-xs text-[#8b949e]">
            AI モデルのレートリミットやマシン負荷を考慮し、同時実行されるレビュージョブの上限数を制限します。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
              <label className="text-xs font-medium text-white block mb-1">
                システム全体 最大並列
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formSettings.globalMaxConcurrency ?? 2}
                onChange={(e) =>
                  setFormSettings({
                    ...formSettings,
                    globalMaxConcurrency: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-[#8b949e] mt-1 block">全バックエンド合算</span>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
              <label className="text-xs font-medium text-white block mb-1">
                Antigravity 最大並列
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formSettings.backendMaxConcurrency?.antigravity ?? 2}
                onChange={(e) =>
                  setFormSettings({
                    ...formSettings,
                    backendMaxConcurrency: {
                      ...formSettings.backendMaxConcurrency,
                      antigravity: parseInt(e.target.value, 10) || 1,
                    },
                  })
                }
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-[#8b949e] mt-1 block">agy CLI プロセス数</span>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
              <label className="text-xs font-medium text-white block mb-1">
                Claude Code 最大並列
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formSettings.backendMaxConcurrency?.claudeCode ?? 1}
                onChange={(e) =>
                  setFormSettings({
                    ...formSettings,
                    backendMaxConcurrency: {
                      ...formSettings.backendMaxConcurrency,
                      claudeCode: parseInt(e.target.value, 10) || 1,
                    },
                  })
                }
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-[#8b949e] mt-1 block">claude -p プロセス数</span>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
              <label className="text-xs font-medium text-white block mb-1">
                Mock 最大並列
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formSettings.backendMaxConcurrency?.mock ?? 5}
                onChange={(e) =>
                  setFormSettings({
                    ...formSettings,
                    backendMaxConcurrency: {
                      ...formSettings.backendMaxConcurrency,
                      mock: parseInt(e.target.value, 10) || 1,
                    },
                  })
                }
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-[#8b949e] mt-1 block">テスト用ジョブ数</span>
            </div>
          </div>
        </div>

        {/* Auto Queue Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
            <Zap className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">自動キューイング</h3>
          </div>

          <div className="space-y-3">
            <Checkbox
              variant="card"
              checked={formSettings.autoQueue}
              onChange={(checked) =>
                setFormSettings({ ...formSettings, autoQueue: checked })
              }
              label="新着 PR 検出時に自動でレビューを実行する"
              description="GitHub Poller が新規 PR やコミットプッシュを検知した際、トリガー条件に合致するルールを自動投入します。"
            />

            <div
              className={`transition-all duration-200 ml-4 pl-3 border-l-2 ${
                formSettings.autoQueue ? 'border-sky-800/50' : 'border-[#30363d]/50'
              }`}
            >
              <Checkbox
                variant="card"
                disabled={!formSettings.autoQueue}
                checked={formSettings.autoQueueIncludeOwn}
                onChange={(checked) =>
                  setFormSettings({ ...formSettings, autoQueueIncludeOwn: checked })
                }
                label="自分が作成した PR も自動キューイングに含める"
                description={
                  !formSettings.autoQueue
                    ? '自動レビューが無効なため、この設定は現在適用されません。'
                    : 'チェックを外すと、認証ユーザー自身が作成した PR は自動レビュー対象から除外されます。'
                }
              />
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
            <span>{saving ? '設定を保存中...' : '全般設定を保存する'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
