import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const reviewRequestsTable = sqliteTable('review_requests', {
  id: text('id').primaryKey(), // provider:repository#number
  userId: text('user_id').notNull().default('default'),
  provider: text('provider').notNull().default('github'),
  repository: text('repository').notNull(),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  url: text('url').notNull(),
  sourceBranch: text('source_branch').notNull().default(''),
  targetBranch: text('target_branch').notNull().default(''),
  headSha: text('head_sha').notNull().default(''),
  isDraft: integer('is_draft', { mode: 'boolean' }).notNull().default(false),
  isOwn: integer('is_own', { mode: 'boolean' }).notNull().default(false),
  state: text('state').notNull().default('open'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  labels: text('labels'), // JSON string: [{ name: string, color?: string }]
  milestone: text('milestone'),
  assignees: text('assignees'), // JSON string: [{ login: string, avatarUrl?: string }]
});

export const reviewJobsTable = sqliteTable('review_jobs', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull().references(() => reviewRequestsTable.id),
  userId: text('user_id').notNull().default('default'),
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed'
  engine: text('engine').notNull().default('claude-code'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  error: text('error'),
  reportId: text('report_id'),
});

export const reviewReportsTable = sqliteTable('review_reports', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => reviewJobsTable.id),
  requestId: text('request_id').notNull().references(() => reviewRequestsTable.id),
  userId: text('user_id').notNull().default('default'),
  summary: text('summary'),
  verdict: text('verdict'), // 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'
  createdAt: text('created_at').notNull(),
});

export const appSettingsTable = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});
