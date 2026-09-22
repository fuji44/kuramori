export interface ReviewItem {
  id: string;
  provider: string;
  repository: string;
  number: number;
  title: string;
  author: string;
  url: string;
  sourceBranch: string;
  targetBranch: string;
  headSha: string;
  isDraft: boolean;
  isOwn?: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  labels?: Array<{ name: string; color?: string; description?: string }>;
  milestone?: string | null;
  assignees?: Array<{ login: string; avatarUrl?: string }>;
  latestJob: {
    id: string;
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
    engine?: string;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
  } | null;
  report: {
    id: string;
    summary: string | null;
    verdict: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES' | null;
    createdAt: string;
  } | null;
}

export interface AppSettings {
  autoQueue: boolean;
  autoQueueIncludeOwn: boolean;
  reviewEngine: 'antigravity' | 'claude-code' | 'mock';
  agyBin: string;
  claudeBin: string;
}
