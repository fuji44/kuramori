import type { ListReviewRequestsOptions, VCSProvider } from '../interfaces/vcs-provider.ts';
import type { ReviewRequest, ReviewLabel } from '../types/review.ts';

interface GhSearchPrItem {
  id?: string;
  number: number;
  title: string;
  isDraft: boolean;
  url: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
  };
  repository: {
    nameWithOwner: string;
  };
  labels?: Array<{ name: string; color?: string; description?: string }>;
  milestone?: { title: string } | null;
  assignees?: Array<{ login: string; avatarUrl?: string }>;
  headRefName?: string;
  baseRefName?: string;
  headRefOid?: string;
  additions?: number;
  deletions?: number;
  state?: string;
}

export class GitHubProvider implements VCSProvider {
  readonly name = 'github';
  private readonly defaultUserId: string;

  constructor(defaultUserId: string = 'default') {
    this.defaultUserId = defaultUserId;
  }

  private async executeGraphQLSearch(query: string): Promise<GhSearchPrItem[]> {
    const gql = `
      query($searchQuery: String!) {
        search(query: $searchQuery, type: ISSUE, first: 50) {
          nodes {
            ... on PullRequest {
              number
              title
              url
              isDraft
              state
              createdAt
              updatedAt
              author { login }
              repository { nameWithOwner }
              milestone { title }
              labels(first: 20) {
                nodes { name color description }
              }
              assignees(first: 5) {
                nodes { login avatarUrl }
              }
              headRefName
              baseRefName
              headRefOid
              additions
              deletions
            }
          }
        }
      }
    `;

    const cmd = new Deno.Command('gh', {
      args: ['api', 'graphql', '-f', `query=${gql}`, '-F', `searchQuery=${query}`],
      stdout: 'piped',
      stderr: 'piped',
    });

    const output = await cmd.output();
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr);
      throw new Error(`GraphQL search failed: ${errorText}`);
    }

    const json = JSON.parse(new TextDecoder().decode(output.stdout));
    const nodes = json?.data?.search?.nodes || [];

    return nodes.map((node: any) => ({
      number: node.number,
      title: node.title,
      url: node.url,
      isDraft: Boolean(node.isDraft),
      state: (node.state || 'OPEN').toLowerCase(),
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      author: { login: node.author?.login || 'unknown' },
      repository: { nameWithOwner: node.repository?.nameWithOwner || '' },
      milestone: node.milestone ? { title: node.milestone.title } : null,
      labels: (node.labels?.nodes || []).map((l: any) => ({
        name: l.name,
        color: l.color,
        description: l.description,
      })),
      assignees: (node.assignees?.nodes || []).map((a: any) => ({
        login: a.login,
        avatarUrl: a.avatarUrl,
      })),
      headRefName: node.headRefName || '',
      baseRefName: node.baseRefName || '',
      headRefOid: node.headRefOid || '',
      additions: node.additions,
      deletions: node.deletions,
    }));
  }

  private async executeGhSearch(queryArgs: string[]): Promise<GhSearchPrItem[]> {
    const cmd = new Deno.Command('gh', {
      args: [
        'search',
        'prs',
        ...queryArgs,
        '--state=open',
        '--json',
        'number,title,author,url,repository,isDraft,createdAt,updatedAt,labels',
        '--limit',
        '50',
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const output = await cmd.output();
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr);
      throw new Error(`Failed to list review requests: ${errorText}`);
    }

    return JSON.parse(new TextDecoder().decode(output.stdout));
  }

  private cachedCurrentUser: string | null = null;

  async getCurrentUser(): Promise<string | null> {
    if (this.cachedCurrentUser !== null) {
      return this.cachedCurrentUser;
    }
    try {
      const cmd = new Deno.Command('gh', {
        args: ['api', 'user', '--jq', '.login'],
        stdout: 'piped',
        stderr: 'piped',
      });
      const output = await cmd.output();
      if (output.success) {
        this.cachedCurrentUser = new TextDecoder().decode(output.stdout).trim();
        return this.cachedCurrentUser;
      }
    } catch {
      // Ignore failure to fetch current user
    }
    return null;
  }

  async listReviewRequests(options?: ListReviewRequestsOptions): Promise<ReviewRequest[]> {
    let reviewRequestedItems: GhSearchPrItem[] = [];
    let authoredItems: GhSearchPrItem[] = [];

    // GraphQL による一括取得（タグ・マイルストーン・ブランチ名を含む）
    try {
      [reviewRequestedItems, authoredItems] = await Promise.all([
        this.executeGraphQLSearch('type:pr state:open review-requested:@me'),
        this.executeGraphQLSearch('type:pr state:open author:@me'),
      ]);
    } catch {
      // フォールバック: gh search prs
      [reviewRequestedItems, authoredItems] = await Promise.all([
        this.executeGhSearch(['--review-requested=@me']),
        this.executeGhSearch(['--author=@me']),
      ]);
    }

    const authoredKeySet = new Set<string>();
    for (const item of authoredItems) {
      if (item.repository?.nameWithOwner) {
        authoredKeySet.add(`${item.repository.nameWithOwner}#${item.number}`);
      }
    }

    const itemMap = new Map<string, GhSearchPrItem>();
    for (const item of reviewRequestedItems) {
      if (item.repository?.nameWithOwner) {
        itemMap.set(`${item.repository.nameWithOwner}#${item.number}`, item);
      }
    }
    for (const item of authoredItems) {
      if (item.repository?.nameWithOwner) {
        itemMap.set(`${item.repository.nameWithOwner}#${item.number}`, item);
      }
    }

    const requests: ReviewRequest[] = [];
    for (const item of itemMap.values()) {
      if (options?.includeDrafts === false && item.isDraft) {
        continue;
      }

      const key = `${item.repository.nameWithOwner}#${item.number}`;
      const isOwn = authoredKeySet.has(key);

      const labels: ReviewLabel[] = (item.labels || []).map((l) => ({
        name: l.name,
        color: l.color,
        description: l.description,
      }));

      requests.push({
        id: `github:${item.repository.nameWithOwner}#${item.number}`,
        userId: this.defaultUserId,
        provider: this.name,
        repository: item.repository.nameWithOwner,
        number: item.number,
        title: item.title,
        author: item.author.login,
        url: item.url,
        sourceBranch: item.headRefName || '',
        targetBranch: item.baseRefName || '',
        headSha: item.headRefOid || '',
        additions: item.additions,
        deletions: item.deletions,
        isDraft: item.isDraft,
        isOwn,
        state: (item.state || 'open').toLowerCase() as ReviewRequest['state'],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        labels: labels.length > 0 ? labels : undefined,
        milestone: item.milestone?.title || null,
        assignees: item.assignees && item.assignees.length > 0 ? item.assignees : undefined,
      });
    }

    return requests;
  }

  async getReviewRequest(repository: string, number: number): Promise<ReviewRequest | null> {
    const cmd = new Deno.Command('gh', {
      args: [
        'pr',
        'view',
        number.toString(),
        '--repo',
        repository,
        '--json',
        'number,title,author,url,isDraft,state,createdAt,updatedAt,headRefName,baseRefName,headRefOid,additions,deletions,labels,milestone,assignees',
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const output = await cmd.output();
    if (!output.success) {
      return null;
    }

    const data = JSON.parse(new TextDecoder().decode(output.stdout));
    const currentUser = await this.getCurrentUser();
    const isOwn = currentUser !== null ? currentUser === data.author.login : false;

    const labels: ReviewLabel[] = (data.labels || []).map((l: any) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    }));

    const assignees = (data.assignees || []).map((a: any) => ({
      login: a.login,
      avatarUrl: a.avatarUrl,
    }));

    return {
      id: `github:${repository}#${number}`,
      userId: this.defaultUserId,
      provider: this.name,
      repository,
      number,
      title: data.title,
      author: data.author.login,
      url: data.url,
      sourceBranch: data.headRefName || '',
      targetBranch: data.baseRefName || '',
      headSha: data.headRefOid || '',
      additions: data.additions,
      deletions: data.deletions,
      isDraft: data.isDraft,
      isOwn,
      state: (data.state || 'OPEN').toLowerCase() as ReviewRequest['state'],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      labels: labels.length > 0 ? labels : undefined,
      milestone: data.milestone?.title || null,
      assignees: assignees.length > 0 ? assignees : undefined,
    };
  }

  async getDiff(repository: string, number: number): Promise<string> {
    const cmd = new Deno.Command('gh', {
      args: ['pr', 'diff', number.toString(), '--repo', repository],
      stdout: 'piped',
      stderr: 'piped',
    });

    const output = await cmd.output();
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr);
      throw new Error(`Failed to fetch diff: ${errorText}`);
    }

    return new TextDecoder().decode(output.stdout);
  }

  async getCloneUrl(repository: string): Promise<string> {
    return `https://github.com/${repository}.git`;
  }
}
