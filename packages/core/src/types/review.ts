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
  ruleId?: string;
  ruleName?: string;
  ruleCategory?: string;
  headSha?: string;
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

/**
 * ルール起動のトリガー条件（後方互換用）
 */
export interface RuleTrigger {
  types?: Array<'opened' | 'synchronize' | 'reopened' | 'ready_for_review'>;
  paths?: string[];
  pathsIgnore?: string[];
  draft?: boolean;
  labels?: string[];
}

/**
 * レビュートリガー定義（リポジトリ・変更パスと発動ルールのバインディング）
 */
export interface ReviewTrigger {
  id: string;
  name: string;
  repository: string; // 例: "fuji44/review-base" または "*" (全リポジトリ)
  paths?: string[]; // 対象ファイルパス (Glob)
  pathsIgnore?: string[]; // 除外ファイルパス (Glob)
  ruleIds: string[]; // 発動させるルール ID のリスト
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ルール並行実行制御
 */
export interface RuleConcurrency {
  group?: string;
  cancelInProgress?: boolean;
}

/**
 * 全 AI CLI エンジン共通の基底設定
 */
export interface BaseCliEngineConfig {
  binPath: string;
  model: string;
  effort: string;
  timeoutSeconds: number;
  systemPrompt?: string;
  inputFormat?: 'text' | 'stream-json';
  outputFormat?: 'text' | 'json' | 'stream-json';
  jsonSchema?: string;
  customArgs?: string;
}

export interface AntigravityEngineConfig extends BaseCliEngineConfig {
  printTimeout: string;
  sandbox: boolean;
  disableSlashCommands: boolean;
}

export interface ClaudeCodeEngineConfig extends BaseCliEngineConfig {
  allowedTools?: string;
  bare: boolean;
  apiBaseUrl?: string;
  authToken?: string;
  customEnv?: Record<string, string>;
  maxTurns?: number;
}

export interface MockEngineConfig {
  delayMs: number;
}

export interface EngineSettingsMap {
  antigravity: AntigravityEngineConfig;
  claudeCode: ClaudeCodeEngineConfig;
  mock: MockEngineConfig;
}

/**
 * ルール単位での包括的オーバーライド設定
 */
export type EngineOverrideConfig = Partial<AntigravityEngineConfig & ClaudeCodeEngineConfig & MockEngineConfig>;

/**
 * 包括的設定リゾルバ
 */
export function resolveEngineConfig<T extends object>(
  baseConfig: T,
  override?: Record<string, unknown> | null
): T {
  if (!override) {
    return { ...baseConfig };
  }

  const result = { ...baseConfig } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * レビュールール定義
 */
export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  category: string;
  engine: string;
  instructions: string;
  engineOverride?: EngineOverrideConfig;
  trigger?: RuleTrigger;
  concurrency?: RuleConcurrency;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleResultVerdict = 'PASS' | 'WARN' | 'FAIL';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingStatus = 'NEW' | 'PERSISTING' | 'RESOLVED';

/**
 * ルール実行時の個別指摘
 */
export interface RuleResultFinding {
  id: string;
  ruleId: string;
  category: string;
  title: string;
  path: string;
  line?: number;
  severity: FindingSeverity;
  status: FindingStatus;
  body: string;
  suggestion?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 1ルールあたりの実行結果
 */
export interface RuleResult {
  id?: string;
  jobId?: string;
  requestId?: string;
  ruleId: string;
  ruleName: string;
  category: string;
  headSha: string;
  verdict: RuleResultVerdict;
  summary: string;
  findings: RuleResultFinding[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * 汎用 AI Agent 設定
 */
export interface AgentBackendConfig<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  binaryPath: string;
  maxConcurrency: number;
  timeoutMs: number;
  options?: TOptions;
}

export interface AntigravityOptions {
  model?: string;
  effort?: string;
  timeoutSeconds?: number;
  printTimeout?: string;
  sandbox?: boolean;
  disableSlashCommands?: boolean;
  inputFormat?: 'text' | 'stream-json';
  outputFormat?: 'text' | 'json' | 'stream-json';
  jsonSchema?: string;
  customArgs?: string;
}

export interface ClaudeCodeOptions {
  model?: string;
  effort?: string;
  timeoutSeconds?: number;
  allowedTools?: string;
  bare?: boolean;
  inputFormat?: 'text' | 'stream-json';
  outputFormat?: 'text' | 'json' | 'stream-json';
  jsonSchema?: string;
  customArgs?: string;
  apiBaseUrl?: string;
  authToken?: string;
  customEnv?: Record<string, string>;
  maxTurns?: number;
}

export interface MockEngineOptions {
  delayMs?: number;
}

/**
 * システム全体設定
 */
export interface SystemAppSettings {
  defaultRuleIds: string[];
  defaultRuleId?: string;
  defaultBackendId: string;
  globalMaxConcurrency: number;
  backends: {
    antigravity: AgentBackendConfig<AntigravityOptions>;
    claudeCode: AgentBackendConfig<ClaudeCodeOptions>;
    mock: AgentBackendConfig<MockEngineOptions>;
  };
}

