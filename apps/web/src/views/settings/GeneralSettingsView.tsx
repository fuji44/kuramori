import React, { useState, useEffect } from 'react';
import {
  Save,
  Sliders,
  Zap,
} from 'lucide-react';
import { AppSettings } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
import { SettingViewHeader } from '../../components/settings/SettingViewLayout.tsx';

interface GeneralSettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function GeneralSettingsView({
  settings,
  onSaveSettings,
  onShowSuccess,
  onShowError,
}: GeneralSettingsViewProps) {
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

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
      <SettingViewHeader
        icon={<Sliders className="w-5 h-5" />}
        title="全般"
        description="デフォルト実行ルール、並列スロットル制限、新着 PR の自動キューイングなど、システム全体の動作を管理します。"
      />

      <form onSubmit={handleSubmit} className="space-y-6">

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
              <label className="text-xs font-medium text-white block mb-1">Codex 最大並列</label>
              <input type="number" min={1} max={10} value={formSettings.backendMaxConcurrency?.codex ?? 1}
                onChange={(e) => setFormSettings({ ...formSettings, backendMaxConcurrency: { ...formSettings.backendMaxConcurrency, codex: parseInt(e.target.value, 10) || 1 } })}
                className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500" />
              <span className="text-[10px] text-[#8b949e] mt-1 block">codex exec プロセス数</span>
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
