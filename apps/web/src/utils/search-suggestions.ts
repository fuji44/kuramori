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

export function getBaseSuggestions(locale: 'en' | 'ja' = 'en'): SuggestionItem[] {
  const isJa = locale === 'ja';

  return [
    // is:
    { value: 'is:open', description: isJa ? 'オープンなPR' : 'Open pull requests', category: 'filter' },
    { value: 'is:unreviewed', description: isJa ? 'AIレビューが未完了のPR' : 'Pull requests pending AI review', category: 'filter' },
    { value: 'is:reviewed', description: isJa ? 'AIレビューが完了したPR' : 'Pull requests with completed AI review', category: 'filter' },
    { value: 'is:draft', description: isJa ? 'ドラフト状態のPR' : 'Draft pull requests', category: 'filter' },
    { value: 'is:approved', description: isJa ? 'AIレビュー判定が APPROVE のPR' : 'PRs with APPROVE verdict', category: 'status' },
    { value: 'is:changes-requested', description: isJa ? 'AIレビュー判定が REQUEST_CHANGES のPR' : 'PRs with REQUEST_CHANGES verdict', category: 'status' },
    { value: 'is:merged', description: isJa ? 'マージ済みのPR' : 'Merged pull requests', category: 'filter' },
    { value: 'is:unmerged', description: isJa ? '未マージのPR' : 'Unmerged pull requests', category: 'filter' },
    { value: 'is:closed', description: isJa ? 'クローズ済みのPR' : 'Closed pull requests', category: 'filter' },
    { value: 'is:pr', description: isJa ? 'Pull Request のみ' : 'Pull requests only', category: 'filter' },
    { value: '-is:draft', description: isJa ? '通常PR (ドラフトPRを除外)' : 'Standard PRs (exclude drafts)', category: 'filter' },
    { value: '-is:merged', description: isJa ? 'マージ済みPRを除外' : 'Exclude merged PRs', category: 'filter' },
    { value: '-is:reviewed', description: isJa ? 'レビュー完了済みを除外' : 'Exclude reviewed PRs', category: 'filter' },

    // review-requested / reviews
    { value: 'review-requested:@me', description: isJa ? '自分にレビュー依頼が来ているPR' : 'PRs requesting review from you', category: 'filter' },
    { value: 'user-review-requested:@me', description: isJa ? '直接自分にレビュー依頼が来ているPR' : 'PRs directly requesting your review', category: 'filter' },
    { value: 'team-review-requested:', description: isJa ? 'チーム宛てにレビュー依頼されたPR (例: team-review-requested:org/team)' : 'PRs requesting team review (e.g. team-review-requested:org/team)', category: 'filter' },
    { value: 'reviewed-by:@me', description: isJa ? '自身がレビュー実施済みのPR' : 'PRs reviewed by you', category: 'filter' },
    { value: 'review-involves:@me', description: isJa ? '自身がレビューに関与しているPR' : 'PRs involving you in review', category: 'filter' },
    { value: 'review:approved', description: isJa ? '承認 (APPROVE) されたPR' : 'Approved (APPROVE) PRs', category: 'status' },
    { value: 'review:changes_requested', description: isJa ? '変更要求 (REQUEST_CHANGES) されたPR' : 'Changes requested (REQUEST_CHANGES) PRs', category: 'status' },
    { value: 'review:none', description: isJa ? '未レビューのPR' : 'Unreviewed PRs', category: 'status' },
    { value: 'review:required', description: isJa ? 'レビューが必要なPR' : 'PRs requiring review', category: 'status' },

    // author / assignee / involves / mentions / commenter
    { value: 'author:@me', description: isJa ? '自分が作成したPR' : 'PRs created by you', category: 'author' },
    { value: 'author:', description: isJa ? '作成者で絞り込み (例: author:alice)' : 'Filter by author (e.g. author:alice)', category: 'author' },
    { value: '-author:', description: isJa ? '指定作成者のPRを除外' : 'Exclude specified author PRs', category: 'author' },
    { value: 'assignee:@me', description: isJa ? '自分にアサインされているPR' : 'PRs assigned to you', category: 'filter' },
    { value: 'assignee:*', description: isJa ? '担当者が割り当てられているPR' : 'PRs with an assignee', category: 'filter' },
    { value: 'assignee:none', description: isJa ? '担当者が未割り当てのPR' : 'PRs without an assignee', category: 'filter' },
    { value: 'assignee:', description: isJa ? '担当者で絞り込み (例: assignee:bob)' : 'Filter by assignee (e.g. assignee:bob)', category: 'author' },
    { value: 'involves:@me', description: isJa ? '自身が関与 (作成/アサイン/レビュー) しているPR' : 'PRs involving you (author, assignee, reviewer)', category: 'filter' },
    { value: 'mentions:@me', description: isJa ? '自身がメンションされたPR' : 'PRs mentioning you', category: 'filter' },
    { value: 'commenter:', description: isJa ? 'コメント投稿者で絞り込み' : 'Filter by commenter', category: 'author' },

    // labels / milestones
    { value: 'label:', description: isJa ? 'ラベルで絞り込み (例: label:bug)' : 'Filter by label (e.g. label:bug)', category: 'filter' },
    { value: '-label:', description: isJa ? '指定ラベルを除外' : 'Exclude specified label', category: 'filter' },
    { value: 'milestone:*', description: isJa ? 'マイルストーンが設定されているPR' : 'PRs with a milestone', category: 'filter' },
    { value: 'milestone:', description: isJa ? 'マイルストーン名で絞り込み' : 'Filter by milestone name', category: 'filter' },

    // no: / has:
    { value: 'no:assignee', description: isJa ? '担当者が割り当てられていないPR' : 'PRs without an assignee', category: 'filter' },
    { value: 'no:label', description: isJa ? 'ラベルが付いていないPR' : 'PRs without labels', category: 'filter' },
    { value: 'no:milestone', description: isJa ? 'マイルストーンが未設定のPR' : 'PRs without milestone', category: 'filter' },
    { value: 'no:project', description: isJa ? 'プロジェクトが未設定のPR' : 'PRs without project', category: 'filter' },
    { value: 'has:assignee', description: isJa ? '担当者が割り当てられているPR' : 'PRs with an assignee', category: 'filter' },
    { value: 'has:label', description: isJa ? 'ラベルが付いているPR' : 'PRs with labels', category: 'filter' },
    { value: 'has:milestone', description: isJa ? 'マイルストーンが設定されているPR' : 'PRs with a milestone', category: 'filter' },

    // draft / state / type
    { value: 'draft:true', description: isJa ? 'ドラフト状態のPR' : 'Draft pull requests', category: 'filter' },
    { value: 'draft:false', description: isJa ? 'レビュー準備完了（ドラフト以外）' : 'Ready for review (non-draft)', category: 'filter' },
    { value: 'state:open', description: isJa ? 'オープンなPR' : 'Open PRs', category: 'filter' },
    { value: 'state:closed', description: isJa ? 'クローズ済みのPR' : 'Closed PRs', category: 'filter' },
    { value: 'state:merged', description: isJa ? 'マージ済みのPR' : 'Merged PRs', category: 'filter' },
    { value: 'type:pr', description: isJa ? 'Pull Request のみ' : 'Pull requests only', category: 'filter' },

    // lines / additions / deletions / size
    { value: 'lines:>100', description: isJa ? '変更行数が100行を超えるPR' : 'PRs with >100 changed lines', category: 'filter' },
    { value: 'lines:<50', description: isJa ? '変更行数が50行未満のPR' : 'PRs with <50 changed lines', category: 'filter' },
    { value: 'lines:50..200', description: isJa ? '変更行数が50〜200行のPR' : 'PRs with 50-200 changed lines', category: 'filter' },
    { value: 'additions:>100', description: isJa ? '追加行数が100行を超えるPR' : 'PRs with >100 added lines', category: 'filter' },
    { value: 'deletions:>50', description: isJa ? '削除行数が50行を超えるPR' : 'PRs with >50 deleted lines', category: 'filter' },
    { value: 'size:>100', description: isJa ? '総変更行数が100行を超えるPR' : 'PRs with >100 total lines', category: 'filter' },

    // repo / org / user / head / base / sha
    { value: 'repo:', description: isJa ? 'リポジトリで絞り込み (例: repo:org/repo)' : 'Filter by repository (e.g. repo:org/repo)', category: 'repo' },
    { value: '-repo:', description: isJa ? '指定リポジトリを除外' : 'Exclude repository', category: 'repo' },
    { value: 'org:', description: isJa ? 'GitHub Organization で絞り込み' : 'Filter by GitHub organization', category: 'repo' },
    { value: 'user:', description: isJa ? 'リポジトリ所有者で絞り込み' : 'Filter by repository owner', category: 'repo' },
    { value: 'head:', description: isJa ? '元ブランチ名で絞り込み (例: head:feature-1)' : 'Filter by source branch (e.g. head:feature-1)', category: 'branch' },
    { value: '-head:', description: isJa ? '指定元ブランチを除外' : 'Exclude source branch', category: 'branch' },
    { value: 'base:', description: isJa ? 'ターゲットブランチで絞り込み (例: base:main)' : 'Filter by target branch (e.g. base:main)', category: 'branch' },
    { value: '-base:', description: isJa ? '指定ターゲットブランチを除外' : 'Exclude target branch', category: 'branch' },
    { value: 'sha:', description: isJa ? 'コミットSHAハッシュで絞り込み' : 'Filter by commit SHA hash', category: 'filter' },

    // dates (created, updated, closed, merged)
    { value: 'created:', description: isJa ? '作成日時で絞り込み (例: created:>YYYY-MM-DD)' : 'Filter by creation date (e.g. created:>YYYY-MM-DD)', category: 'date' },
    { value: 'updated:', description: isJa ? '更新日時で絞り込み (例: updated:>YYYY-MM-DD)' : 'Filter by update date (e.g. updated:>YYYY-MM-DD)', category: 'date' },
    { value: 'closed:', description: isJa ? 'クローズ日時で絞り込み (例: closed:>YYYY-MM-DD)' : 'Filter by close date (e.g. closed:>YYYY-MM-DD)', category: 'date' },
    { value: 'merged:', description: isJa ? 'マージ日時で絞り込み (例: merged:>YYYY-MM-DD)' : 'Filter by merge date (e.g. merged:>YYYY-MM-DD)', category: 'date' },

    // status / verdict
    { value: 'status:pending', description: isJa ? 'レビュー待機中' : 'Review pending', category: 'status' },
    { value: 'status:running', description: isJa ? 'レビュー実行中' : 'Review running', category: 'status' },
    { value: 'status:completed', description: isJa ? 'レビュー完了' : 'Review completed', category: 'status' },
    { value: 'status:failed', description: isJa ? 'レビュー失敗' : 'Review failed', category: 'status' },
    { value: 'verdict:APPROVE', description: isJa ? 'レビュー判定: APPROVE' : 'Review verdict: APPROVE', category: 'status' },
    { value: 'verdict:COMMENT', description: isJa ? 'レビュー判定: COMMENT' : 'Review verdict: COMMENT', category: 'status' },
    { value: 'verdict:REQUEST_CHANGES', description: isJa ? 'レビュー判定: REQUEST_CHANGES' : 'Review verdict: REQUEST_CHANGES', category: 'status' },

    // in
    { value: 'in:title', description: isJa ? 'タイトル限定でキーワード検索' : 'Search within title only', category: 'filter' },
  ];
}

