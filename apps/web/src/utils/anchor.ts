/// <reference lib="dom" />

export function getPrAnchorId(repository: string, number: number): string {
  const repoSlug = repository.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `pr-${repoSlug}-${number}`;
}

export function findMatchingPrElement(hash: string): HTMLElement | null {
  const cleanHash = hash.replace(/^#/, '').trim();
  if (!cleanHash) return null;

  // 1. Direct ID match
  const direct = document.getElementById(cleanHash);
  if (direct) return direct;

  // 2. Short match by number: e.g. "pr-123" or "123"
  const numberMatch = cleanHash.match(/^pr-?(\d+)$/i) || cleanHash.match(/^(\d+)$/);
  if (numberMatch) {
    const num = numberMatch[1];
    const el = document.querySelector<HTMLElement>(`[data-pr-number="${num}"]`);
    if (el) return el;
  }

  // 3. Prefix match: e.g. ends with "-123"
  const suffixMatch = document.querySelector<HTMLElement>(`[id$="-${cleanHash}"]`);
  if (suffixMatch) return suffixMatch;

  return null;
}
