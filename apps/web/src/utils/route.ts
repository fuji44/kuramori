/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { useEffect, useState, useCallback } from 'react';
import { parseUrlParams, buildUrlSearch, FilterUrlParams } from './url-params.ts';

export type AppRoute =
  | { view: 'dashboard' }
  | { view: 'reviews'; params: FilterUrlParams }
  | { view: 'reports' }
  | { view: 'report'; reportId: string };

export function parseRoute(pathname: string, search: string): AppRoute {
  // Normalize pathname
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/reports') {
    return { view: 'reports' };
  }

  if (cleanPath.startsWith('/reports/')) {
    const reportId = decodeURIComponent(cleanPath.slice(9)).trim();
    if (reportId !== '') {
      return { view: 'report', reportId };
    }
    return { view: 'reports' };
  }

  if (cleanPath === '/reviews' || cleanPath === '/pulls') {
    return { view: 'reviews', params: parseUrlParams(search) };
  }

  // Legacy fallback: /?report=xxx -> report view
  const legacyParams = parseUrlParams(search);
  if (legacyParams.report) {
    return { view: 'report', reportId: legacyParams.report };
  }

  // Legacy fallback: /?q=... -> reviews view
  if (legacyParams.q !== undefined || legacyParams.status !== undefined || legacyParams.repo !== undefined || legacyParams.includeOwn !== undefined) {
    return { view: 'reviews', params: legacyParams };
  }

  return { view: 'dashboard' };
}

export function buildRouteUrl(route: AppRoute): string {
  switch (route.view) {
    case 'dashboard':
      return '/';
    case 'reviews': {
      const search = buildUrlSearch(route.params);
      return `/reviews${search}`;
    }
    case 'reports':
      return '/reports';
    case 'report':
      return `/reports/${encodeURIComponent(route.reportId)}`;
  }
}

const ROUTE_CHANGE_EVENT = 'app:routechange';

export function navigateTo(url: string, replace = false): void {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== url) {
    if (replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
  }
}

export function useAppRoute(): [AppRoute, (route: AppRoute, replace?: boolean) => void] {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
    parseRoute(window.location.pathname, window.location.search)
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(parseRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener(ROUTE_CHANGE_EVENT, handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener(ROUTE_CHANGE_EVENT, handleLocationChange);
    };
  }, []);

  const navigate = useCallback((route: AppRoute, replace = false) => {
    navigateTo(buildRouteUrl(route), replace);
  }, []);

  return [currentRoute, navigate];
}
