/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { useEffect, useState, useCallback } from 'react';
import { parseUrlParams, buildUrlSearch, type FilterUrlParams } from './url-params.ts';
import { assertNever } from './assert.ts';

export type SettingsSubview = 'general' | 'engines' | 'rules' | 'triggers' | 'licenses';

export type AppRoute =
  | { view: 'dashboard' }
  | { view: 'reviews'; params: FilterUrlParams; filterId?: string }
  | { view: 'reports' }
  | { view: 'report'; reportId: string }
  | { view: 'settings'; subview: SettingsSubview };

export function parseRoute(pathname: string, search: string): AppRoute {
  // Normalize pathname
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/settings' || cleanPath === '/settings/general') {
    return { view: 'settings', subview: 'general' };
  }

  if (cleanPath === '/settings/engines') {
    return { view: 'settings', subview: 'engines' };
  }

  if (cleanPath === '/settings/rules') {
    return { view: 'settings', subview: 'rules' };
  }

  if (cleanPath === '/settings/triggers') {
    return { view: 'settings', subview: 'triggers' };
  }

  if (cleanPath === '/settings/licenses') {
    return { view: 'settings', subview: 'licenses' };
  }

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

  const savedFilterMatch = cleanPath.match(/^\/pulls\/filters\/([^/]+)$/);
  if (savedFilterMatch) {
    return {
      view: 'reviews',
      params: parseUrlParams(search),
      filterId: decodeURIComponent(savedFilterMatch[1]),
    };
  }

  if (cleanPath === '/pulls') {
    return { view: 'reviews', params: parseUrlParams(search) };
  }

  // Legacy fallback: /?report=xxx -> report view
  const legacyParams = parseUrlParams(search);
  if (legacyParams.report) {
    return { view: 'report', reportId: legacyParams.report };
  }

  // Legacy fallback: /?q=... -> reviews view
  if (legacyParams.q !== undefined) {
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
      const basePath = route.filterId
        ? `/pulls/filters/${encodeURIComponent(route.filterId)}`
        : '/pulls';
      return `${basePath}${search}`;
    }
    case 'reports':
      return '/reports';
    case 'report':
      return `/reports/${encodeURIComponent(route.reportId)}`;
    case 'settings':
      return `/settings/${route.subview}`;
    default:
      return assertNever(route);
  }
}

const ROUTE_CHANGE_EVENT = 'app:routechange';

export function navigateTo(url: string, replace = false): void {
  const current = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
  if (current !== url) {
    if (replace) {
      globalThis.history.replaceState(null, '', url);
    } else {
      globalThis.history.pushState(null, '', url);
    }
    globalThis.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
  }
}

export function useAppRoute(): [AppRoute, (route: AppRoute, replace?: boolean) => void] {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
    parseRoute(globalThis.location.pathname, globalThis.location.search)
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(parseRoute(globalThis.location.pathname, globalThis.location.search));
    };

    globalThis.addEventListener('popstate', handleLocationChange);
    globalThis.addEventListener(ROUTE_CHANGE_EVENT, handleLocationChange);

    return () => {
      globalThis.removeEventListener('popstate', handleLocationChange);
      globalThis.removeEventListener(ROUTE_CHANGE_EVENT, handleLocationChange);
    };
  }, []);

  const navigate = useCallback((route: AppRoute, replace = false) => {
    navigateTo(buildRouteUrl(route), replace);
  }, []);

  return [currentRoute, navigate];
}
