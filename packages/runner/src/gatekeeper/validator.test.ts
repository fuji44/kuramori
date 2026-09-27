import { assertEquals } from "@std/assert";
import {
  validateReviewReportData,
  auditFileAnchors,
  formatViolationsForPrompt,
} from "./validator.ts";

Deno.test("validateReviewReportData - accepts valid report", () => {
  const valid = {
    verdict: "APPROVE",
    summary: {
      brief: "軽微なリファクタリング",
      changedCode: "型注釈の整理",
    },
    comments: [
      {
        id: "C1",
        path: "packages/core/index.ts",
        line: 12,
        severity: "P3",
        category: "convention",
        title: "コメントの整理",
        body: "不要なインラインコメントを整理",
      },
    ],
  };

  const result = validateReviewReportData(valid);
  assertEquals(result.success, true);
  assertEquals(result.data?.verdict, "APPROVE");
  assertEquals(result.data?.comments[0].id, "C1");
});

Deno.test("validateReviewReportData - detects duplicate comment IDs", () => {
  const duplicateIds = {
    verdict: "APPROVE",
    summary: {
      brief: "サマリ",
      changedCode: "コード",
    },
    comments: [
      {
        id: "C1",
        path: "a.ts",
        line: 10,
        severity: "P2",
        category: "bug",
        title: "バグ1",
        body: "詳細1",
      },
      {
        id: "C1", // 重複
        path: "b.ts",
        line: 20,
        severity: "P2",
        category: "bug",
        title: "バグ2",
        body: "詳細2",
      },
    ],
  };

  const result = validateReviewReportData(duplicateIds);
  assertEquals(result.success, false);
  assertEquals(result.violations?.[0].code, "duplicate_id");
  assertEquals(result.violations?.[0].path, "comments.1.id");
});

Deno.test("auditFileAnchors - flags files not present in PR diff", () => {
  const comments = [
    {
      id: "C1",
      path: "src/valid.ts",
      line: 10,
      side: "RIGHT" as const,
      severity: "P2" as const,
      category: "bug" as const,
      title: "指摘",
      body: "本文",
    },
    {
      id: "C2",
      path: "src/non-existent.ts",
      line: 20,
      side: "RIGHT" as const,
      severity: "P1" as const,
      category: "security" as const,
      title: "不正パス",
      body: "本文",
    },
  ];

  const changedFiles = new Set(["src/valid.ts", "src/other.ts"]);
  const violations = auditFileAnchors(comments, changedFiles);

  assertEquals(violations.length, 1);
  assertEquals(violations[0].code, "file_not_in_diff");
  assertEquals(violations[0].path, "comments.1.path");
});

Deno.test("formatViolationsForPrompt - formats human and AI readable error text", () => {
  const violations = [
    {
      path: "comments.0.id",
      message: "IDは C1, C2 のような形式である必要があります",
      code: "invalid_string",
    },
  ];

  const text = formatViolationsForPrompt(violations);
  assertEquals(
    text.includes("`comments.0.id`: IDは C1, C2 のような形式である必要があります"),
    true
  );
});
