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

export const reviewRulesTable = sqliteTable('review_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('general'),
  engine: text('engine').notNull().default('default'),
  instructions: text('instructions').notNull(),
  triggerJson: text('trigger_json').notNull().default('{}'),
  concurrencyJson: text('concurrency_json'),
  engineOverrideJson: text('engine_override_json'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const reviewTriggersTable = sqliteTable('review_triggers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  repository: text('repository').notNull(),
  pathsJson: text('paths_json'),
  pathsIgnoreJson: text('paths_ignore_json'),
  ruleIdsJson: text('rule_ids_json').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
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
  ruleId: text('rule_id').references(() => reviewRulesTable.id),
  ruleName: text('rule_name'),
  ruleCategory: text('rule_category'),
  headSha: text('head_sha'),
});

export const reviewRuleResultsTable = sqliteTable('review_rule_results', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => reviewJobsTable.id),
  requestId: text('request_id').notNull().references(() => reviewRequestsTable.id),
  ruleId: text('rule_id').notNull().references(() => reviewRulesTable.id),
  ruleName: text('rule_name').notNull(),
  category: text('category').notNull(),
  headSha: text('head_sha').notNull(),
  verdict: text('verdict').notNull(),
  summary: text('summary').notNull(),
  findings: text('findings').notNull(),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
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
