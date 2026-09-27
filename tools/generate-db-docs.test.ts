import { assertEquals } from "@std/assert";
import {
  extractSchemaMetadata,
  generateSchemaMarkdown,
  synchronizeDocs,
} from "./generate-db-docs.ts";

Deno.test("generate-db-docs - extracts all tables and foreign keys", () => {
  const tables = extractSchemaMetadata();

  assertEquals(tables.length, 8);

  const tableNames = tables.map((t) => t.tableName);
  assertEquals(tableNames.includes("review_requests"), true);
  assertEquals(tableNames.includes("review_jobs"), true);
  assertEquals(tableNames.includes("review_rules"), true);
  assertEquals(tableNames.includes("review_triggers"), true);
  assertEquals(tableNames.includes("review_reports"), true);
  assertEquals(tableNames.includes("review_rule_results"), true);
  assertEquals(tableNames.includes("app_settings"), true);
  assertEquals(tableNames.includes("pull_filters"), true);

  const jobTable = tables.find((t) => t.tableName === "review_jobs");
  assertEquals(jobTable !== undefined, true);
  if (jobTable !== undefined) {
    const reqFk = jobTable.foreignKeys.find(
      (fk) => fk.fromColumn === "request_id",
    );
    assertEquals(reqFk !== undefined, true);
    assertEquals(reqFk?.toTable, "review_requests");
  }
});

Deno.test("generate-db-docs - generates mermaid ERD and table catalog", () => {
  const tables = extractSchemaMetadata();
  const md = generateSchemaMarkdown(tables);

  assertEquals(md.includes("erDiagram"), true);
  assertEquals(md.includes("review_requests ||--o{ review_jobs"), true);
  assertEquals(md.includes("### Table Catalog"), true);
  assertEquals(md.includes("#### `review_requests`"), true);
});

Deno.test("generate-db-docs - checkOnly reports no diff on synchronized documentation", async () => {
  const docPath = new URL("../docs/data-model.md", import.meta.url).pathname;
  const result = await synchronizeDocs(docPath, { checkOnly: true });

  assertEquals(result.diffDetected, false);
});
