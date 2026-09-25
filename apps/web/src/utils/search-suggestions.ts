export type SuggestionCategory = 'filter' | 'author' | 'repo' | 'branch' | 'status' | 'date';

export interface SuggestionItem {
  value: string;
  description: string;
  category?: SuggestionCategory;
}

export interface SearchSuggestionOptions {
  authors: string[];
  repositories: string[];
  branches?: string[];
}

export const ALL_BASE_SUGGESTIONS: SuggestionItem[] = [
  // is:
  { value: 'is:open', description: 'オープンなPR', category: 'filter' },
  { value: 'is:unreviewed', description: 'AIレビューが未完了のPR', category: 'filter' },
  { value: 'is:reviewed', description: 'AIレビューが完了したPR', category: 'filter' },
  { value: 'is:draft', description: 'ドラフト状態のPR', category: 'filter' },
  { value: 'is:approved', description: 'AIレビュー判定が APPROVE のPR', category: 'status' },
  { value: 'is:changes-requested', description: 'AIレビュー判定が REQUEST_CHANGES のPR', category: 'status' },
  { value: 'is:merged', description: 'マージ済みのPR', category: 'filter' },
  { value: 'is:unmerged', description: '未マージのPR', category: 'filter' },
  { value: 'is:closed', description: 'クローズ済みのPR', category: 'filter' },
  { value: 'is:pr', description: 'Pull Request のみ', category: 'filter' },
  { value: '-is:draft', description: '通常PR (ドラフトPRを除外)', category: 'filter' },
  { value: '-is:merged', description: 'マージ済みPRを除外', category: 'filter' },
  { value: '-is:reviewed', description: 'レビュー完了済みを除外', category: 'filter' },

  // review-requested / reviews
  { value: 'review-requested:@me', description: '自分にレビュー依頼が来ているPR', category: 'filter' },
  { value: 'user-review-requested:@me', description: '直接自分にレビュー依頼が来ているPR', category: 'filter' },
  { value: 'team-review-requested:', description: 'チーム宛てにレビュー依頼されたPR (例: team-review-requested:org/team)', category: 'filter' },
  { value: 'reviewed-by:@me', description: '自身がレビュー実施済みのPR', category: 'filter' },
  { value: 'review-involves:@me', description: '自身がレビューに関与しているPR', category: 'filter' },
  { value: 'review:approved', description: '承認 (APPROVE) されたPR', category: 'status' },
  { value: 'review:changes_requested', description: '変更要求 (REQUEST_CHANGES) されたPR', category: 'status' },
  { value: 'review:none', description: '未レビューのPR', category: 'status' },
  { value: 'review:required', description: 'レビューが必要なPR', category: 'status' },

  // author / assignee / involves / mentions / commenter
  { value: 'author:@me', description: '自分が作成したPR', category: 'author' },
  { value: 'author:', description: '作成者で絞り込み (例: author:alice)', category: 'author' },
  { value: '-author:', description: '指定作成者のPRを除外', category: 'author' },
  { value: 'assignee:@me', description: '自分にアサインされているPR', category: 'filter' },
  { value: 'assignee:*', description: '担当者が割り当てられているPR', category: 'filter' },
  { value: 'assignee:none', description: '担当者が未割り当てのPR', category: 'filter' },
  { value: 'assignee:', description: '担当者で絞り込み (例: assignee:bob)', category: 'author' },
  { value: 'involves:@me', description: '自身が関与 (作成/アサイン/レビュー) しているPR', category: 'filter' },
  { value: 'mentions:@me', description: '自身がメンションされたPR', category: 'filter' },
  { value: 'commenter:', description: 'コメント投稿者で絞り込み', category: 'author' },

  // labels / milestones
  { value: 'label:', description: 'ラベルで絞り込み (例: label:bug)', category: 'filter' },
  { value: '-label:', description: '指定ラベルを除外', category: 'filter' },
  { value: 'milestone:*', description: 'マイルストーンが設定されているPR', category: 'filter' },
  { value: 'milestone:', description: 'マイルストーン名で絞り込み', category: 'filter' },

  // no: / has:
  { value: 'no:assignee', description: '担当者が割り当てられていないPR', category: 'filter' },
  { value: 'no:label', description: 'ラベルが付いていないPR', category: 'filter' },
  { value: 'no:milestone', description: 'マイルストーンが未設定のPR', category: 'filter' },
  { value: 'no:project', description: 'プロジェクトが未設定のPR', category: 'filter' },
  { value: 'has:assignee', description: '担当者が割り当てられているPR', category: 'filter' },
  { value: 'has:label', description: 'ラベルが付いているPR', category: 'filter' },
  { value: 'has:milestone', description: 'マイルストーンが設定されているPR', category: 'filter' },

  // draft / state / type
  { value: 'draft:true', description: 'ドラフト状態のPR', category: 'filter' },
  { value: 'draft:false', description: 'レビュー準備完了（ドラフト以外）', category: 'filter' },
  { value: 'state:open', description: 'オープンなPR', category: 'filter' },
  { value: 'state:closed', description: 'クローズ済みのPR', category: 'filter' },
  { value: 'state:merged', description: 'マージ済みのPR', category: 'filter' },
  { value: 'type:pr', description: 'Pull Request のみ', category: 'filter' },

  // lines / additions / deletions / size
  { value: 'lines:>100', description: '変更行数が100行を超えるPR', category: 'filter' },
  { value: 'lines:<50', description: '変更行数が50行未満のPR', category: 'filter' },
  { value: 'lines:50..200', description: '変更行数が50〜200行のPR', category: 'filter' },
  { value: 'additions:>100', description: '追加行数が100行を超えるPR', category: 'filter' },
  { value: 'deletions:>50', description: '削除行数が50行を超えるPR', category: 'filter' },
  { value: 'size:>100', description: '総変更行数が100行を超えるPR', category: 'filter' },

  // repo / org / user / head / base / sha
  { value: 'repo:', description: 'リポジトリで絞り込み (例: repo:org/repo)', category: 'repo' },
  { value: '-repo:', description: '指定リポジトリを除外', category: 'repo' },
  { value: 'org:', description: 'GitHub Organization で絞り込み', category: 'repo' },
  { value: 'user:', description: 'リポジトリ所有者で絞り込み', category: 'repo' },
  { value: 'head:', description: '元ブランチ名で絞り込み (例: head:feature-1)', category: 'branch' },
  { value: '-head:', description: '指定元ブランチを除外', category: 'branch' },
  { value: 'base:', description: 'ターゲットブランチで絞り込み (例: base:main)', category: 'branch' },
  { value: '-base:', description: '指定ターゲットブランチを除外', category: 'branch' },
  { value: 'sha:', description: 'コミットSHAハッシュで絞り込み', category: 'filter' },

  // dates (created, updated, closed, merged)
  { value: 'created:', description: '作成日時で絞り込み (例: created:>YYYY-MM-DD)', category: 'date' },
  { value: 'updated:', description: '更新日時で絞り込み (例: updated:>YYYY-MM-DD)', category: 'date' },
  { value: 'closed:', description: 'クローズ日時で絞り込み (例: closed:>YYYY-MM-DD)', category: 'date' },
  { value: 'merged:', description: 'マージ日時で絞り込み (例: merged:>YYYY-MM-DD)', category: 'date' },

  // status / verdict
  { value: 'status:pending', description: 'レビュー待機中', category: 'status' },
  { value: 'status:running', description: 'レビュー実行中', category: 'status' },
  { value: 'status:completed', description: 'レビュー完了', category: 'status' },
  { value: 'status:failed', description: 'レビュー失敗', category: 'status' },
  { value: 'verdict:APPROVE', description: 'レビュー判定: APPROVE', category: 'status' },
  { value: 'verdict:COMMENT', description: 'レビュー判定: COMMENT', category: 'status' },
  { value: 'verdict:REQUEST_CHANGES', description: 'レビュー判定: REQUEST_CHANGES', category: 'status' },

  // in
  { value: 'in:title', description: 'タイトル限定でキーワード検索', category: 'filter' },
];

