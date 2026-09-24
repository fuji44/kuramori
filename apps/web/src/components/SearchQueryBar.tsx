import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Tag, User, GitPullRequest, Check, CornerDownLeft, GitBranch, Calendar, Filter } from 'lucide-react';
import { AnchoredPopover } from './AnchoredPopover.tsx';

export interface SuggestionItem {
  value: string;
  description: string;
  category?: 'filter' | 'author' | 'repo' | 'branch' | 'status' | 'date';
}

interface SearchQueryBarProps {
  query: string;
  onSubmit: (query: string | undefined) => void;
  authors: string[];
  repositories: string[];
  branches?: string[];
}

export function SearchQueryBar({ query, onSubmit, authors, repositories, branches = [] }: SearchQueryBarProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine the token at the end of the query, or an empty token after whitespace.
  const activeToken = useMemo(() => {
    const tokens = draftQuery.split(/\s+/);
    return tokens[tokens.length - 1] ?? '';
  }, [draftQuery]);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  // Compute suggestions based on active token
  const suggestions = useMemo<SuggestionItem[]>(() => {
    const token = activeToken.toLowerCase();

    // 1. Author
    if (token.startsWith('author:') || token.startsWith('-author:')) {
      const isNeg = token.startsWith('-author:');
      const prefix = token.slice(isNeg ? 8 : 7);
      const prefixKey = isNeg ? '-author:' : 'author:';
      return authors
        .filter((a) => a.toLowerCase().includes(prefix))
        .map((a) => ({
          value: `${prefixKey}${a}`,
          description: `@${a} の作成したPR${isNeg ? ' を除外' : ''}`,
          category: 'author',
        }));
    }

    // 2. Repo
    if (token.startsWith('repo:') || token.startsWith('-repo:')) {
      const isNeg = token.startsWith('-repo:');
      const prefix = token.slice(isNeg ? 6 : 5);
      const prefixKey = isNeg ? '-repo:' : 'repo:';
      return repositories
        .filter((r) => r.toLowerCase().includes(prefix))
        .map((r) => ({
          value: `${prefixKey}${r}`,
          description: `${r}${isNeg ? ' を除外' : ''}`,
          category: 'repo',
        }));
    }

    // 3. User / Org
    if (token.startsWith('user:') || token.startsWith('org:')) {
      const orgSet = new Set<string>();
      for (const repo of repositories) {
        const org = repo.split('/')[0];
        if (org) orgSet.add(org);
      }
      const prefix = token.slice(5);
      return Array.from(orgSet)
        .filter((o) => o.toLowerCase().includes(prefix))
        .map((o) => ({
          value: `${token.slice(0, 5)}${o}`,
          description: `${o} 組織/オーナーのPR`,
          category: 'repo',
        }));
    }

    // 4. Head / Base Branch
    if (token.startsWith('head:') || token.startsWith('-head:')) {
      const isNeg = token.startsWith('-head:');
      const prefix = token.slice(isNeg ? 6 : 5);
      const prefixKey = isNeg ? '-head:' : 'head:';
      return branches
        .filter((b) => b.toLowerCase().includes(prefix))
        .map((b) => ({
          value: `${prefixKey}${b}`,
          description: `ブランチ ${b} からのPR${isNeg ? ' を除外' : ''}`,
          category: 'branch',
        }));
    }
    if (token.startsWith('base:') || token.startsWith('-base:')) {
      const isNeg = token.startsWith('-base:');
      const prefix = token.slice(isNeg ? 6 : 5);
      const prefixKey = isNeg ? '-base:' : 'base:';
      return branches
        .filter((b) => b.toLowerCase().includes(prefix))
        .map((b) => ({
          value: `${prefixKey}${b}`,
          description: `ターゲットブランチ ${b}${isNeg ? ' 宛てを除外' : ''}`,
          category: 'branch',
        }));
    }

    // 5. is:
    if (token.startsWith('is:')) {
      const isOptions: SuggestionItem[] = [
        { value: 'is:open', description: 'オープンなPR', category: 'filter' },
        { value: 'is:unreviewed', description: 'AIレビューが未完了のPR', category: 'filter' },
        { value: 'is:reviewed', description: 'AIレビューが完了したPR', category: 'filter' },
        { value: 'is:draft', description: 'ドラフト状態のPR', category: 'filter' },
        { value: 'is:merged', description: 'マージ済みのPR', category: 'filter' },
        { value: 'is:unmerged', description: '未マージのPR', category: 'filter' },
        { value: 'is:closed', description: 'クローズ済みのPR', category: 'filter' },
        { value: 'is:pr', description: 'Pull Request のみ', category: 'filter' },
      ];
      return isOptions.filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 6. -is:
    if (token.startsWith('-is:')) {
      const negIsOptions: SuggestionItem[] = [
        { value: '-is:draft', description: 'ドラフトPRを除外', category: 'filter' },
        { value: '-is:merged', description: 'マージ済みPRを除外', category: 'filter' },
        { value: '-is:reviewed', description: 'レビュー完了済みを除外', category: 'filter' },
      ];
      return negIsOptions.filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 7. review:
    if (token.startsWith('review:')) {
      const reviewOptions: SuggestionItem[] = [
        { value: 'review:approved', description: 'レビュー判定: APPROVE', category: 'status' },
        { value: 'review:changes_requested', description: 'レビュー判定: REQUEST_CHANGES', category: 'status' },
        { value: 'review:none', description: 'まだレビューされていないPR', category: 'status' },
        { value: 'review:required', description: 'レビューが必要なPR', category: 'status' },
      ];
      return reviewOptions.filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 8. draft:
    if (token.startsWith('draft:')) {
      return [
        { value: 'draft:true', description: 'ドラフト状態のPR', category: 'filter' },
        { value: 'draft:false', description: 'レビュー準備完了（ドラフト以外）', category: 'filter' },
      ].filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 9. status:
    if (token.startsWith('status:')) {
      const statusOptions: SuggestionItem[] = [
        { value: 'status:pending', description: 'レビュー待機中', category: 'status' },
        { value: 'status:running', description: 'レビュー実行中', category: 'status' },
        { value: 'status:completed', description: 'レビュー完了', category: 'status' },
        { value: 'status:failed', description: 'レビュー失敗', category: 'status' },
      ];
      return statusOptions.filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 10. verdict:
    if (token.startsWith('verdict:')) {
      const verdictOptions: SuggestionItem[] = [
        { value: 'verdict:APPROVE', description: '判定: APPROVE', category: 'status' },
        { value: 'verdict:COMMENT', description: '判定: COMMENT', category: 'status' },
        { value: 'verdict:REQUEST_CHANGES', description: '判定: REQUEST_CHANGES', category: 'status' },
      ];
      return verdictOptions.filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 11. in:
    if (token.startsWith('in:')) {
      return [
        { value: 'in:title', description: 'PRのタイトルのみを検索', category: 'filter' },
      ].filter((opt) => opt.value.toLowerCase().includes(token));
    }

    // 12. created: / updated:
    if (token.startsWith('created:') || token.startsWith('updated:')) {
      const key = token.startsWith('created:') ? 'created:' : 'updated:';
      const today = new Date().toISOString().slice(0, 10);
      return [
        { value: `${key}>${today}`, description: `本日以降に${key === 'created:' ? '作成' : '更新'}`, category: 'date' },
        { value: `${key}<${today}`, description: `本日以前に${key === 'created:' ? '作成' : '更新'}`, category: 'date' },
        { value: `${key}2026-09-01..${today}`, description: `期間指定で絞り込み`, category: 'date' },
      ];
    }

    // Default suggestions when typing fresh or after space
    const defaultList: SuggestionItem[] = [
      { value: 'is:open', description: 'オープンなPRのみ', category: 'filter' },
      { value: 'is:unreviewed', description: '未完了のPRのみ表示', category: 'filter' },
      { value: '-is:draft', description: '通常PR (ドラフト除外)', category: 'filter' },
      { value: 'review:approved', description: '承認 (APPROVE) されたPR', category: 'status' },
      { value: 'author:', description: '作成者で絞り込み', category: 'author' },
      { value: 'repo:', description: 'リポジトリで絞り込み', category: 'repo' },
      { value: 'head:', description: 'ブランチ名で絞り込み', category: 'branch' },
      { value: 'is:reviewed', description: 'レビュー完了済みのPR', category: 'filter' },
      { value: 'is:draft', description: 'ドラフトPRのみ表示', category: 'filter' },
      { value: 'is:merged', description: 'マージ済みのPR', category: 'filter' },
      { value: 'status:running', description: '現在レビュー実行中のPR', category: 'status' },
      { value: 'created:', description: '作成日時で絞り込み (>YYYY-MM-DD)', category: 'date' },
      { value: 'in:title', description: 'タイトル限定検索', category: 'filter' },
    ];

    if (!token) {
      return defaultList;
    }

    return defaultList.filter((d) => d.value.toLowerCase().includes(token));
  }, [activeToken, authors, repositories, branches]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  const applySuggestion = (suggestion: SuggestionItem) => {
    const trimmed = draftQuery.trimEnd();
    const tokens = trimmed ? trimmed.split(/\s+/) : [];
    const suffix = suggestion.value.endsWith(':') ? '' : ' ';

    if (tokens.length === 0) {
      setDraftQuery(suggestion.value + suffix);
    } else if (/\s$/.test(draftQuery)) {
      setDraftQuery(`${trimmed} ${suggestion.value}${suffix}`);
    } else {
      tokens[tokens.length - 1] = suggestion.value;
      setDraftQuery(tokens.join(' ') + suffix);
    }

    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(draftQuery.trim() || undefined);
      setIsOpen(false);
      return;
    }

    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = suggestions[selectedIndex];
      if (target) {
        applySuggestion(target);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3 text-[#8b949e] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={draftQuery}
          onChange={(e) => {
            setDraftQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="GitHubクエリでフィルタ (例: is:open author:alice -is:draft review:approved)"
          className="w-full pl-9 pr-8 py-1.5 bg-[#161b22] border border-[#30363d] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-white placeholder-[#8b949e] focus:outline-none transition-colors"
        />
        {draftQuery && (
          <button
            onClick={() => {
              setDraftQuery('');
              onSubmit(undefined);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 text-[#8b949e] hover:text-white p-0.5"
            title="クエリをクリア"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <AnchoredPopover
          anchorRef={containerRef}
          placement="bottom-stretch"
          onDismiss={() => setIsOpen(false)}
          maxHeight={288}
          className="max-w-[calc(100vw-16px)] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl z-[1000] overflow-hidden"
        >
          <div className="px-3 py-1.5 border-b border-[#30363d] bg-[#21262d] flex items-center justify-between text-[11px] text-[#8b949e]">
            <span>候補: ↑↓ 移動・Tab/クリックで挿入 / Enter で検索</span>
            <span className="flex items-center gap-1 font-mono">
              <CornerDownLeft className="w-3 h-3" /> Search
            </span>
          </div>

          <div className="py-1">
            {suggestions.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`${item.value}-${index}`}
                  type="button"
                  onClick={() => applySuggestion(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-3 h-8 text-left flex items-center justify-between text-xs transition-colors ${
                    isSelected ? 'bg-[#21262d] text-white' : 'text-[#c9d1d9] hover:bg-[#21262d]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    {item.category === 'author' && <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {item.category === 'repo' && <GitPullRequest className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    {item.category === 'branch' && <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    {item.category === 'filter' && <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {item.category === 'status' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {item.category === 'date' && <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                    <span className="font-mono font-medium text-white truncate shrink-0">{item.value}</span>
                    <span className="text-[#8b949e] text-[11px] truncate">{item.description}</span>
                  </div>
                  <div className="shrink-0 flex items-center">
                    {isSelected ? (
                      <span className="text-[10px] text-sky-400 font-mono bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800 leading-tight">
                        Tab ↹
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-0 font-mono px-1.5 py-0.5 border border-transparent leading-tight select-none pointer-events-none">
                        Tab ↹
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}
