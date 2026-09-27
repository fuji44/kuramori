import type React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Tag, User, GitPullRequest, Check, CornerDownLeft, GitBranch, Calendar } from 'lucide-react';
import { AnchoredPopover } from './AnchoredPopover.tsx';
import { getSearchSuggestions, type SuggestionItem } from '../utils/search-suggestions.ts';
import { useI18n } from '../i18n/context.tsx';

export type { SuggestionItem };

interface SearchQueryBarProps {
  query: string;
  onSubmit: (query: string | undefined) => void;
  authors: string[];
  repositories: string[];
  branches?: string[];
}

export function SearchQueryBar({ query, onSubmit, authors, repositories, branches = [] }: SearchQueryBarProps) {
  const { t, locale } = useI18n();
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
    return getSearchSuggestions(activeToken, { authors, repositories, branches }, locale);
  }, [activeToken, authors, repositories, branches, locale]);

  const listRef = useRef<HTMLDivElement>(null);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Keep selected suggestion visible during keyboard navigation
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isOpen]);

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
          placeholder={t('searchBar.inputPlaceholder')}
          className="w-full pl-9 pr-8 py-1.5 bg-[#161b22] border border-[#30363d] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg text-xs text-white placeholder-[#8b949e] focus:outline-none transition-colors"
        />
        {draftQuery && (
          <button
            type="button"
            onClick={() => {
              setDraftQuery('');
              onSubmit(undefined);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 text-[#8b949e] hover:text-white p-0.5"
            title={t('searchBar.clearQueryTooltip')}
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
          className="max-w-[calc(100vw-16px)] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl z-[1000] overflow-hidden flex flex-col"
        >
          <div className="px-3 py-1.5 border-b border-[#30363d] bg-[#21262d] flex items-center justify-between text-[11px] text-[#8b949e] shrink-0">
            <span>{t('searchBar.hintHelp')}</span>
            <span className="flex items-center gap-1 font-mono">
              <CornerDownLeft className="w-3 h-3" /> {t('searchBar.searchAction')}
            </span>
          </div>

          <div ref={listRef} className="py-1 overflow-y-auto max-h-60">
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
