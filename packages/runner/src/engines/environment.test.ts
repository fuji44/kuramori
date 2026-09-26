import { assertEquals } from '@std/assert';
import { resolveEngineEnvironment } from './environment.ts';

Deno.test('resolveEngineEnvironment - layers profile values over inherited and engine defaults', () => {
  const environment = resolveEngineEnvironment(
    { PATH: '/usr/bin', SERVICE_URL: 'inherited' },
    { SERVICE_URL: 'engine-default', ENGINE_ONLY: 'engine-value' },
    {
      SERVICE_URL: { value: 'profile-value', secret: false },
      PROFILE_SECRET: { value: 'profile-secret', secret: true },
    },
  );

  assertEquals(environment, {
    PATH: '/usr/bin',
    SERVICE_URL: 'profile-value',
    ENGINE_ONLY: 'engine-value',
    PROFILE_SECRET: 'profile-secret',
  });
});
