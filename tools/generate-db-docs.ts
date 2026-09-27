import { getTableColumns, getTableName, isTable } from "drizzle-orm";
import * as schema from "../apps/server/src/db/schema.ts";

interface ColumnInfo {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  notNull: boolean;
  defaultValue?: string;
}

interface ForeignKeyRelation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

interface TableMetadata {
  tableName: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyRelation[];
}

const BEGIN_MARKER = "<!-- BEGIN_SCHEMA_DOCS -->";
const END_MARKER = "<!-- END_SCHEMA_DOCS -->";

function mapDataType(rawType: string, colName: string): string {
  if (colName.endsWith("_json")) {
    return "text (JSON)";
  }
  if (rawType === "string") return "text";
  if (rawType === "number") return "integer";
  if (rawType === "boolean") return "integer (boolean)";
  return rawType;
}

export function extractSchemaMetadata(): TableMetadata[] {
  const tables: TableMetadata[] = [];
  const fkSymbol = Symbol.for("drizzle:SQLiteInlineForeignKeys");

  // Consistent ordering of tables
  const tableEntries = Object.entries(schema)
    .filter(([_, val]) => isTable(val))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [_, tableObj] of tableEntries) {
    const tableName = getTableName(tableObj);
    const cols = getTableColumns(tableObj);
    const tableAny = tableObj as unknown as Record<symbol, unknown>;
    const rawFks = (tableAny[fkSymbol] as Array<{
      table?: Record<symbol, unknown>;
      reference: () => {
        columns: Array<{ name: string }>;
        foreignTable: Record<symbol, unknown>;
        foreignColumns: Array<{ name: string }>;
      };
    }>) ?? [];

    const foreignKeys: ForeignKeyRelation[] = [];
    const fkColNames = new Set<string>();

    for (const fk of rawFks) {
      if (typeof fk.reference !== "function") continue;
      const ref = fk.reference();
      const nameSymbol = Symbol.for("drizzle:Name");
      const foreignTableName = String(ref.foreignTable[nameSymbol] ?? "");
      const fromCol = ref.columns[0]?.name ?? "";
      const toCol = ref.foreignColumns[0]?.name ?? "";

      if (fromCol.length > 0 && foreignTableName.length > 0) {
        fkColNames.add(fromCol);
        foreignKeys.push({
          fromTable: tableName,
          fromColumn: fromCol,
          toTable: foreignTableName,
          toColumn: toCol,
        });
      }
    }

    const columns: ColumnInfo[] = Object.values(cols).map((c) => {
      const col = c as unknown as {
        name: string;
        dataType: string;
        primary: boolean;
        notNull: boolean;
        default?: unknown;
        hasDefault: boolean;
      };

      let defaultValue: string | undefined;
      if (col.hasDefault && col.default !== undefined) {
        defaultValue = String(col.default);
      }

      return {
        name: col.name,
        dataType: mapDataType(col.dataType, col.name),
        isPrimaryKey: col.primary,
        isForeignKey: fkColNames.has(col.name),
        notNull: col.notNull,
        defaultValue,
      };
    });

    tables.push({
      tableName,
      columns,
      foreignKeys,
    });
  }

  return tables;
}

export function generateSchemaMarkdown(tables: TableMetadata[]): string {
  const lines: string[] = [];

  lines.push("```mermaid");
  lines.push("erDiagram");

  // Collect all relations
  const allRelations: ForeignKeyRelation[] = [];
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      allRelations.push(fk);
    }
  }

  // Deduplicate and output relations: parent ||--o{ child
  const sortedRelations = allRelations.sort((a, b) =>
    a.toTable.localeCompare(b.toTable) || a.fromTable.localeCompare(b.fromTable)
  );

  for (const rel of sortedRelations) {
    lines.push(`    ${rel.toTable} ||--o{ ${rel.fromTable} : "references"`);
  }

  if (sortedRelations.length > 0) {
    lines.push("");
  }

  // Output table definitions for Mermaid
  for (const table of tables) {
    lines.push(`    ${table.tableName} {`);
    for (const col of table.columns) {
      const typeStr = col.dataType.replace(/\s+/g, "_").replace(
        /[()]/g,
        "",
      );
      const pkFk = col.isPrimaryKey ? "PK" : (col.isForeignKey ? "FK" : "");
      if (pkFk.length > 0) {
        lines.push(`        ${typeStr} ${col.name} ${pkFk}`);
      } else {
        lines.push(`        ${typeStr} ${col.name}`);
      }
    }
    lines.push(`    }`);
    lines.push("");
  }

  // Remove trailing empty line before closing mermaid block
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  lines.push("```");
  lines.push("");

  // Detailed Table Catalog
  lines.push("### Table Catalog");
  lines.push("");

  for (const table of tables) {
    lines.push(`#### \`${table.tableName}\``);
    lines.push("");
    lines.push("| Column | Type | Constraints | Default |");
    lines.push("| :--- | :--- | :--- | :--- |");

    for (const col of table.columns) {
      const constraints: string[] = [];
      if (col.isPrimaryKey) constraints.push("**PK**");
      if (col.isForeignKey) constraints.push("FK");
      if (col.notNull) constraints.push("NOT NULL");

      const constraintStr = constraints.length > 0 ? constraints.join(", ") : "-";
      const defaultStr = col.defaultValue !== undefined
        ? `\`${col.defaultValue}\``
        : "-";

      lines.push(
        `| \`${col.name}\` | \`${col.dataType}\` | ${constraintStr} | ${defaultStr} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export async function synchronizeDocs(
  filePath: string,
  options: { checkOnly?: boolean } = {},
): Promise<{ updated: boolean; diffDetected: boolean }> {
  const currentContent = await Deno.readTextFile(filePath);

  const startIndex = currentContent.indexOf(BEGIN_MARKER);
  const endIndex = currentContent.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(
      `Markers ${BEGIN_MARKER} and ${END_MARKER} not found in ${filePath}`,
    );
  }

  const tables = extractSchemaMetadata();
  const generatedMarkdown = generateSchemaMarkdown(tables);

  const before = currentContent.slice(0, startIndex + BEGIN_MARKER.length);
  const after = currentContent.slice(endIndex);

  const newContent = `${before}\n\n${generatedMarkdown}\n\n${after}`;

  const diffDetected = newContent !== currentContent;

  if (options.checkOnly) {
    return { updated: false, diffDetected };
  }

  if (diffDetected) {
    await Deno.writeTextFile(filePath, newContent);
    return { updated: true, diffDetected: true };
  }

  return { updated: false, diffDetected: false };
}

if (import.meta.main) {
  const isCheckMode = Deno.args.includes("--check");
  const targetDocPath = new URL("../docs/data-model.md", import.meta.url).pathname;

  try {
    const result = await synchronizeDocs(targetDocPath, {
      checkOnly: isCheckMode,
    });

    if (isCheckMode) {
      if (result.diffDetected) {
        console.error(
          "❌ [DRIFT DETECTED] Database documentation in docs/data-model.md is out of sync with apps/server/src/db/schema.ts.",
        );
        console.error(
          "Run 'deno task build:doc' (or 'deno task build') to synchronize the documentation.",
        );
        Deno.exit(1);
      } else {
        console.log("✓ Schema documentation is in sync with Drizzle ORM schema.");
      }
    } else {
      if (result.updated) {
        console.log("✓ Synchronized schema documentation into docs/data-model.md.");
      } else {
        console.log("✓ Schema documentation already up to date.");
      }
    }
  } catch (error) {
    console.error("Error executing database documentation generator:", error);
    Deno.exit(1);
  }
}
