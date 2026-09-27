import { assertEquals } from "@std/assert";
import plugin from "./boundaries.ts";

Deno.test("boundaries - no-package-to-app-import detects relative import from packages to apps", () => {
  const code = `import { app } from "../../apps/server/src/index.ts";`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "packages/core/src/sub/file.ts",
    code,
  );

  assertEquals(diagnostics.length, 1);
  assertEquals(
    diagnostics[0].id,
    "architecture-boundaries/no-package-to-app-import",
  );
});

Deno.test("boundaries - no-package-to-app-import detects dynamic import from packages to apps", () => {
  const code = `const mod = await import("../../apps/server/src/index.ts");`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "packages/runner/src/cli.ts",
    code,
  );

  assertEquals(diagnostics.length, 1);
  assertEquals(
    diagnostics[0].id,
    "architecture-boundaries/no-package-to-app-import",
  );
});

Deno.test("boundaries - no-package-to-app-import detects export from apps", () => {
  const code = `export { Server } from "../../apps/server/src/index.ts";`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "packages/core/src/index.ts",
    code,
  );

  assertEquals(diagnostics.length, 1);
  assertEquals(
    diagnostics[0].id,
    "architecture-boundaries/no-package-to-app-import",
  );
});

Deno.test("boundaries - apps importing packages is permitted", () => {
  const code = `import { ReviewReport } from "../../packages/core/src/index.ts";`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "apps/server/src/index.ts",
    code,
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("boundaries - packages importing sibling core is permitted", () => {
  const code = `import { ReviewReport } from "../core/src/index.ts";`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "packages/runner/src/index.ts",
    code,
  );

  assertEquals(diagnostics.length, 0);
});

Deno.test("boundaries - no-core-outward-import rejects core importing runner", () => {
  const code = `import { runReview } from "../../runner/src/index.ts";`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "packages/core/src/service.ts",
    code,
  );

  assertEquals(diagnostics.length, 1);
  assertEquals(
    diagnostics[0].id,
    "architecture-boundaries/no-core-outward-import",
  );
});

Deno.test("boundaries - no-i18n-external-package-import rejects i18n importing runner", () => {
  const code = `import { runner } from "../../runner/src/index.ts";`;
  const diagnostics = Deno.lint.runPlugin(
    plugin,
    "packages/i18n/src/index.ts",
    code,
  );

  assertEquals(diagnostics.length, 1);
  assertEquals(
    diagnostics[0].id,
    "architecture-boundaries/no-i18n-external-package-import",
  );
});
