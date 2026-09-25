export interface QueryMatchablePR {
  id: string;
  repository: string;
  number: number;
  title: string;
  author: string;
  sourceBranch?: string;
  targetBranch?: string;
  headSha?: string;
  additions?: number | null;
  deletions?: number | null;
  isDraft: boolean;
  isOwn?: boolean;
  state: string;
  createdAt?: string;
  updatedAt?: string;
  labels?: Array<{ name: string; color?: string; description?: string }>;
  milestone?: string | null;
  assignees?: Array<{ login: string; avatarUrl?: string }>;
  requestedReviewers?: Array<{ login: string; isTeam?: boolean }>;
  latestJob?: {
    status?: string;
  } | null;
  report?: {
    verdict?: string | null;
  } | null;
}

function parseDateBoundary(dateStr: string, isEnd: boolean): number | undefined {
  const trimmed = dateStr.trim();
  if (trimmed === '*' || trimmed === '') {
    return undefined;
  }

  // Check if it is a pure date YYYY-MM-DD
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyPattern.test(trimmed)) {
    const timeSuffix = isEnd ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
    const timestamp = Date.parse(`${trimmed}${timeSuffix}`);
    if (Number.isNaN(timestamp)) {
      return undefined;
    }
    return timestamp;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return timestamp;
}

export function matchesDateCondition(itemDateStr: string | undefined, condition: string): boolean {
  if (itemDateStr === undefined) {
    return false;
  }

  const itemTimestamp = Date.parse(itemDateStr);
  if (Number.isNaN(itemTimestamp)) {
    return false;
  }

  const trimmed = condition.trim();

  // Range syntax: DATE1..DATE2
  if (trimmed.includes('..')) {
    const parts = trimmed.split('..');
    const startStr = parts[0];
    const endStr = parts[1];

    if (startStr === undefined || endStr === undefined) {
      return false;
    }

    const min = parseDateBoundary(startStr, false);
    const max = parseDateBoundary(endStr, true);

    if (min !== undefined && itemTimestamp < min) {
      return false;
    }
    if (max !== undefined && itemTimestamp > max) {
      return false;
    }
    return true;
  }

  // Comparison syntax
  if (trimmed.startsWith('>=')) {
    const boundary = parseDateBoundary(trimmed.slice(2), false);
    if (boundary === undefined) return false;
    return itemTimestamp >= boundary;
  }
  if (trimmed.startsWith('>')) {
    const boundary = parseDateBoundary(trimmed.slice(1), true);
    if (boundary === undefined) return false;
    return itemTimestamp > boundary;
  }
  if (trimmed.startsWith('<=')) {
    const boundary = parseDateBoundary(trimmed.slice(2), true);
    if (boundary === undefined) return false;
    return itemTimestamp <= boundary;
  }
  if (trimmed.startsWith('<')) {
    const boundary = parseDateBoundary(trimmed.slice(1), false);
    if (boundary === undefined) return false;
    return itemTimestamp < boundary;
  }

  // Exact date match (single day range)
  const min = parseDateBoundary(trimmed, false);
  const max = parseDateBoundary(trimmed, true);
  if (min === undefined || max === undefined) {
    return false;
  }
  return itemTimestamp >= min && itemTimestamp <= max;
}

export function matchesNumberCondition(value: number | undefined | null, condition: string): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  const trimmed = condition.trim();

  // Range syntax: MIN..MAX
  if (trimmed.includes('..')) {
    const parts = trimmed.split('..');
    const minStr = parts[0]?.trim();
    const maxStr = parts[1]?.trim();

    const min = minStr === '*' || minStr === '' ? undefined : Number(minStr);
    const max = maxStr === '*' || maxStr === '' ? undefined : Number(maxStr);

    if (min !== undefined && (Number.isNaN(min) || value < min)) {
      return false;
    }
    if (max !== undefined && (Number.isNaN(max) || value > max)) {
      return false;
    }
    return true;
  }

  // Comparison syntax
  if (trimmed.startsWith('>=')) {
    const num = Number(trimmed.slice(2));
    return !Number.isNaN(num) && value >= num;
  }
  if (trimmed.startsWith('>')) {
    const num = Number(trimmed.slice(1));
    return !Number.isNaN(num) && value > num;
  }
  if (trimmed.startsWith('<=')) {
    const num = Number(trimmed.slice(2));
    return !Number.isNaN(num) && value <= num;
  }
  if (trimmed.startsWith('<')) {
    const num = Number(trimmed.slice(1));
    return !Number.isNaN(num) && value < num;
  }

  // Exact number
  const num = Number(trimmed);
  return !Number.isNaN(num) && value === num;
}

