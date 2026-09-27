import { normalize } from "@std/path";

function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function resolveImportPath(currentFilePath: string, specifier: string): string {
  const normalizedCurrent = normalizePath(currentFilePath);
  if (!specifier.startsWith(".")) {
    return specifier;
  }
  const lastSlashIndex = normalizedCurrent.lastIndexOf("/");
  const currentDir = lastSlashIndex !== -1
    ? normalizedCurrent.slice(0, lastSlashIndex)
    : "";
  return normalizePath(normalize(`${currentDir}/${specifier}`));
}

function checkPackageToAppBoundary(
  context: Deno.lint.RuleContext,
  node: unknown,
  specifier: string,
): void {
  const normalizedFile = normalizePath(context.filename);
  const isInsidePackage = normalizedFile.includes("/packages/") ||
    normalizedFile.startsWith("packages/");

  if (!isInsidePackage) {
    return;
  }

  const resolved = resolveImportPath(context.filename, specifier);
  const isImportingApp = resolved.includes("/apps/") ||
    resolved.startsWith("apps/") ||
    specifier.startsWith("@kuramori/server") ||
    specifier.startsWith("@kuramori/web");

  if (isImportingApp) {
    context.report({
      node: node as never,
      message:
        "Packages must never import from apps. Reusable modules cannot depend on application targets. See docs/architecture.md.",
    });
  }
}

function checkCoreOutwardBoundary(
  context: Deno.lint.RuleContext,
  node: unknown,
  specifier: string,
): void {
  const normalizedFile = normalizePath(context.filename);
  const isInsideCore = normalizedFile.includes("/packages/core/") ||
    normalizedFile.startsWith("packages/core/");

  if (!isInsideCore) {
    return;
  }

  const resolved = resolveImportPath(context.filename, specifier);
  const isImportingOuterPackage = resolved.includes("/packages/runner/") ||
    resolved.startsWith("packages/runner/") ||
    specifier.startsWith("@kuramori/runner");

  if (isImportingOuterPackage) {
    context.report({
      node: node as never,
      message:
        "Core domain package must never import from outer packages (runner). See docs/architecture.md.",
    });
  }
}

function checkI18nSelfContainedBoundary(
  context: Deno.lint.RuleContext,
  node: unknown,
  specifier: string,
): void {
  const normalizedFile = normalizePath(context.filename);
  const isInsideI18n = normalizedFile.includes("/packages/i18n/") ||
    normalizedFile.startsWith("packages/i18n/");

  if (!isInsideI18n) {
    return;
  }

  const resolved = resolveImportPath(context.filename, specifier);
  const isImportingSiblingPackage = resolved.includes("/packages/runner/") ||
    resolved.startsWith("packages/runner/") ||
    specifier.startsWith("@kuramori/runner");

  if (isImportingSiblingPackage) {
    context.report({
      node: node as never,
      message:
        "i18n package must remain self-contained and not depend on sibling packages (runner). See docs/architecture.md.",
    });
  }
}

const plugin: Deno.lint.Plugin = {
  name: "architecture-boundaries",
  rules: {
    "no-package-to-app-import": {
      create(context) {
        return {
          ImportDeclaration(node) {
            checkPackageToAppBoundary(context, node, node.source.value);
          },
          ExportNamedDeclaration(node) {
            if (node.source !== null && node.source !== undefined) {
              checkPackageToAppBoundary(context, node, node.source.value);
            }
          },
          ExportAllDeclaration(node) {
            checkPackageToAppBoundary(context, node, node.source.value);
          },
          ImportExpression(node) {
            if (
              node.source.type === "Literal" &&
              typeof node.source.value === "string"
            ) {
              checkPackageToAppBoundary(context, node, node.source.value);
            }
          },
        };
      },
    },
    "no-core-outward-import": {
      create(context) {
        return {
          ImportDeclaration(node) {
            checkCoreOutwardBoundary(context, node, node.source.value);
          },
          ExportNamedDeclaration(node) {
            if (node.source !== null && node.source !== undefined) {
              checkCoreOutwardBoundary(context, node, node.source.value);
            }
          },
          ExportAllDeclaration(node) {
            checkCoreOutwardBoundary(context, node, node.source.value);
          },
          ImportExpression(node) {
            if (
              node.source.type === "Literal" &&
              typeof node.source.value === "string"
            ) {
              checkCoreOutwardBoundary(context, node, node.source.value);
            }
          },
        };
      },
    },
    "no-i18n-external-package-import": {
      create(context) {
        return {
          ImportDeclaration(node) {
            checkI18nSelfContainedBoundary(context, node, node.source.value);
          },
          ExportNamedDeclaration(node) {
            if (node.source !== null && node.source !== undefined) {
              checkI18nSelfContainedBoundary(context, node, node.source.value);
            }
          },
          ExportAllDeclaration(node) {
            checkI18nSelfContainedBoundary(context, node, node.source.value);
          },
          ImportExpression(node) {
            if (
              node.source.type === "Literal" &&
              typeof node.source.value === "string"
            ) {
              checkI18nSelfContainedBoundary(context, node, node.source.value);
            }
          },
        };
      },
    },
  },
};

export default plugin;
