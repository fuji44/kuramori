import React, { useState } from 'react';
import { Settings, X, Save, Cpu } from 'lucide-react';
import { AppSettings } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<void>;
  onClose: () => void;
}

export function SettingsModal({
  isOpen,
  settings,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formSettings);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#21262d]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <span>システム設定</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Review Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white uppercase tracking-wider block">
              AI レビューエンジン
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, reviewEngine: 'antigravity' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formSettings.reviewEngine === 'antigravity'
                    ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                    : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                }`}
              >
                <div className="font-semibold text-sm text-sky-400 flex items-center gap-1.5 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>antigravity</span>
                </div>
                <p className="text-[11px] text-[#8b949e] leading-snug">
                  agy CLI を使用 (推奨)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, reviewEngine: 'claude-code' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formSettings.reviewEngine === 'claude-code'
                    ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                    : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                }`}
              >
                <div className="font-semibold text-sm text-sky-400 flex items-center gap-1.5 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>claude-code</span>
                </div>
                <p className="text-[11px] text-[#8b949e] leading-snug">
                  claude -p を使用
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, reviewEngine: 'mock' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formSettings.reviewEngine === 'mock'
                    ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                    : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                }`}
              >
                <div className="font-semibold text-sm text-sky-400 flex items-center gap-1.5 mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>mock</span>
                </div>
                <p className="text-[11px] text-[#8b949e] leading-snug">
                  テスト用ダミー生成
                </p>
              </button>
            </div>
          </div>

          {/* Binary Paths */}
          {formSettings.reviewEngine === 'antigravity' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white block">
                Antigravity CLI パス (agy)
              </label>
              <input
                type="text"
                value={formSettings.agyBin}
                onChange={(e) => setFormSettings({ ...formSettings, agyBin: e.target.value })}
                placeholder="agy または /path/to/agy"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-[#8b949e]">
                デフォルト: <code>agy</code>（PATH上に見つからない場合は絶対パスを指定）
              </p>
            </div>
          )}

          {formSettings.reviewEngine === 'claude-code' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white block">
                Claude Code CLI パス (claude)
              </label>
              <input
                type="text"
                value={formSettings.claudeBin}
                onChange={(e) => setFormSettings({ ...formSettings, claudeBin: e.target.value })}
                placeholder="claude または /path/to/claude"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-[#8b949e]">
                デフォルト: <code>claude</code>（PATH上に見つからない場合は絶対パスを指定）
              </p>
            </div>
          )}

          {/* Auto Queue Options */}
          <div className="space-y-4 pt-2 border-t border-[#30363d]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">自動キューイング</div>
                <p className="text-[11px] text-[#8b949e]">
                  新着PRを検知次第、自動でレビューキューに投入する
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, autoQueue: !formSettings.autoQueue })}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  formSettings.autoQueue
                    ? 'bg-sky-950 border-sky-700 text-sky-400'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
                }`}
              >
                {formSettings.autoQueue ? '有効 (ON)' : '無効 (OFF)'}
              </button>
            </div>

            {/* Include Own PRs in Auto Queue */}
            <div className={`flex items-center justify-between pl-3 border-l-2 transition-opacity ${
              formSettings.autoQueue ? 'border-sky-500/50' : 'border-[#30363d] opacity-40'
            }`}>
              <div>
                <div className="text-xs font-semibold text-white">自身のPRも含める</div>
                <p className="text-[11px] text-[#8b949e]">
                  OFFの場合、自身が作成したPRは自動レビューせず手動実行待ちにします
                </p>
              </div>
              <button
                type="button"
                disabled={!formSettings.autoQueue}
                onClick={() => setFormSettings({ ...formSettings, autoQueueIncludeOwn: !formSettings.autoQueueIncludeOwn })}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
                  formSettings.autoQueueIncludeOwn
                    ? 'bg-purple-950 border-purple-700 text-purple-300'
                    : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
                }`}
              >
                {formSettings.autoQueueIncludeOwn ? '含む' : '含めない'}
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#30363d] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-[#8b949e] hover:text-white transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? '保存中...' : '設定を保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
