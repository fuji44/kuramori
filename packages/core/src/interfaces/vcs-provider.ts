import type { ReviewRequest } from '../types/review.ts';

export interface ListReviewRequestsOptions {
  includeDrafts?: boolean;
}

export interface VCSProvider {
  readonly name: string;
  listReviewRequests(options?: ListReviewRequestsOptions): Promise<ReviewRequest[]>;
  getReviewRequest(repository: string, number: number): Promise<ReviewRequest | null>;
  getDiff(repository: string, number: number): Promise<string>;
  getCloneUrl(repository: string): Promise<string>;
}
