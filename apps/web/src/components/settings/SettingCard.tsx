import type React from 'react';
import type { ReactNode } from 'react';

export interface SettingCardProps {
  title: ReactNode;
  badges?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  isDefault?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export function SettingCard({
  title,
  badges,
  description,
  metadata,
  actions,
  isDefault,
  disabled,
  children,
  className = '',
}: SettingCardProps) {
  return (
    <div
      className={`rounded-xl border transition-all ${
        disabled
          ? 'border-[#30363d]/50 bg-[#161b22]/60 opacity-75'
          : isDefault
          ? 'border-sky-500/60 bg-sky-950/20 shadow-sm'
          : 'border-[#30363d] bg-[#161b22] hover:border-[#8b949e]/60'
      } ${className}`}
    >
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title & Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base text-white truncate">
              {title}
            </span>
            {badges}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-[#8b949e] leading-relaxed">
              {description}
            </p>
          )}

          {/* Metadata / Details */}
          {metadata && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8b949e] font-mono pt-1">
              {metadata}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
            {actions}
          </div>
        )}
      </div>

      {/* Expanded / Extra Children */}
      {children}
    </div>
  );
}

export interface SettingBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'muted' | 'warning' | 'purple' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export function SettingBadge({
  children,
  variant = 'neutral',
  icon,
  className = '',
}: SettingBadgeProps) {
  const variantStyles = {
    // 既定（エメラルド緑）
    default: 'bg-emerald-950 text-emerald-300 border-emerald-800/80 font-semibold',
    // プライマリ（スカイ青）
    primary: 'bg-sky-950 text-sky-400 border-sky-800/60 font-medium',
    // ニュートラル / エンジン（ダークグレー + スカイ青文字）
    neutral: 'bg-[#21262d] text-sky-300 font-mono border-[#30363d]',
    // 警告（アンバー黄）
    warning: 'bg-amber-950 text-amber-300 font-mono border-amber-800/60',
    // 上書き（パープル紫）
    purple: 'bg-purple-950 text-purple-300 font-mono border-purple-800/60',
    // 無効 / ミュート（グレー）
    muted: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${variantStyles[variant]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

export interface SettingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
}

export function SettingActionButton({
  active = false,
  danger = false,
  className = '',
  children,
  ...props
}: SettingActionButtonProps) {
  const baseStyle =
    'p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed';

  let colorStyle = 'bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border-[#30363d]';
  if (active) {
    colorStyle = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';
  } else if (danger) {
    colorStyle = 'bg-[#21262d] hover:bg-red-950/30 text-[#8b949e] hover:text-red-400 border-[#30363d]';
  }

  return (
    <button type="button" className={`${baseStyle} ${colorStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}

export interface SettingButtonGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * 複数の SettingActionButton や関連ボタンを連結するボタングループ
 */
export function SettingButtonGroup({ children, className = '' }: SettingButtonGroupProps) {
  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[#30363d] bg-[#21262d] divide-x divide-[#30363d] overflow-hidden shadow-sm shrink-0 [&>button]:rounded-none [&>button]:border-0 [&>button]:shadow-none [&>div]:rounded-none [&>div]:border-0 ${className}`}
    >
      {children}
    </div>
  );
}

