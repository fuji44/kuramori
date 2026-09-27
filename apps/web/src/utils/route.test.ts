import { assertEquals } from '@std/assert';
import { parseRoute, buildRouteUrl } from './route.ts';

Deno.test('route - parseRoute identifies dashboard path', () => {
  const route = parseRoute('/', '');
  assertEquals(route.view, 'dashboard');

  const emptyRoute = parseRoute('', '');
  assertEquals(emptyRoute.view, 'dashboard');
});

Deno.test('route - parseRoute identifies reviews path and query', () => {
  const route = parseRoute('/pulls', '?q=is:open');
  assertEquals(route.view, 'reviews');
  if (route.view === 'reviews') {
    assertEquals(route.params.q, 'is:open');
  }

});

Deno.test('route - /reviews is not a PR list route', () => {
  assertEquals(parseRoute('/reviews', '').view, 'dashboard');
});

Deno.test('route - saved filters have a dedicated URL', () => {
  const route = parseRoute('/pulls/filters/filter-123', '?q=is:open');
  assertEquals(route.view, 'reviews');
  if (route.view === 'reviews') {
    assertEquals(route.filterId, 'filter-123');
    assertEquals(route.params.q, 'is:open');
  }
  assertEquals(buildRouteUrl({ view: 'reviews', filterId: 'filter-123', params: { q: 'is:open' } }), '/pulls/filters/filter-123?q=is%3Aopen');
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

  const licensesRoute = parseRoute('/settings/licenses', '');
  assertEquals(licensesRoute.view, 'settings');
  if (licensesRoute.view === 'settings') {
    assertEquals(licensesRoute.subview, 'licenses');
  }
});

Deno.test('route - buildRouteUrl formats paths accurately', () => {
  assertEquals(buildRouteUrl({ view: 'dashboard' }), '/');
  assertEquals(
    buildRouteUrl({ view: 'reviews', params: { q: 'is:open' } }),
    '/pulls?q=is%3Aopen'
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
    buildRouteUrl({ view: 'settings', subview: 'rules' }),
    '/settings/rules'
  );
  assertEquals(
    buildRouteUrl({ view: 'settings', subview: 'licenses' }),
    '/settings/licenses'
  );
});