function evaluateQualifier(item: QueryMatchablePR, qualifier: string, value: string): boolean {
  switch (qualifier) {
    case 'is': {
      switch (value) {
        case 'pr':
          return true;
        case 'issue':
          return false;
        case 'open':
          return item.state === 'open';
        case 'closed':
          return item.state === 'closed' || item.state === 'merged';
        case 'merged':
          return item.state === 'merged';
        case 'unmerged':
          return item.state !== 'merged';
        case 'draft':
          return item.isDraft;
        case 'reviewed':
          return item.latestJob?.status === 'completed';
        case 'unreviewed':
          return item.latestJob?.status !== 'completed';
        case 'approved':
          return item.report?.verdict?.toUpperCase() === 'APPROVE';
        case 'changes-requested':
        case 'changes_requested':
          return item.report?.verdict?.toUpperCase() === 'REQUEST_CHANGES';
        case 'archived':
          return false;
        default:
          return false;
      }
    }

    case 'type': {
      if (value === 'pr') return true;
      if (value === 'issue') return false;
      return false;
    }

    case 'state': {
      if (value === 'open') return item.state === 'open';
      if (value === 'closed') return item.state === 'closed' || item.state === 'merged';
      if (value === 'merged') return item.state === 'merged';
      return false;
    }

    case 'draft': {
      if (value === 'true') return item.isDraft;
      if (value === 'false') return !item.isDraft;
      return false;
    }

    case 'review': {
      switch (value) {
        case 'none':
          return item.latestJob === undefined || item.latestJob === null || item.latestJob.status !== 'completed';
        case 'required':
          return item.latestJob === undefined || item.latestJob === null || item.latestJob.status !== 'completed';
        case 'approved':
          return item.report?.verdict?.toUpperCase() === 'APPROVE';
        case 'changes_requested':
        case 'changes-requested':
          return item.report?.verdict?.toUpperCase() === 'REQUEST_CHANGES';
        default:
          return false;
      }
    }

    case 'review-requested':
    case 'user-review-requested': {
      if (value === '@me' || value === 'me') {
        if (item.requestedReviewers && item.requestedReviewers.length > 0) {
          return item.requestedReviewers.some((r) => r.login.toLowerCase() === '@me' || r.login.toLowerCase() === 'me') || !item.isOwn;
        }
        return item.isOwn === false;
      }
      if (item.requestedReviewers && item.requestedReviewers.length > 0) {
        return item.requestedReviewers.some((r) => r.login.toLowerCase().includes(value));
      }
      return !item.isOwn;
    }

    case 'team-review-requested': {
      if (item.requestedReviewers) {
        return item.requestedReviewers.some((r) => r.isTeam && r.login.toLowerCase().includes(value));
      }
      return false;
    }

    case 'reviewed-by': {
      if (value === '@me' || value === 'me') {
        return item.latestJob?.status === 'completed';
      }
      return item.latestJob?.status === 'completed';
    }

    case 'review-involves': {
      if (value === '@me' || value === 'me') {
        return item.isOwn === false || item.latestJob?.status === 'completed';
      }
      const matchesReviewer = item.requestedReviewers?.some((r) => r.login.toLowerCase().includes(value)) ?? false;
      return matchesReviewer;
    }

    case 'assignee': {
      if (value === '*') {
        return (item.assignees?.length ?? 0) > 0;
      }
      if (value === 'none') {
        return (item.assignees?.length ?? 0) === 0;
      }
      if (value === '@me' || value === 'me') {
        return item.assignees?.some((a) => a.login.toLowerCase() === 'me' || a.login.toLowerCase() === '@me') ?? false;
      }
      return item.assignees?.some((a) => a.login.toLowerCase().includes(value)) ?? false;
    }

    case 'label': {
      if (!item.labels || item.labels.length === 0) {
        return false;
      }
      const targetLabels = value.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean);
      return item.labels.some((l) =>
        targetLabels.some((target) => l.name.toLowerCase() === target || l.name.toLowerCase().includes(target))
      );
    }

    case 'milestone': {
      if (!item.milestone) {
        return false;
      }
      if (value === '*') {
        return true;
      }
      return item.milestone.toLowerCase().includes(value);
    }

    case 'no': {
      switch (value) {
        case 'assignee':
          return (item.assignees?.length ?? 0) === 0;
        case 'label':
          return (item.labels?.length ?? 0) === 0;
        case 'milestone':
          return !item.milestone;
        case 'project':
          return true;
        default:
          return false;
      }
    }

    case 'has': {
      switch (value) {
        case 'assignee':
          return (item.assignees?.length ?? 0) > 0;
        case 'label':
          return (item.labels?.length ?? 0) > 0;
        case 'milestone':
          return Boolean(item.milestone);
        default:
          return false;
      }
    }

    case 'involves': {
      if (value === '@me' || value === 'me') {
        return true;
      }
      const matchesAuthor = item.author.toLowerCase().includes(value);
      const matchesAssignee = item.assignees?.some((a) => a.login.toLowerCase().includes(value)) ?? false;
      const matchesReviewer = item.requestedReviewers?.some((r) => r.login.toLowerCase().includes(value)) ?? false;
      return matchesAuthor || matchesAssignee || matchesReviewer;
    }

    case 'mentions':
    case 'commenter': {
      const matchesAuthor = item.author.toLowerCase().includes(value);
      const matchesAssignee = item.assignees?.some((a) => a.login.toLowerCase().includes(value)) ?? false;
      return matchesAuthor || matchesAssignee;
    }

    case 'author': {
      if (value === '@me' || value === 'me') {
        return item.isOwn === true || item.author.toLowerCase() === 'me';
      }
      const targetUser = value.startsWith('app/') ? value.slice(4) : value;
      return item.author.toLowerCase().includes(targetUser);
    }

    case 'additions': {
      return matchesNumberCondition(item.additions, value);
    }

    case 'deletions': {
      return matchesNumberCondition(item.deletions, value);
    }

    case 'lines':
    case 'size': {
      const totalLines = (item.additions ?? 0) + (item.deletions ?? 0);
      return matchesNumberCondition(totalLines, value);
    }

    case 'repo': {
      return item.repository.toLowerCase().includes(value);
    }

    case 'user':
    case 'org': {
      const parts = item.repository.toLowerCase().split('/');
      const orgOrUser = parts[0];
      if (orgOrUser === undefined) {
        return false;
      }
      return orgOrUser.includes(value);
    }

    case 'head': {
      if (item.sourceBranch === undefined) {
        return false;
      }
      return item.sourceBranch.toLowerCase().includes(value);
    }

    case 'base': {
      if (item.targetBranch === undefined) {
        return false;
      }
      return item.targetBranch.toLowerCase().includes(value);
    }

    case 'sha': {
      if (item.headSha === undefined) {
        return false;
      }
      return item.headSha.toLowerCase().startsWith(value);
    }

    case 'created': {
      return matchesDateCondition(item.createdAt, value);
    }

    case 'updated': {
      return matchesDateCondition(item.updatedAt, value);
    }

    case 'closed': {
      if (item.state !== 'closed' && item.state !== 'merged') return false;
      return matchesDateCondition(item.updatedAt, value);
    }

    case 'merged': {
      if (item.state !== 'merged') return false;
      return matchesDateCondition(item.updatedAt, value);
    }

    case 'status': {
      if (value === 'queued') {
        return item.latestJob?.status?.toLowerCase() === 'pending' || item.latestJob?.status?.toLowerCase() === 'queued';
      }
      return item.latestJob?.status?.toLowerCase() === value;
    }

    case 'verdict': {
      return item.report?.verdict?.toLowerCase() === value;
    }

    default:
      return false;
  }
}

