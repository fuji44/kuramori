import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import type { CurrentUser } from '../types.ts';

interface UserAvatarProps {
  user?: CurrentUser | null;
  size?: number;
  className?: string;
}

const BG_PALETTES = [
  'bg-sky-700 text-sky-100 border-sky-600',
  'bg-indigo-700 text-indigo-100 border-indigo-600',
  'bg-violet-700 text-violet-100 border-violet-600',
  'bg-emerald-700 text-emerald-100 border-emerald-600',
  'bg-teal-700 text-teal-100 border-teal-600',
  'bg-amber-700 text-amber-100 border-amber-600',
  'bg-rose-700 text-rose-100 border-rose-600',
  'bg-cyan-700 text-cyan-100 border-cyan-600',
];

export function getPalette(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BG_PALETTES.length;
  return BG_PALETTES[index] ?? BG_PALETTES[0];
}

export function getInitial(user: CurrentUser): string {
  const source = user.name?.trim() || user.login.trim();
  if (source.length === 0) {
    return '?';
  }
  const firstChar = Array.from(source)[0];
  return firstChar !== undefined ? firstChar.toUpperCase() : '?';
}

export function UserAvatar({ user, size = 28, className = '' }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (!user) {
    return (
      <div
        className={`rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e] flex items-center justify-center select-none shrink-0 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        aria-hidden="true"
      >
        <UserIcon style={{ width: `${Math.round(size * 0.55)}px`, height: `${Math.round(size * 0.55)}px` }} />
      </div>
    );
  }

  const hasAvatarUrl = typeof user.avatarUrl === 'string' && user.avatarUrl.trim().length > 0;

  if (hasAvatarUrl && !imageError) {
    return (
      <img
        src={user.avatarUrl ?? ''}
        alt={user.name || user.login}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 select-none border border-[#30363d]/80 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  const initial = getInitial(user);
  const palette = getPalette(user.login);

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold select-none shrink-0 border ${palette} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(10, Math.round(size * 0.45))}px`,
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
