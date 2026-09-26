import React from 'react';
import {
  Settings,
  Shield,
  Sliders,
  Cpu,
  Zap,
} from 'lucide-react';
import { AppSettings, ReviewRule, ReviewTrigger } from '../types.ts';
import { GeneralSettingsView } from './settings/GeneralSettingsView.tsx';
import { EngineSettingsView } from './settings/EngineSettingsView.tsx';
import { RuleSettingsView } from './settings/RuleSettingsView.tsx';
import { TriggerSettingsView } from './settings/TriggerSettingsView.tsx';

interface SettingsViewProps {
  subview: 'general' | 'engines' | 'rules' | 'triggers';
  onNavigateSubview: (subview: 'general' | 'engines' | 'rules' | 'triggers') => void;
  settings: AppSettings;
  rules: ReviewRule[];
  triggers?: ReviewTrigger[];
  knownRepositories?: string[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onCreateRule: (rule: Partial<ReviewRule>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<ReviewRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onUpdateDefaultRuleIds?: (ids: string[]) => Promise<void>;
  onCreateTrigger?: (trigger: Partial<ReviewTrigger>) => Promise<void>;
  onUpdateTrigger?: (id: string, updates: Partial<ReviewTrigger>) => Promise<void>;
  onDeleteTrigger?: (id: string) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function SettingsView({
  subview,
  onNavigateSubview,
  settings,
  rules,
  triggers = [],
  knownRepositories = [],
  onSaveSettings,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onUpdateDefaultRuleIds,
  onCreateTrigger = async () => {},
  onUpdateTrigger = async () => {},
  onDeleteTrigger = async () => {},
  onShowSuccess,
  onShowError,
}: SettingsViewProps) {
  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0d1117]">
      {/* Settings Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#30363d] bg-[#161b22] p-4 flex flex-col shrink-0">
        <div className="pb-3 mb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-sky-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">設定</h1>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
          <button
            type="button"
            onClick={() => onNavigateSubview('general')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border ${
              subview === 'general'
                ? 'bg-sky-950 text-white border-sky-800/80 shadow-sm'
                : 'border-transparent text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>全般</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubview('engines')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border ${
              subview === 'engines'
                ? 'bg-sky-950 text-white border-sky-800/80 shadow-sm'
                : 'border-transparent text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>実行プロファイル</span>
            </div>
            <span className="ml-2 px-1.5 py-0.2 rounded-full bg-[#0d1117] text-sky-400 text-[10px] font-mono border border-sky-900/60">
              {settings.engineProfiles?.length ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubview('rules')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border ${
              subview === 'rules'
                ? 'bg-sky-950 text-white border-sky-800/80 shadow-sm'
                : 'border-transparent text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>ルール</span>
            </div>
            <span className="ml-2 px-1.5 py-0.2 rounded-full bg-[#0d1117] text-sky-400 text-[10px] font-mono border border-sky-900/60">
              {rules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubview('triggers')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 border ${
              subview === 'triggers'
                ? 'bg-sky-950 text-white border-sky-800/80 shadow-sm'
                : 'border-transparent text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>トリガー</span>
            </div>
            <span className="ml-2 px-1.5 py-0.2 rounded-full bg-[#0d1117] text-sky-400 text-[10px] font-mono border border-sky-900/60">
              {triggers.length}
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {subview === 'general' && (
          <GeneralSettingsView
            settings={settings}
            onSaveSettings={onSaveSettings}
            onShowSuccess={onShowSuccess}
            onShowError={onShowError}
          />
        )}

        {subview === 'engines' && (
          <EngineSettingsView
            settings={settings}
            onSaveSettings={onSaveSettings}
            onShowSuccess={onShowSuccess}
            onShowError={onShowError}
          />
        )}

        {subview === 'rules' && (
          <RuleSettingsView
            rules={rules}
            settings={settings}
            defaultRuleIds={settings.defaultRuleIds || (settings.defaultRuleId ? [settings.defaultRuleId] : [])}
            onCreateRule={onCreateRule}
            onUpdateRule={onUpdateRule}
            onDeleteRule={onDeleteRule}
            onUpdateDefaultRuleIds={onUpdateDefaultRuleIds}
            onShowSuccess={onShowSuccess}
            onShowError={onShowError}
          />
        )}

        {subview === 'triggers' && (
          <TriggerSettingsView
            triggers={triggers}
            rules={rules}
            settings={settings}
            knownRepositories={knownRepositories}
            onCreateTrigger={onCreateTrigger}
            onUpdateTrigger={onUpdateTrigger}
            onDeleteTrigger={onDeleteTrigger}
            onShowSuccess={onShowSuccess}
            onShowError={onShowError}
          />
        )}
      </main>
    </div>
  );
}
