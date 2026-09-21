export interface FilterUrlParams {
  q?: string;
  status?: 'all' | 'unreviewed' | 'completed';
  repo?: string;
  report?: string;
  includeOwn?: boolean;
}

export function parseUrlParams(search: string): FilterUrlParams {
  const params = new URLSearchParams(search);
  const qVal = params.get('q');
  const q = qVal !== null && qVal.trim() !== '' ? qVal : undefined;

  const statusParam = params.get('status');
  let status: 'all' | 'unreviewed' | 'completed' | undefined = undefined;
  if (statusParam === 'unreviewed' || statusParam === 'completed' || statusParam === 'all') {
    status = statusParam;
  }

  const repoVal = params.get('repo');
  const repo = repoVal !== null && repoVal.trim() !== '' ? repoVal : undefined;

  const reportVal = params.get('report');
  const report = reportVal !== null && reportVal.trim() !== '' ? reportVal : undefined;

  const ownParam = params.get('own') ?? params.get('includeOwn');
  const includeOwn = ownParam === 'true' || ownParam === '1' ? true : undefined;

  return { q, status, repo, report, includeOwn };
}

export function buildUrlSearch(params: FilterUrlParams): string {
  const sp = new URLSearchParams();

  if (params.q !== undefined && params.q.trim() !== '') {
    sp.set('q', params.q.trim());
  }

  if (params.status !== undefined && params.status !== 'all') {
    sp.set('status', params.status);
  }

  if (params.repo !== undefined && params.repo !== 'all') {
    sp.set('repo', params.repo);
  }

  if (params.report !== undefined && params.report.trim() !== '') {
    sp.set('report', params.report);
  }

  if (params.includeOwn === true) {
    sp.set('own', 'true');
  }

  const queryStr = sp.toString();
  if (queryStr === '') {
    return '';
  }
  return `?${queryStr}`;
}
