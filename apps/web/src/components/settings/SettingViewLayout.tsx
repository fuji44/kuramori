import React, { ReactNode } from 'react';
import { ArrowLeft, Plus, Save } from 'lucide-react';

export interface SettingViewHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

/**
 * 設定一覧画面の共通ヘッダー
 */
export function SettingViewHeader({
  icon,
  title,
  description,
  action,
}: SettingViewHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div className="text-sky-400 shrink-0">{icon}</div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-[#8b949e] mt-0.5">{description}</p>
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
        >
          {action.icon ?? <Plus className="w-4 h-4" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}

export interface SettingFormHeaderProps {
  icon: ReactNode;
  backLabel: string;
  onBack: () => void;
  title: string;
  description: string;
}

/**
 * 設定個別作成・編集フォームの共通ヘッダー
 */
export function SettingFormHeader({
  icon,
  backLabel,
  onBack,
  title,
  description,
}: SettingFormHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-white transition-colors self-start cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>{backLabel}</span>
      </button>

      <div className="flex items-center gap-2.5">
        <div className="text-sky-400 shrink-0">{icon}</div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-[#8b949e] mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

export interface SettingEmptyStateProps {
  icon: ReactNode;
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

/**
 * 設定項目が未登録の場合の空状態表示
 */
export function SettingEmptyState({
  icon,
  message,
  description,
  action,
}: SettingEmptyStateProps) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center text-[#8b949e]">
      <div className="w-8 h-8 mx-auto mb-2 text-[#8b949e]/60 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm font-medium text-white/90">{message}</p>
      {description && <p className="text-xs text-[#8b949e] mt-1">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer transition-colors shadow-sm"
        >
          {action.icon ?? <Plus className="w-3.5 h-3.5" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}

export interface SettingFormFooterProps {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  saving?: boolean;
  disabled?: boolean;
  leftContent?: ReactNode;
  extraActions?: ReactNode;
}

/**
 * 設定個別作成・編集フォームの保存・キャンセル共通フッター
 */
export function SettingFormFooter({
  onCancel,
  cancelLabel = 'キャンセル',
  submitLabel,
  saving = false,
  disabled = false,
  leftContent,
  extraActions,
}: SettingFormFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#30363d]">
      <div>{leftContent}</div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {extraActions}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-xs font-medium text-[#8b949e] hover:text-white bg-[#21262d] hover:bg-[#30363d] transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          disabled={disabled || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? '保存中...' : submitLabel}</span>
        </button>
      </div>
    </div>
  );
}
