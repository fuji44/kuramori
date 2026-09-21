export type ReviewRequestState = 'open' | 'closed' | 'merged';

export interface ReviewLabel {
  name: string;
  color?: string;
  description?: string;
}

export interface ReviewAssignee {
  login: string;
  avatarUrl?: string;
}

export interface ReviewRequest {
  id: string;
  userId: string;
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
  state: ReviewRequestState;
  createdAt: string;
  updatedAt: string;
  labels?: ReviewLabel[];
  milestone?: string | null;
  assignees?: ReviewAssignee[];
}

export type ReviewJobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed';

export interface ReviewJob {
  id: string;
  requestId: string;
  userId: string;
  status: ReviewJobStatus;
  engine: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  reportId?: string;
}

export type ReviewVerdict = 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES';

export interface ReviewReport {
  id: string;
  jobId: string;
  requestId: string;
  userId: string;
  summary?: string;
  verdict?: ReviewVerdict;
  createdAt: string;
}
