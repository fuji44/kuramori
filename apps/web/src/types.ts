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
  additions?: number | null;
  deletions?: number | null;
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
  customEnv?: EngineEnvironment;
}

export interface EngineEnvironmentVariable {
  value: string;
  secret: boolean;
  configured?: boolean;
}

export type EngineEnvironment = Record<string, string | EngineEnvironmentVariable>;

export interface AntigravityEngineConfig extends BaseCliEngineConfig {
  printTimeout: string;
  sandbox: boolean;
  disableSlashCommands: boolean;
}

export interface ClaudeCodeEngineConfig extends BaseCliEngineConfig {
  allowedTools?: string;
  bare: boolean;
  maxTurns?: number;
}

export type CodexSandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

export interface CodexEngineConfig extends BaseCliEngineConfig {
  sandboxMode: CodexSandboxMode;
  ephemeral: boolean;
}

export interface MockEngineConfig {
  delayMs: number;
}

export interface EngineSettingsMap {
  antigravity: AntigravityEngineConfig;
  claudeCode: ClaudeCodeEngineConfig;
  codex: CodexEngineConfig;
  mock: MockEngineConfig;
}

export type EngineType = 'claude-code' | 'antigravity' | 'codex' | 'mock';

export interface BaseEngineProfileMeta {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClaudeCodeEngineProfile extends BaseEngineProfileMeta {
  engineType: 'claude-code';
  config: ClaudeCodeEngineConfig;
}

export interface AntigravityEngineProfile extends BaseEngineProfileMeta {
  engineType: 'antigravity';
  config: AntigravityEngineConfig;
}

export interface MockEngineProfile extends BaseEngineProfileMeta {
  engineType: 'mock';
  config: MockEngineConfig;
}

export interface CodexEngineProfile extends BaseEngineProfileMeta {
  engineType: 'codex';
  config: CodexEngineConfig;
}

export type EngineProfile =
  | ClaudeCodeEngineProfile
  | AntigravityEngineProfile
  | CodexEngineProfile
  | MockEngineProfile;

export type EngineOverrideConfig = Partial<AntigravityEngineConfig & ClaudeCodeEngineConfig & CodexEngineConfig & MockEngineConfig>;

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
  engineProfileId?: string;
  instructions: string;
  engineOverride?: EngineOverrideConfig;
  trigger?: RuleTrigger;
  concurrency?: RuleConcurrency;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function resolveRuleEngineProfile(
  ruleEngine?: string | null,
  profiles?: EngineProfile[],
  defaultProfileId?: string,
): EngineProfile | undefined {
  if (!profiles || profiles.length === 0) {
    return undefined;
  }
  const defaultProfile = profiles.find((p) => p.id === defaultProfileId)
    ?? profiles.find((p) => p.isDefault)
    ?? profiles[0];

  if (!ruleEngine || ruleEngine === 'default') {
    return defaultProfile;
  }

  const exact = profiles.find((p) => p.id === ruleEngine);
  if (exact) {
    return exact;
  }

  const byType = profiles.find((p) => p.engineType === ruleEngine);
  if (byType) {
    return byType;
  }

  return defaultProfile;
}

export interface AppSettings {
  autoQueue: boolean;
  autoQueueIncludeOwn: boolean;
  reviewEngine: 'antigravity' | 'claude-code' | 'codex' | 'mock';
  agyBin: string;
  claudeBin: string;
  defaultRuleIds: string[];
  defaultRuleId?: string;
  defaultBackendId: string;
  defaultEngineProfileId?: string;
  enabledEngines?: string[];
  globalMaxConcurrency: number;
  backendMaxConcurrency: {
    antigravity: number;
    claudeCode: number;
    codex: number;
    mock: number;
  };
  engineSettings: EngineSettingsMap;
  engineProfiles?: EngineProfile[];
}
