import React, { useState, useEffect } from 'react';
import {
  Globe,
  Save,
  Sliders,
  Zap,
} from 'lucide-react';
import { AppSettings } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
import { SettingViewHeader } from '../../components/settings/SettingViewLayout.tsx';
import { useI18n } from '../../i18n/context.tsx';

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
  const { preference, setPreference, t } = useI18n();
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
      onShowSuccess(t('settings.savedGeneralSuccess'));
    } catch {
      onShowError(t('settings.savedGeneralError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SettingViewHeader
        icon={<Sliders className="w-5 h-5" />}
        title={t('settings.generalTitle')}
        description={t('settings.generalDesc')}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
            <Globe className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">{t('settings.languageSectionTitle')}</h3>
          </div>

          <p className="text-xs text-[#8b949e]">
            {t('settings.languageSectionDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPreference('auto')}
              className={`p-3 rounded-lg border text-left transition-all ${
                preference === 'auto'
                  ? 'border-sky-500 bg-sky-950/30 text-white ring-1 ring-sky-500/50'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]'
              }`}
            >
              <div className="text-xs font-semibold">{t('settings.languageAuto')}</div>
              <div className="text-[10px] text-[#8b949e] mt-1">Default: English</div>
            </button>

            <button
              type="button"
              onClick={() => setPreference('en')}
              className={`p-3 rounded-lg border text-left transition-all ${
                preference === 'en'
                  ? 'border-sky-500 bg-sky-950/30 text-white ring-1 ring-sky-500/50'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]'
              }`}
            >
              <div className="text-xs font-semibold">{t('settings.languageEn')}</div>
              <div className="text-[10px] text-[#8b949e] mt-1">English UI</div>
            </button>

            <button
              type="button"
              onClick={() => setPreference('ja')}
              className={`p-3 rounded-lg border text-left transition-all ${
                preference === 'ja'
                  ? 'border-sky-500 bg-sky-950/30 text-white ring-1 ring-sky-500/50'
                  : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]'
              }`}
            >
              <div className="text-xs font-semibold">{t('settings.languageJa')}</div>
              <div className="text-[10px] text-[#8b949e] mt-1">日本語 UI</div>
            </button>
          </div>
        </div>

        {/* Concurrency Settings Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#30363d]">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">{t('settings.concurrencyTitle')}</h3>
          </div>

          <p className="text-xs text-[#8b949e]">
            {t('settings.concurrencyDesc')}
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
            <h3 className="text-sm font-semibold text-white">{t('settings.autoQueueTitle')}</h3>
          </div>

          <div className="space-y-3">
            <Checkbox
              variant="card"
              checked={formSettings.autoQueue}
              onChange={(checked) =>
                setFormSettings({ ...formSettings, autoQueue: checked })
              }
              label={t('settings.autoQueueLabel')}
              description={t('settings.autoQueueDesc')}
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
            <span>{saving ? t('settings.savingGeneralBtn') : t('settings.saveGeneralBtn')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
