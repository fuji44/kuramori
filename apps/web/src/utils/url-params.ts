export interface FilterUrlParams {
  q?: string;
  report?: string;
}

export function parseUrlParams(search: string): FilterUrlParams {
  const params = new URLSearchParams(search);
  const qVal = params.get('q');
  const q = qVal !== null && qVal.trim() !== '' ? qVal : undefined;

  const reportVal = params.get('report');
  const report = reportVal !== null && reportVal.trim() !== '' ? reportVal : undefined;

  return { q, report };
}

export function buildUrlSearch(params: FilterUrlParams): string {
  const sp = new URLSearchParams();

  if (params.q !== undefined && params.q.trim() !== '') {
    sp.set('q', params.q.trim());
  }

  if (params.report !== undefined && params.report.trim() !== '') {
    sp.set('report', params.report);
  }

  const queryStr = sp.toString();
  if (queryStr === '') {
    return '';
  }
  return `?${queryStr}`;
}