export const ALL_BASE_SUGGESTIONS: SuggestionItem[] = getBaseSuggestions('en');

export function getSearchSuggestions(
  activeToken: string,
  options: SearchSuggestionOptions,
  locale: 'en' | 'ja' = 'en'
): SuggestionItem[] {
  const { authors, repositories, branches = [] } = options;
  const token = activeToken.toLowerCase();
  const isJa = locale === 'ja';
  const baseSuggestions = getBaseSuggestions(locale);

  // 1. Author
  if (token.startsWith('author:') || token.startsWith('-author:')) {
    const isNeg = token.startsWith('-author:');
    const prefixKey = isNeg ? '-author:' : 'author:';
    const userList: SuggestionItem[] = [
      {
        value: `${prefixKey}@me`,
        description: isJa
          ? `自分が作成したPR${isNeg ? ' を除外' : ''}`
          : `PRs created by you${isNeg ? ' (excluded)' : ''}`,
        category: 'author',
      },
    ];
    for (const a of authors) {
      userList.push({
        value: `${prefixKey}${a}`,
        description: isJa
          ? `@${a} の作成したPR${isNeg ? ' を除外' : ''}`
          : `PRs created by @${a}${isNeg ? ' (excluded)' : ''}`,
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
        description: isJa ? `${r}${isNeg ? ' を除外' : ''}` : `${r}${isNeg ? ' (excluded)' : ''}`,
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
        description: isJa ? `${o} 組織/オーナーのPR` : `PRs from ${o} organization / owner`,
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
        description: isJa
          ? `ブランチ ${b} からのPR${isNeg ? ' を除外' : ''}`
          : `PRs from branch ${b}${isNeg ? ' (excluded)' : ''}`,
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
        description: isJa
          ? `ターゲットブランチ ${b}${isNeg ? ' 宛てを除外' : ''}`
          : `PRs targeting branch ${b}${isNeg ? ' (excluded)' : ''}`,
        category: 'branch',
      }));
    return branchList;
  }

  // 5. is:
  if (token.startsWith('is:')) {
    const isOptions = baseSuggestions.filter((opt) => opt.value.startsWith('is:'));
    return isOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 6. -is:
  if (token.startsWith('-is:')) {
    const negIsOptions = baseSuggestions.filter((opt) => opt.value.startsWith('-is:'));
    return negIsOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 7. review:
  if (token.startsWith('review:')) {
    const reviewOptions = baseSuggestions.filter((opt) => opt.value.startsWith('review:'));
    return reviewOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 8. review-requested: / user-review-requested: / team-review-requested: / reviewed-by: / review-involves:
  if (token.startsWith('review-requested:') || token.startsWith('user-review-requested:')) {
    const key = token.startsWith('user-review-requested:') ? 'user-review-requested:' : 'review-requested:';
    const reviewReqOptions: SuggestionItem[] = [
      {
        value: `${key}@me`,
        description: isJa ? '自分にレビュー依頼が来ているPR' : 'PRs requesting review from you',
        category: 'filter',
      },
    ];
    for (const a of authors) {
      reviewReqOptions.push({
        value: `${key}${a}`,
        description: isJa ? `@${a} にレビュー依頼されたPR` : `PRs requesting review from @${a}`,
        category: 'author',
      });
    }
    return reviewReqOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('team-review-requested:')) {
    return [
      {
        value: 'team-review-requested:',
        description: isJa
          ? 'チーム宛てにレビュー依頼されたPR (例: team-review-requested:org/team)'
          : 'PRs requesting team review (e.g. team-review-requested:org/team)',
        category: 'filter',
      },
    ];
  }

  if (token.startsWith('reviewed-by:')) {
    const reviewedByOptions: SuggestionItem[] = [
      {
        value: 'reviewed-by:@me',
        description: isJa ? '自分がレビュー実施済みのPR' : 'PRs reviewed by you',
        category: 'filter',
      },
    ];
    for (const a of authors) {
      reviewedByOptions.push({
        value: `reviewed-by:${a}`,
        description: isJa ? `@${a} がレビューしたPR` : `PRs reviewed by @${a}`,
        category: 'author',
      });
    }
    return reviewedByOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('review-involves:')) {
    const involvesOptions: SuggestionItem[] = [
      {
        value: 'review-involves:@me',
        description: isJa ? '自身がレビューに関与しているPR' : 'PRs involving you in review',
        category: 'filter',
      },
    ];
    for (const a of authors) {
      involvesOptions.push({
        value: `review-involves:${a}`,
        description: isJa ? `@${a} がレビューに関与しているPR` : `PRs involving @${a} in review`,
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
      {
        value: `${prefixKey}@me`,
        description: isJa ? '自分にアサインされているPR' : 'PRs assigned to you',
        category: 'filter',
      },
      {
        value: `${prefixKey}*`,
        description: isJa ? '担当者が割り当てられているPR' : 'PRs with an assignee',
        category: 'filter',
      },
      {
        value: `${prefixKey}none`,
        description: isJa ? '担当者が未割り当てのPR' : 'PRs without an assignee',
        category: 'filter',
      },
    ];
    for (const a of authors) {
      assigneeOptions.push({
        value: `${prefixKey}${a}`,
        description: isJa ? `@${a} が担当のPR` : `PRs assigned to @${a}`,
        category: 'author',
      });
    }
    return assigneeOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 10. involves: / mentions: / commenter:
  if (token.startsWith('involves:')) {
    const list: SuggestionItem[] = [
      {
        value: 'involves:@me',
        description: isJa ? '自身が関与しているPR' : 'PRs involving you',
        category: 'filter',
      },
    ];
    for (const a of authors) {
      list.push({
        value: `involves:${a}`,
        description: isJa ? `@${a} が関与しているPR` : `PRs involving @${a}`,
        category: 'author',
      });
    }
    return list.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('mentions:')) {
    const list: SuggestionItem[] = [
      {
        value: 'mentions:@me',
        description: isJa ? '自身がメンションされたPR' : 'PRs mentioning you',
        category: 'filter',
      },
    ];
    for (const a of authors) {
      list.push({
        value: `mentions:${a}`,
        description: isJa ? `@${a} がメンションされたPR` : `PRs mentioning @${a}`,
        category: 'author',
      });
    }
    return list.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('commenter:')) {
    return authors
      .filter((a) => a.toLowerCase().includes(token.slice(10)))
      .map((a) => ({
        value: `commenter:${a}`,
        description: isJa ? `@${a} がコメントしたPR` : `PRs commented by @${a}`,
        category: 'author',
      }));
  }

  // 11. no:
  if (token.startsWith('no:')) {
    const noOptions = baseSuggestions.filter((opt) => opt.value.startsWith('no:'));
    return noOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 12. has:
  if (token.startsWith('has:')) {
    const hasOptions = baseSuggestions.filter((opt) => opt.value.startsWith('has:'));
    return hasOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 13. label: / milestone:
  if (token.startsWith('label:') || token.startsWith('-label:')) {
    const isNeg = token.startsWith('-label:');
    const prefixKey = isNeg ? '-label:' : 'label:';
    const labelOptions: SuggestionItem[] = [
      { value: `${prefixKey}bug`, description: isJa ? 'バグ修正ラベル' : 'Bug fix label', category: 'filter' },
      { value: `${prefixKey}feature`, description: isJa ? '新機能ラベル' : 'New feature label', category: 'filter' },
      { value: `${prefixKey}documentation`, description: isJa ? 'ドキュメントラベル' : 'Documentation label', category: 'filter' },
    ];
    return labelOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('milestone:')) {
    const milestoneOptions: SuggestionItem[] = [
      { value: 'milestone:*', description: isJa ? 'マイルストーンあり' : 'With milestone', category: 'filter' },
    ];
    return milestoneOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 14. draft: / state: / type:
  if (token.startsWith('draft:')) {
    const draftOptions = baseSuggestions.filter((opt) => opt.value.startsWith('draft:'));
    return draftOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('state:')) {
    const stateOptions = baseSuggestions.filter((opt) => opt.value.startsWith('state:'));
    return stateOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  if (token.startsWith('type:')) {
    const typeOptions = baseSuggestions.filter((opt) => opt.value.startsWith('type:'));
    return typeOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 15. lines: / additions: / deletions: / size:
  if (token.startsWith('lines:') || token.startsWith('additions:') || token.startsWith('deletions:') || token.startsWith('size:')) {
    const prefix = token.split(':')[0] + ':';
    const linesOptions: SuggestionItem[] = [
      { value: `${prefix}>100`, description: isJa ? '100行を超える変更' : 'Changes > 100 lines', category: 'filter' },
      { value: `${prefix}<50`, description: isJa ? '50行未満の変更' : 'Changes < 50 lines', category: 'filter' },
      { value: `${prefix}50..200`, description: isJa ? '50〜200行の範囲の変更' : 'Changes between 50-200 lines', category: 'filter' },
    ];
    return linesOptions;
  }

  // 16. status:
  if (token.startsWith('status:')) {
    const statusOptions = baseSuggestions.filter((opt) => opt.value.startsWith('status:'));
    return statusOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 17. verdict:
  if (token.startsWith('verdict:')) {
    const verdictOptions = baseSuggestions.filter((opt) => opt.value.startsWith('verdict:'));
    return verdictOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 18. in:
  if (token.startsWith('in:')) {
    const inOptions = baseSuggestions.filter((opt) => opt.value.startsWith('in:'));
    return inOptions.filter((opt) => opt.value.toLowerCase().includes(token));
  }

  // 19. sha:
  if (token.startsWith('sha:')) {
    const shaOptions: SuggestionItem[] = [
      {
        value: 'sha:',
        description: isJa
          ? 'コミットSHAハッシュの先頭を入力して検索'
          : 'Search by typing prefix of commit SHA hash',
        category: 'filter',
      },
    ];
    return shaOptions;
  }

  // 20. created: / updated: / closed: / merged:
  if (token.startsWith('created:') || token.startsWith('updated:') || token.startsWith('closed:') || token.startsWith('merged:')) {
    const key = token.split(':')[0] + ':';
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const actionNameJa = key === 'created:' ? '作成' : key === 'updated:' ? '更新' : key === 'closed:' ? 'クローズ' : 'マージ';
    const actionNameEn = key === 'created:' ? 'created' : key === 'updated:' ? 'updated' : key === 'closed:' ? 'closed' : 'merged';
    const dateOptions: SuggestionItem[] = [
      {
        value: `${key}>${today}`,
        description: isJa ? `本日以降に${actionNameJa}` : `${actionNameEn} on or after today`,
        category: 'date',
      },
      {
        value: `${key}<${today}`,
        description: isJa ? `本日以前に${actionNameJa}` : `${actionNameEn} on or before today`,
        category: 'date',
      },
      {
        value: `${key}2026-09-01..${today}`,
        description: isJa ? '期間指定で絞り込み' : 'Filter by date range',
        category: 'date',
      },
    ];
    return dateOptions;
  }

  // When typing fresh or partial prefix, filter the comprehensive master suggestion list
  if (!token) {
    return baseSuggestions;
  }

  // Search across value or description
  return baseSuggestions.filter((item) =>
    item.value.toLowerCase().includes(token) || item.description.toLowerCase().includes(token)
  );
}
