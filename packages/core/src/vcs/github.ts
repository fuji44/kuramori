import type { ListReviewRequestsOptions, VCSProvider } from '../interfaces/vcs-provider.ts';
import type { ReviewRequest } from '../types/review.ts';

interface GhSearchPrItem {
  id: string;
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
}

interface GhPrViewDetails {
  headRefName: string;
  baseRefName: string;
  headRefOid: string;
}

export class GitHubProvider implements VCSProvider {
  readonly name = 'github';
  private readonly defaultUserId: string;

  constructor(defaultUserId: string = 'default') {
    this.defaultUserId = defaultUserId;
  }

  private async executeGhSearch(queryArgs: string[]): Promise<GhSearchPrItem[]> {
    const cmd = new Deno.Command('gh', {
      args: [
        'search',
        'prs',
        ...queryArgs,
        '--state=open',
        '--json',
        'number,title,author,url,repository,isDraft,createdAt,updatedAt',
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

  async listReviewRequests(options?: ListReviewRequestsOptions): Promise<ReviewRequest[]> {
    const [reviewRequestedItems, authoredItems] = await Promise.all([
      this.executeGhSearch(['--review-requested=@me']),
      this.executeGhSearch(['--author=@me']),
    ]);

    const itemMap = new Map<string, GhSearchPrItem>();
    for (const item of reviewRequestedItems) {
      itemMap.set(`${item.repository.nameWithOwner}#${item.number}`, item);
    }
    for (const item of authoredItems) {
      itemMap.set(`${item.repository.nameWithOwner}#${item.number}`, item);
    }

    const requests: ReviewRequest[] = [];
    for (const item of itemMap.values()) {
      if (options?.includeDrafts === false && item.isDraft) {
        continue;
      }

      requests.push({
        id: `github:${item.repository.nameWithOwner}#${item.number}`,
        userId: this.defaultUserId,
        provider: this.name,
        repository: item.repository.nameWithOwner,
        number: item.number,
        title: item.title,
        author: item.author.login,
        url: item.url,
        sourceBranch: '',
        targetBranch: '',
        headSha: '',
        isDraft: item.isDraft,
        state: 'open',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
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
        'number,title,author,url,isDraft,createdAt,updatedAt,headRefName,baseRefName,headRefOid',
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const output = await cmd.output();
    if (!output.success) {
      return null;
    }

    const data = JSON.parse(new TextDecoder().decode(output.stdout));
    return {
      id: `github:${repository}#${number}`,
      userId: this.defaultUserId,
      provider: this.name,
      repository,
      number,
      title: data.title,
      author: data.author.login,
      url: data.url,
      sourceBranch: data.headRefName,
      targetBranch: data.baseRefName,
      headSha: data.headRefOid,
      isDraft: data.isDraft,
      state: 'open',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
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
      throw new Error(`Failed to get diff for ${repository}#${number}: ${errorText}`);
    }

    return new TextDecoder().decode(output.stdout);
  }

  async getCloneUrl(repository: string): Promise<string> {
    return `https://github.com/${repository}.git`;
  }
}