export function filterByGitHubQuery<T extends QueryMatchablePR>(items: T[], query: string): T[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return items;
  }

  // Tokenize preserving quoted strings
  const rawTokens = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const validQualifiers = new Set([
    'is',
    'type',
    'state',
    'draft',
    'review',
    'review-requested',
    'user-review-requested',
    'team-review-requested',
    'reviewed-by',
    'review-involves',
    'author',
    'assignee',
    'label',
    'milestone',
    'no',
    'has',
    'involves',
    'mentions',
    'commenter',
    'additions',
    'deletions',
    'lines',
    'size',
    'repo',
    'user',
    'org',
    'head',
    'base',
    'sha',
    'created',
    'updated',
    'closed',
    'merged',
    'status',
    'verdict',
  ]);

  // Check if in:title or in:body qualifier exists in query
  let searchInTitleOnly = false;
  for (const token of rawTokens) {
    if (token.toLowerCase() === 'in:title') {
      searchInTitleOnly = true;
      break;
    }
  }

  return items.filter((item) => {
    for (let token of rawTokens) {
      token = token.trim();
      if (!token) continue;

      // Handle quotes
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }

      // Ignore search field specifiers themselves during item evaluation
      if (token.toLowerCase() === 'in:title' || token.toLowerCase() === 'in:body') {
        continue;
      }

      let isNegative = false;
      let expr = token;
      if (expr.startsWith('-')) {
        isNegative = true;
        expr = expr.slice(1);
      }

      const colonIndex = expr.indexOf(':');
      if (colonIndex > 0) {
        const qualifier = expr.slice(0, colonIndex).toLowerCase();
        let value = expr.slice(colonIndex + 1);

        // Strip quotes inside qualifier value if any (e.g. repo:"owner/name")
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        value = value.toLowerCase();

        if (validQualifiers.has(qualifier)) {
          const matched = evaluateQualifier(item, qualifier, value);
          if (isNegative ? matched : !matched) {
            return false;
          }
          continue;
        }
      }

      // Commit SHA direct match (7-40 hex chars)
      const isHexSha = /^[0-9a-f]{7,40}$/i.test(token);
      if (isHexSha && item.headSha !== undefined && item.headSha.toLowerCase().startsWith(token.toLowerCase())) {
        continue;
      }

      // Free text search
      const lowerKeyword = token.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(lowerKeyword);

      if (searchInTitleOnly) {
        if (!matchesTitle) {
          return false;
        }
        continue;
      }

      const matchesRepo = item.repository.toLowerCase().includes(lowerKeyword);
      const matchesNumber = item.number.toString().includes(lowerKeyword) || `#${item.number}`.includes(lowerKeyword);
      const matchesBranch = item.sourceBranch?.toLowerCase().includes(lowerKeyword) ?? false;
      const matchesAuthor = item.author.toLowerCase().includes(lowerKeyword);

      if (!matchesTitle && !matchesRepo && !matchesNumber && !matchesBranch && !matchesAuthor) {
        return false;
      }
    }

    return true;
  });
}
