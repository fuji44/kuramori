import { assertEquals } from 'jsr:@std/assert@^1.0.11';
import { parseRoute, buildRouteUrl } from './route.ts';

Deno.test('route - parseRoute identifies dashboard path', () => {
  const route = parseRoute('/', '');
  assertEquals(route.view, 'dashboard');

  const emptyRoute = parseRoute('', '');
  assertEquals(emptyRoute.view, 'dashboard');
});

Deno.test('route - parseRoute identifies reviews path and query', () => {
  const route = parseRoute('/reviews', '?status=unreviewed&repo=owner/repo&own=true');
  assertEquals(route.view, 'reviews');
  if (route.view === 'reviews') {
    assertEquals(route.params.status, 'unreviewed');
    assertEquals(route.params.repo, 'owner/repo');
    assertEquals(route.params.includeOwn, true);
  }

  // Alias /pulls
  const aliasRoute = parseRoute('/pulls', '');
  assertEquals(aliasRoute.view, 'reviews');
});

Deno.test('route - parseRoute identifies report path', () => {
  const route = parseRoute('/reports/rep-12345', '');
  assertEquals(route.view, 'report');
  if (route.view === 'report') {
    assertEquals(route.reportId, 'rep-12345');
  }
});

Deno.test('route - parseRoute supports legacy query redirects', () => {
  const legacyReport = parseRoute('/', '?report=rep-legacy');
  assertEquals(legacyReport.view, 'report');
  if (legacyReport.view === 'report') {
    assertEquals(legacyReport.reportId, 'rep-legacy');
  }

  const legacyReviews = parseRoute('/', '?q=author:me');
  assertEquals(legacyReviews.view, 'reviews');
  if (legacyReviews.view === 'reviews') {
    assertEquals(legacyReviews.params.q, 'author:me');
  }
});

Deno.test('route - parseRoute identifies reports list path', () => {
  const route = parseRoute('/reports', '');
  assertEquals(route.view, 'reports');

  const trailingSlashRoute = parseRoute('/reports/', '');
  assertEquals(trailingSlashRoute.view, 'reports');
});

Deno.test('route - parseRoute identifies settings paths', () => {
  const settingsRoute = parseRoute('/settings', '');
  assertEquals(settingsRoute.view, 'settings');
  if (settingsRoute.view === 'settings') {
    assertEquals(settingsRoute.subview, 'general');
  }

  const generalRoute = parseRoute('/settings/general', '');
  assertEquals(generalRoute.view, 'settings');
  if (generalRoute.view === 'settings') {
    assertEquals(generalRoute.subview, 'general');
  }

  const enginesRoute = parseRoute('/settings/engines', '');
  assertEquals(enginesRoute.view, 'settings');
  if (enginesRoute.view === 'settings') {
    assertEquals(enginesRoute.subview, 'engines');
  }

  const rulesRoute = parseRoute('/settings/rules', '');
  assertEquals(rulesRoute.view, 'settings');
  if (rulesRoute.view === 'settings') {
    assertEquals(rulesRoute.subview, 'rules');
  }

  const triggersRoute = parseRoute('/settings/triggers', '');
  assertEquals(triggersRoute.view, 'settings');
  if (triggersRoute.view === 'settings') {
    assertEquals(triggersRoute.subview, 'triggers');
  }
});

Deno.test('route - buildRouteUrl formats paths accurately', () => {
  assertEquals(buildRouteUrl({ view: 'dashboard' }), '/');
  assertEquals(
    buildRouteUrl({ view: 'reviews', params: { status: 'unreviewed' } }),
    '/reviews?status=unreviewed'
  );
  assertEquals(buildRouteUrl({ view: 'reports' }), '/reports');
  assertEquals(
    buildRouteUrl({ view: 'report', reportId: 'rep-abc' }),
    '/reports/rep-abc'
  );
  assertEquals(
    buildRouteUrl({ view: 'settings', subview: 'general' }),
    '/settings/general'
  );
  assertEquals(
    buildRouteUrl({ view: 'settings', subview: 'engines' }),
    '/settings/engines'
  );
  assertEquals(
    buildRouteUrl({ view: 'settings', subview: 'rules' }),
    '/settings/rules'
  );
});
