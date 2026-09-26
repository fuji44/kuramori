import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Cpu,
  ShieldCheck,
  Zap,
  BookOpen,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import type { CurrentUser } from '../types.ts';
import type { SettingsSubview } from '../utils/route.ts';
import { AnchoredPopover } from './AnchoredPopover.tsx';
import { UserAvatar } from './UserAvatar.tsx';

interface UserMenuPopoverProps {
  user: CurrentUser | null;
  activeView?: string;
  onNavigateSettings: (subview: SettingsSubview) => void;
}

export function UserMenuPopover({
  user,
  activeView,
  onNavigateSettings,
}: UserMenuPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esc key closes menu
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectSetting = (subview: SettingsSubview) => {
    setIsOpen(false);
    onNavigateSettings(subview);
  };

  const isSettingsActive = activeView === 'settings';

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={user ? `${user.name || user.login} のメニュー` : 'ユーザー・設定メニュー'}
        className={`flex items-center gap-1.5 p-1 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          isOpen || isSettingsActive
            ? 'border-sky-500/80 bg-sky-950/40 ring-2 ring-sky-500/30'
            : 'border-[#30363d] hover:border-[#8b949e] bg-[#21262d]/60 hover:bg-[#21262d]'
        }`}
      >
        <UserAvatar user={user} size={28} />
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8b949e] transition-transform duration-150 pr-0.5 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <AnchoredPopover
          anchorRef={buttonRef}
          placement="bottom-end"
          onDismiss={() => setIsOpen(false)}
          className="w-72 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl py-1.5 text-xs text-[#c9d1d9] z-50 overflow-hidden"
        >
          {/* Header: User Profile Details */}
          <div className="px-3.5 py-3 border-b border-[#30363d]/80 bg-[#0d1117]/60">
            {user ? (
              <div className="flex items-start gap-3">
                <UserAvatar user={user} size={38} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {user.name || user.login}
                  </div>
                  {user.name && (
                    <div className="text-xs text-[#8b949e] font-mono truncate">
                      @{user.login}
                    </div>
                  )}
                  {user.email && (
                    <div className="text-[11px] text-[#8b949e] truncate mt-0.5" title={user.email}>
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <UserAvatar user={null} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#c9d1d9]">GitHub 未接続</div>
                  <div className="text-[11px] text-[#8b949e]">gh CLI の認証状態を確認してください</div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links: Settings */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
              設定
            </div>
            <button
              type="button"
              onClick={() => handleSelectSetting('general')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#21262d] transition-colors group"
            >
              <Settings className="w-4 h-4 text-[#8b949e] group-hover:text-sky-400" />
              <div className="flex-1">
                <div className="font-medium text-[#c9d1d9] group-hover:text-white">一般設定</div>
                <div className="text-[10px] text-[#8b949e]">自動レビュー・キュー・並列度</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSetting('engines')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#21262d] transition-colors group"
            >
              <Cpu className="w-4 h-4 text-[#8b949e] group-hover:text-sky-400" />
              <div className="flex-1">
                <div className="font-medium text-[#c9d1d9] group-hover:text-white">AIエンジン設定</div>
                <div className="text-[10px] text-[#8b949e]">CLI実行パス・モデル・プロファイル</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSetting('rules')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#21262d] transition-colors group"
            >
              <ShieldCheck className="w-4 h-4 text-[#8b949e] group-hover:text-sky-400" />
              <div className="flex-1">
                <div className="font-medium text-[#c9d1d9] group-hover:text-white">レビュー共通ルール</div>
                <div className="text-[10px] text-[#8b949e]">検査項目・プロンプト・カテゴリ</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSetting('triggers')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#21262d] transition-colors group"
            >
              <Zap className="w-4 h-4 text-[#8b949e] group-hover:text-sky-400" />
              <div className="flex-1">
                <div className="font-medium text-[#c9d1d9] group-hover:text-white">自動トリガー設定</div>
                <div className="text-[10px] text-[#8b949e]">リポジトリ・パス別ルールバインディング</div>
              </div>
            </button>
          </div>

          {/* Quick External Links */}
          <div className="border-t border-[#30363d]/80 py-1">
            <a
              href="/doc"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#8b949e] group-hover:text-sky-400" />
                <span>API ドキュメント (Scalar)</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </a>

            {user?.login && (
              <a
                href={`https://github.com/${encodeURIComponent(user.login)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={user} size={16} />
                  <span>GitHub プロフィール</span>
                </div>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
              </a>
            )}
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}
