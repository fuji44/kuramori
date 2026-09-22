import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: 'card' | 'inline';
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  variant = 'inline',
}: CheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  if (variant === 'card') {
    return (
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`p-3 rounded-lg border transition-all flex items-start gap-2.5 select-none ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-[#0d1117]/50 border-[#21262d] text-[#6e7681]'
            : checked
            ? 'bg-sky-950/30 border-sky-800/80 text-white shadow-xs cursor-pointer'
            : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/60 cursor-pointer'
        } ${className}`}
      >
        <div className={`mt-0.5 shrink-0 ${disabled ? 'text-[#6e7681]' : 'text-sky-400'}`}>
          {checked ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4 text-[#8b949e]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {label && (
            <div className={`text-xs font-semibold ${
              disabled ? 'text-[#8b949e]' : checked ? 'text-white' : 'text-[#c9d1d9]'
            }`}>
              {label}
            </div>
          )}
          {description && (
            <div className={`text-[11px] mt-0.5 leading-relaxed ${
              disabled ? 'text-[#6e7681]' : 'text-[#8b949e]'
            }`}>
              {description}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-2 text-xs select-none transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-[#6e7681]'
          : 'cursor-pointer hover:text-white'
      } ${
        !disabled && (checked ? 'text-white font-medium' : 'text-[#c9d1d9]')
      } ${className}`}
    >
      <span className={`shrink-0 ${disabled ? 'text-[#6e7681]' : 'text-sky-400'}`}>
        {checked ? (
          <CheckSquare className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4 text-[#8b949e]" />
        )}
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
