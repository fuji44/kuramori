import type { EngineEnvironment } from '@review-base/core';

export function resolveEngineEnvironment(
  inherited: Record<string, string>,
  ...layers: Array<EngineEnvironment | undefined>
): Record<string, string> {
  const environment = { ...inherited };

  for (const layer of layers) {
    for (const [name, entry] of Object.entries(layer ?? {})) {
      if (typeof entry === 'string') {
        environment[name] = entry;
      } else if (!(entry.secret && entry.value === '' && entry.configured)) {
        environment[name] = entry.value;
      }
    }
  }

  return environment;
}
