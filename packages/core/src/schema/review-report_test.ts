import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  ReviewReportDataSchema,
  getReviewReportJsonSchema,
  type ReviewReportData,
} from "./review-report.ts";

Deno.test("ReviewReportDataSchema parses valid review report data", () => {
  const validData: ReviewReportData = {
    verdict: "REQUEST_CHANGES",
    summary: {
      brief: "ユーザー認証ロジックの修正とセッション管理の改善",
      changedCode: "AuthService.validateSession におけるトークン失効判定を強化",
      reachPaths: ["src/auth/", "src/routes/api.ts"],
    },
    comments: [
      {
        id: "C1",
        path: "src/auth/service.ts",
        line: 42,
        side: "RIGHT",
        severity: "P1",
        category: "security",
        title: "トークン検証時の null チェック漏れ",
        body: "payload が undefined の場合に例外がスローされず認証バイパスが発生する恐れがあります。",
        suggestion: {
          snippet: "if (!payload) throw new UnauthorizedError();",
        },
      },
      {
        id: "C2",
        path: "src/auth/service.ts",
        line: 88,
        side: "RIGHT",
        severity: "P3",
        category: "convention",
        title: "不要な as const アサーション",
        body: "型推論で十分なため as const は削除可能です。",
      },
    ],
    diagram: {
      nodes: [
        { id: "service", label: "AuthService", type: "modified", severity: "P1" },
        { id: "controller", label: "AuthController", type: "affected" },
      ],
      edges: [
        { from: "controller", to: "service", label: "calls" },
      ],
    },
    callFlow: {
      steps: [
        { step: 1, title: "Request Received", status: "unchanged" },
        { step: 2, title: "Token Validation", status: "modified", commentId: "C1" },
      ],
    },
    metrics: {
      filesAnalyzed: 3,
      findingsCount: 2,
      p1Count: 1,
      p2Count: 0,
      p3Count: 1,
    },
  };

  const parsed = ReviewReportDataSchema.parse(validData);
  assertEquals(parsed.verdict, "REQUEST_CHANGES");
  assertEquals(parsed.comments.length, 2);
  assertEquals(parsed.comments[0].id, "C1");
  assertEquals(parsed.diagram?.nodes.length, 2);
  assertEquals(parsed.callFlow?.steps.length, 2);
});

Deno.test("ReviewReportDataSchema rejects invalid comment ID format", () => {
  const invalidData = {
    verdict: "APPROVE",
    summary: {
      brief: "テスト",
      changedCode: "テスト",
    },
    comments: [
      {
        id: "invalid-id", // C1 形式でない
        path: "src/test.ts",
        line: 10,
        severity: "P2",
        category: "bug",
        title: "テスト",
        body: "テスト",
      },
    ],
  };

  const result = ReviewReportDataSchema.safeParse(invalidData);
  assertEquals(result.success, false);
  if (!result.success) {
    const idIssue = result.error.issues.find(
      (issue) => issue.path.join(".") === "comments.0.id"
    );
    assertExists(idIssue);
  }
});

Deno.test("getReviewReportJsonSchema generates valid JSON Schema using Zod 4", () => {
  const jsonSchema = getReviewReportJsonSchema() as Record<string, unknown>;
  assertExists(jsonSchema);
  assertEquals(jsonSchema.type, "object");
  assertExists(jsonSchema.properties);

  const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;
  assertExists(properties.verdict);
  assertExists(properties.summary);
  assertExists(properties.comments);
  assertExists(properties.diagram);
  assertExists(properties.callFlow);
});
