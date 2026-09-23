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
    ruleId?: string | null;
    ruleName?: string | null;
    ruleCategory?: string | null;
  } | null;
  report: {
    id: string;
    summary: string | null;
    verdict: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES' | null;
    createdAt: string;
  } | null;
}

export interface RuleTrigger {
  types?: Array<'opened' | 'synchronize' | 'reopened' | 'ready_for_review'>;
  paths?: string[];
  pathsIgnore?: string[];
  draft?: boolean;
  labels?: string[];
}

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
}

export interface MockEngineConfig {
  delayMs: number;
}

export interface EngineSettingsMap {
  antigravity: AntigravityEngineConfig;
  claudeCode: ClaudeCodeEngineConfig;
  mock: MockEngineConfig;
}

export type EngineOverrideConfig = Partial<AntigravityEngineConfig & ClaudeCodeEngineConfig & MockEngineConfig>;

export interface ReviewTrigger {
  id: string;
  name: string;
  repository: string;
  paths?: string[];
  pathsIgnore?: string[];
  ruleIds: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface AppSettings {
  autoQueue: boolean;
  autoQueueIncludeOwn: boolean;
  reviewEngine: 'antigravity' | 'claude-code' | 'mock';
  agyBin: string;
  claudeBin: string;
  defaultRuleIds: string[];
  defaultRuleId?: string;
  defaultBackendId: string;
  enabledEngines?: string[];
  globalMaxConcurrency: number;
  backendMaxConcurrency: {
    antigravity: number;
    claudeCode: number;
    mock: number;
  };
  engineSettings: EngineSettingsMap;
}