export function getSearchSuggestions(
  activeToken: string,
  options: SearchSuggestionOptions
): SuggestionItem[] {
  const { authors, repositories, branches = [] } = options;
  const token = activeToken.toLowerCase();

  // 1. Author
  if (token.startsWith('author:') || token.startsWith('-author:')) {
    const isNeg = token.startsWith('-author:');
    const prefix = token.slice(isNeg ? 8 : 7);
    const prefixKey = isNeg ? '-author:' : 'author:';
    const userList: SuggestionItem[] = [
      { value: `${prefixKey}@me`, description: `自分が作成したPR${isNeg ? ' を除外' : ''}`, category: 'author' },
    ];
    for (const a of authors) {
      userList.push({
        value: `${prefixKey}${a}`,
        description: `@${a} の作成したPR${isNeg ? ' を除外' : ''}`,
        category: 'author',
      });
    }
    return userList.filter((item) => item.value.toLowerCase().includes(token));
  }

  // 2. Repo
  if (token.startsWith('repo:') || token.startsWith('-repo:')) {
    const isNeg = token.startsWith('-repo:');
    const prefix = token.slice(isNeg ? 6 : 5);
    const prefixKey = isNeg ? '-repo:' : 'repo:';
    const repoList: SuggestionItem[] = repositories
      .filter((r) => r.toLowerCase().includes(prefix))
      .map((r) => ({
        value: `${prefixKey}${r}`,
        description: `${r}${isNeg ? ' を除外' : ''}`,
        category: 'repo',
      }));
    return repoList;
  }

  // 3. User / Org
  if (token.startsWith('user:') || token.startsWith('org:')) {
    const orgSet = new Set<string>();
    for (const repo of repositories) {
      const org = repo.split('/')[0];
      if (org) orgSet.add(org);
    }
    const prefix = token.slice(5);
    const orgList: SuggestionItem[] = Array.from(orgSet)
      .filter((o) => o.toLowerCase().includes(prefix))
      .map((o) => ({
        value: `${token.slice(0, 5)}${o}`,
        description: `${o} 組織/オーナーのPR`,
        category: 'repo',
      }));
    return orgList;
  }

  // 4. Head / Base Branch
  if (token.startsWith('head:') || token.startsWith('-head:')) {
    const isNeg = token.startsWith('-head:');
    const prefix = token.slice(isNeg ? 6 : 5);
    const prefixKey = isNeg ? '-head:' : 'head:';
    const branchList: SuggestionItem[] = branches
      .filter((b) => b.toLowerCase().includes(prefix))
      .map((b) => ({
        value: `${prefixKey}${b}`,
        description: `ブランチ ${b} からのPR${isNeg ? ' を除外' : ''}`,
        category: 'branch',
      }));
    return branchList;
  }
  if (token.startsWith('base:') || token.startsWith('-base:')) {
    const isNeg = token.startsWith('-base:');
    const prefix = token.slice(isNeg ? 6 : 5);
    const prefixKey = isNeg ? '-base:' : 'base:';
    const branchList: SuggestionItem[] = branches
      .filter((b) => b.toLowerCase().includes(prefix))
      .map((b) => ({
        value: `${prefixKey}${b}`,
        description: `ターゲットブランチ ${b}${isNeg ? ' 宛てを除外' : ''}`,
        category: 'branch',
      }));
    return branchList;
  }

  // 5. is:
  if (token.startsWith('is:')) {
    const isOptions: SuggestionItem[] = [
      { value: 'is:open', description: 'オープンなPR', category: 'filter' },
      { value: 'is:unreviewed', description: 'AIレビューが未完了のPR', category: 'filter' },
      { value: 'is:reviewed', description: 'AIレビューが完了したPR', category: 'filter' },
      { value: 'is:draft', description: 'ドラフト状態のPR', category: 'filter' },
      { value: 'is:approved', description: 'AIレビュー判定が APPROVE のPR', category: 'status' },
      { value: 'is:changes-requested', description: 'AIレビュー判定が REQUEST_CHANGES のPR', category: 'status' },
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

  // 8. review-requested: / user-review-requested: / team-review-requested: / reviewed-by: / review-involves:
  if (token.startsWith('review-requested:') || token.startsWith('user-review-requested:')) {
    const key = token.startsWith('user-review-requested:') ? 'user-review-requested:' : 'review-requested:';
    const reviewReqOptions: SuggestionItem[] = [
      { value: `${key}@me`, description: '自分にレビュー依頼が来ているPR', category: 'filter' },
    ];
    for (const a of authors) {
      reviewReqOptions.push({
        value: `${key}${a}`,
        description: `@${a} にレビュー依頼されたPR`,
        category: 'author',
      });
    }
    return reviewReqOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('team-review-requested:')) {
    return [
      { value: 'team-review-requested:', description: 'チーム宛てにレビュー依頼されたPR (例: team-review-requested:org/team)', category: 'filter' },
    ];
  }

  if (token.startsWith('reviewed-by:')) {
    const reviewedByOptions: SuggestionItem[] = [
      { value: 'reviewed-by:@me', description: '自分がレビュー実施済みのPR', category: 'filter' },
    ];
    for (const a of authors) {
      reviewedByOptions.push({
        value: `reviewed-by:${a}`,
        description: `@${a} がレビューしたPR`,
        category: 'author',
      });
    }
    return reviewedByOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('review-involves:')) {
    const involvesOptions: SuggestionItem[] = [
      { value: 'review-involves:@me', description: '自身がレビューに関与しているPR', category: 'filter' },
    ];
    for (const a of authors) {
      involvesOptions.push({
        value: `review-involves:${a}`,
        description: `@${a} がレビューに関与しているPR`,
        category: 'author',
      });
    }
    return involvesOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 9. assignee:
  if (token.startsWith('assignee:') || token.startsWith('-assignee:')) {
    const isNeg = token.startsWith('-assignee:');
    const prefixKey = isNeg ? '-assignee:' : 'assignee:';
    const assigneeOptions: SuggestionItem[] = [
      { value: `${prefixKey}@me`, description: '自分にアサインされているPR', category: 'filter' },
      { value: `${prefixKey}*`, description: '担当者が割り当てられているPR', category: 'filter' },
      { value: `${prefixKey}none`, description: '担当者が未割り当てのPR', category: 'filter' },
    ];
    for (const a of authors) {
      assigneeOptions.push({
        value: `${prefixKey}${a}`,
        description: `@${a} が担当のPR`,
        category: 'author',
      });
    }
    return assigneeOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 10. involves: / mentions: / commenter:
  if (token.startsWith('involves:')) {
    const list: SuggestionItem[] = [
      { value: 'involves:@me', description: '自身が関与しているPR', category: 'filter' },
    ];
    for (const a of authors) {
      list.push({ value: `involves:${a}`, description: `@${a} が関与しているPR`, category: 'author' });
    }
    return list.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('mentions:')) {
    const list: SuggestionItem[] = [
      { value: 'mentions:@me', description: '自身がメンションされたPR', category: 'filter' },
    ];
    for (const a of authors) {
      list.push({ value: `mentions:${a}`, description: `@${a} がメンションされたPR`, category: 'author' });
    }
    return list.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('commenter:')) {
    return authors
      .filter((a) => a.toLowerCase().includes(token.slice(10)))
      .map((a) => ({
        value: `commenter:${a}`,
        description: `@${a} がコメントしたPR`,
        category: 'author',
      }));
  }

  // 11. no:
  if (token.startsWith('no:')) {
    const noOptions: SuggestionItem[] = [
      { value: 'no:assignee', description: '担当者が割り当てられていないPR', category: 'filter' },
      { value: 'no:label', description: 'ラベルが付いていないPR', category: 'filter' },
      { value: 'no:milestone', description: 'マイルストーンが未設定のPR', category: 'filter' },
      { value: 'no:project', description: 'プロジェクトが未設定のPR', category: 'filter' },
    ];
    return noOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 12. has:
  if (token.startsWith('has:')) {
    const hasOptions: SuggestionItem[] = [
      { value: 'has:assignee', description: '担当者が割り当てられているPR', category: 'filter' },
      { value: 'has:label', description: 'ラベルが付いているPR', category: 'filter' },
      { value: 'has:milestone', description: 'マイルストーンが設定されているPR', category: 'filter' },
    ];
    return hasOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 13. label: / milestone:
  if (token.startsWith('label:') || token.startsWith('-label:')) {
    const isNeg = token.startsWith('-label:');
    const prefixKey = isNeg ? '-label:' : 'label:';
    const labelOptions: SuggestionItem[] = [
      { value: `${prefixKey}bug`, description: 'バグ修正ラベル', category: 'filter' },
      { value: `${prefixKey}feature`, description: '新機能ラベル', category: 'filter' },
      { value: `${prefixKey}documentation`, description: 'ドキュメントラベル', category: 'filter' },
    ];
    return labelOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('milestone:')) {
    const milestoneOptions: SuggestionItem[] = [
      { value: 'milestone:*', description: 'マイルストーンあり', category: 'filter' },
    ];
    return milestoneOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 14. draft: / state: / type:
  if (token.startsWith('draft:')) {
    const draftOptions: SuggestionItem[] = [
      { value: 'draft:true', description: 'ドラフト状態のPR', category: 'filter' },
      { value: 'draft:false', description: 'レビュー準備完了（ドラフト以外）', category: 'filter' },
    ];
    return draftOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('state:')) {
    const stateOptions: SuggestionItem[] = [
      { value: 'state:open', description: 'オープンなPR', category: 'filter' },
      { value: 'state:closed', description: 'クローズ済みのPR', category: 'filter' },
      { value: 'state:merged', description: 'マージ済みのPR', category: 'filter' },
    ];
    return stateOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('type:')) {
    const typeOptions: SuggestionItem[] = [
      { value: 'type:pr', description: 'Pull Request のみ', category: 'filter' },
    ];
    return typeOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 15. lines: / additions: / deletions: / size:
  if (token.startsWith('lines:') || token.startsWith('additions:') || token.startsWith('deletions:') || token.startsWith('size:')) {
    const prefix = token.split(':')[0] + ':';
    const linesOptions: SuggestionItem[] = [
      { value: `${prefix}>100`, description: '100行を超える変更', category: 'filter' },
      { value: `${prefix}<50`, description: '50行未満の変更', category: 'filter' },
      { value: `${prefix}50..200`, description: '50〜200行の範囲の変更', category: 'filter' },
    ];
    return linesOptions;
  }

  // 16. status:
  if (token.startsWith('status:')) {
    const statusOptions: SuggestionItem[] = [
      { value: 'status:pending', description: 'レビュー待機中', category: 'status' },
      { value: 'status:running', description: 'レビュー実行中', category: 'status' },
      { value: 'status:completed', description: 'レビュー完了', category: 'status' },
      { value: 'status:failed', description: 'レビュー失敗', category: 'status' },
    ];
    return statusOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 17. verdict:
  if (token.startsWith('verdict:')) {
    const verdictOptions: SuggestionItem[] = [
      { value: 'verdict:APPROVE', description: '判定: APPROVE', category: 'status' },
      { value: 'verdict:COMMENT', description: '判定: COMMENT', category: 'status' },
      { value: 'verdict:REQUEST_CHANGES', description: '判定: REQUEST_CHANGES', category: 'status' },
    ];
    return verdictOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 18. in:
  if (token.startsWith('in:')) {
    const inOptions: SuggestionItem[] = [
      { value: 'in:title', description: 'PRのタイトルのみを検索', category: 'filter' },
    ];
    return inOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 19. sha:
  if (token.startsWith('sha:')) {
    const shaOptions: SuggestionItem[] = [
      { value: 'sha:', description: 'コミットSHAハッシュの先頭を入力して検索', category: 'filter' },
    ];
    return shaOptions;
  }

  // 20. created: / updated: / closed: / merged:
  if (token.startsWith('created:') || token.startsWith('updated:') || token.startsWith('closed:') || token.startsWith('merged:')) {
    const key = token.split(':')[0] + ':';
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const actionName = key === 'created:' ? '作成' : key === 'updated:' ? '更新' : key === 'closed:' ? 'クローズ' : 'マージ';
    const dateOptions: SuggestionItem[] = [
      { value: `${key}>${today}`, description: `本日以降に${actionName}`, category: 'date' },
      { value: `${key}<${today}`, description: `本日以前に${actionName}`, category: 'date' },
      { value: `${key}2026-09-01..${today}`, description: `期間指定で絞り込み`, category: 'date' },
    ];
    return dateOptions;
  }

  // When typing fresh or partial prefix, filter the comprehensive master suggestion list
  if (!token) {
    return ALL_BASE_SUGGESTIONS;
  }

  // Search across value or description
  return ALL_BASE_SUGGESTIONS.filter((item) =>
    item.value.toLowerCase().includes(token) || item.description.toLowerCase().includes(token)
  );
}
