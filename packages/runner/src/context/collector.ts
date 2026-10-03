export interface StoryContext {
  number: number;
  url: string;
  title: string;
  body: string;
}

export interface ExistingCommentContext {
  id: number | string;
  author: string;
  body: string;
  path?: string;
  line?: number;
  createdAt: string;
}

export interface ReviewPreFlightContext {
  pr: {
    repository: string;
    number: number;
    title: string;
    body: string;
    author: string;
    url: string;
    sourceBranch: string;
    targetBranch: string;
    baseRef: string;
    headSha: string;
  };
  diff: string;
  story: StoryContext | null;
  existingComments: ExistingCommentContext[];
}

export interface RulePreFlightContext extends ReviewPreFlightContext {
  rule?: {
    id: string;
    name: string;
    category: string;
    instructions: string;
  };
  interCommitDiff?: string;
  previousFindings?: Array<{
    id: string;
    ruleId: string;
    path: string;
    line?: number;
    title: string;
    body: string;
  }>;
}


/**
 * PR 本文から関連する Issue / Story の参照を抽出する
 * 例: "#123", "org/repo#123", "https://github.com/org/repo/issues/123"
 */
export function extractIssueReferences(
  prBody: string,
  defaultRepo: string
): Array<{ owner: string; repo: string; number: number; url: string }> {
  const refs: Array<{ owner: string; repo: string; number: number; url: string }> = [];
  const seen = new Set<string>();

  const [defaultOwner, defaultRepoName] = defaultRepo.split("/");

  // 1. フル URL パターン: https://github.com/owner/repo/issues/123
  const urlRegex = /https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(prBody)) !== null) {
    const owner = match[1];
    const repo = match[2];
    const number = parseInt(match[3], 10);
    const key = `${owner}/${repo}#${number}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ owner, repo, number, url: match[0] });
    }
  }

  // 2. クロスリポジトリ参照パターン: owner/repo#123
  const crossRegex = /(?:^|\s)([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)#(\d+)/g;
  while ((match = crossRegex.exec(prBody)) !== null) {
    const owner = match[1];
    const repo = match[2];
    const number = parseInt(match[3], 10);
    const key = `${owner}/${repo}#${number}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({
        owner,
        repo,
        number,
        url: `https://github.com/${owner}/${repo}/issues/${number}`,
      });
    }
  }

  // 3. 単純短縮パターン: #123 (Closes #123, Refs #123 等)
  if (defaultOwner && defaultRepoName) {
    const shortRegex = /(?:^|\s)#(\d+)/g;
    while ((match = shortRegex.exec(prBody)) !== null) {
      const number = parseInt(match[1], 10);
      const key = `${defaultOwner}/${defaultRepoName}#${number}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({
          owner: defaultOwner,
          repo: defaultRepoName,
          number,
          url: `https://github.com/${defaultOwner}/${defaultRepoName}/issues/${number}`,
        });
      }
    }
  }

  return refs;
}

export interface CollectPreFlightOptions {
  baseRef?: string;
}

/**
 * GitHub CLI を通じて Pre-flight コンテキストを収集する
 */
export async function collectPreFlightContext(
  repository: string,
  prNumber: number,
  options?: CollectPreFlightOptions
): Promise<ReviewPreFlightContext> {
  // 1. PR 詳細情報と本文の取得
  const prViewCmd = new Deno.Command("gh", {
    args: [
      "pr",
      "view",
      prNumber.toString(),
      "--repo",
      repository,
      "--json",
      "number,title,body,author,url,headRefName,baseRefName,headRefOid",
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const prViewOutput = await prViewCmd.output();
  if (!prViewOutput.success) {
    const err = new TextDecoder().decode(prViewOutput.stderr);
    throw new Error(`Failed to view PR ${repository}#${prNumber}: ${err}`);
  }
  const prData = JSON.parse(new TextDecoder().decode(prViewOutput.stdout));

  // 2. PR Diff の取得
  const diffCmd = new Deno.Command("gh", {
    args: ["pr", "diff", prNumber.toString(), "--repo", repository],
    stdout: "piped",
    stderr: "piped",
  });
  const diffOutput = await diffCmd.output();
  if (!diffOutput.success) {
    const err = new TextDecoder().decode(diffOutput.stderr);
    throw new Error(`Failed to get diff for PR ${repository}#${prNumber}: ${err}`);
  }
  const diffText = new TextDecoder().decode(diffOutput.stdout);

  // 3. 関連 Story / Issue の取得
  const issueRefs = extractIssueReferences(prData.body || "", repository);
  let story: StoryContext | null = null;
  if (issueRefs.length > 0) {
    const primaryRef = issueRefs[0];
    try {
      const issueCmd = new Deno.Command("gh", {
        args: [
          "issue",
          "view",
          primaryRef.number.toString(),
          "--repo",
          `${primaryRef.owner}/${primaryRef.repo}`,
          "--json",
          "number,title,body,url",
        ],
        stdout: "piped",
        stderr: "piped",
      });
      const issueOutput = await issueCmd.output();
      if (issueOutput.success) {
        const issueData = JSON.parse(new TextDecoder().decode(issueOutput.stdout));
        story = {
          number: issueData.number,
          url: issueData.url,
          title: issueData.title,
          body: issueData.body || "",
        };
      }
    } catch {
      // Story 取得失敗時は null のまま継続（任意要素のため）
    }
  }

  // 4. 既存コメント一覧の取得 (PR レビューコメント + Issue コメント)
  const existingComments: ExistingCommentContext[] = [];
  try {
    const commentsCmd = new Deno.Command("gh", {
      args: [
        "api",
        `repos/${repository}/pulls/${prNumber}/comments`,
        "--jq",
        '.[] | {id: .id, author: .user.login, body: .body, path: .path, line: .line, createdAt: .created_at}',
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const commentsOutput = await commentsCmd.output();
    if (commentsOutput.success) {
      const outputText = new TextDecoder().decode(commentsOutput.stdout).trim();
      if (outputText.length > 0) {
        // ndjson 形式または json 配列をパース
        const lines = outputText.split("\n");
        for (const line of lines) {
          try {
            existingComments.push(JSON.parse(line));
          } catch {
            // ignore parse error for single line
          }
        }
      }
    }
  } catch {
    // 取得失敗時は空配列で継続
  }

  const baseRef = prData.baseRefName || options?.baseRef || "";

  return {
    pr: {
      repository,
      number: prNumber,
      title: prData.title,
      body: prData.body || "",
      author: prData.author.login,
      url: prData.url,
      sourceBranch: prData.headRefName,
      targetBranch: baseRef,
      baseRef,
      headSha: prData.headRefOid,
    },
    diff: diffText,
    story,
    existingComments,
  };
}
