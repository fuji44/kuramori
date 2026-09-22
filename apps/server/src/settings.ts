import { eq } from 'drizzle-orm';
import type { AppDatabase } from './db/index.ts';
import { appSettingsTable } from './db/schema.ts';
import type {
  AntigravityEngineConfig,
  ClaudeCodeEngineConfig,
  MockEngineConfig,
  EngineSettingsMap,
} from '@review-base/core';

export type {
  BaseCliEngineConfig,
  AntigravityEngineConfig,
  ClaudeCodeEngineConfig,
  MockEngineConfig,
  EngineSettingsMap,
  EngineOverrideConfig,
} from '@review-base/core';

export interface AppSettings {
  autoQueue: boolean;
  autoQueueIncludeOwn: boolean;
  reviewEngine: 'antigravity' | 'claude-code' | 'mock';
  agyBin: string;
  claudeBin: string;
  defaultRuleIds: string[];
  defaultRuleId?: string;
  defaultBackendId: string;
  globalMaxConcurrency: number;
  backendMaxConcurrency: {
    antigravity: number;
    claudeCode: number;
    mock: number;
  };
  engineSettings: EngineSettingsMap;
}

export class SettingsService {
  private readonly db: AppDatabase;
  private readonly defaultAutoQueue: boolean;
  private readonly defaultAutoQueueIncludeOwn: boolean;
  private readonly defaultReviewEngine: 'antigravity' | 'claude-code' | 'mock';
  private readonly defaultAgyBin: string;
  private readonly defaultClaudeBin: string;
  private readonly defaultRuleIds: string[];
  private readonly defaultBackendId: string;
  private readonly defaultGlobalMaxConcurrency: number;
  private readonly defaultBackendMaxConcurrency: {
    antigravity: number;
    claudeCode: number;
    mock: number;
  };
  private readonly defaultEngineSettings: EngineSettingsMap;

  constructor(db: AppDatabase, defaultAutoQueue?: boolean, defaultAutoQueueIncludeOwn?: boolean) {
    this.db = db;
    if (defaultAutoQueue !== undefined) {
      this.defaultAutoQueue = defaultAutoQueue;
    } else {
      const envVal = Deno.env.get('AUTO_QUEUE');
      this.defaultAutoQueue = envVal === 'true' || envVal === '1';
    }

    if (defaultAutoQueueIncludeOwn !== undefined) {
      this.defaultAutoQueueIncludeOwn = defaultAutoQueueIncludeOwn;
    } else {
      const envVal = Deno.env.get('AUTO_QUEUE_INCLUDE_OWN');
      this.defaultAutoQueueIncludeOwn = envVal === 'true' || envVal === '1';
    }

    const envEngine = Deno.env.get('REVIEW_ENGINE');
    if (envEngine === 'claude-code' || envEngine === 'mock' || envEngine === 'antigravity') {
      this.defaultReviewEngine = envEngine;
    } else {
      this.defaultReviewEngine = 'antigravity';
    }

    this.defaultAgyBin = Deno.env.get('AGY_BIN') ?? 'agy';
    this.defaultClaudeBin = Deno.env.get('CLAUDE_BIN') ?? 'claude';
    this.defaultRuleIds = ['preset-correctness'];
    this.defaultBackendId = 'antigravity';
    this.defaultGlobalMaxConcurrency = 2;
    this.defaultBackendMaxConcurrency = {
      antigravity: 2,
      claudeCode: 1,
      mock: 5,
    };
    this.defaultEngineSettings = {
      antigravity: {
        binPath: this.defaultAgyBin,
        model: 'gemini-3.1-pro',
        effort: 'high',
        timeoutSeconds: 900,
        systemPrompt: '',
        printTimeout: '',
        sandbox: false,
        disableSlashCommands: false,
        inputFormat: 'text',
        outputFormat: 'text',
        jsonSchema: '',
        customArgs: '',
      },
      claudeCode: {
        binPath: this.defaultClaudeBin,
        model: 'sonnet',
        effort: 'high',
        timeoutSeconds: 900,
        systemPrompt: '',
        allowedTools: '',
        bare: false,
        inputFormat: 'text',
        outputFormat: 'text',
        jsonSchema: '',
        customArgs: '',
      },
      mock: {
        delayMs: 500,
      },
    };
  }

  async getAllSettings(): Promise<AppSettings> {
    const records = await this.db.select().from(appSettingsTable);
    const map = new Map<string, string>();
    for (const r of records) {
      map.set(r.key, r.value);
    }

    const autoQueueVal = map.get('auto_queue');
    const autoQueue = autoQueueVal !== undefined
      ? autoQueueVal === 'true' || autoQueueVal === '1'
      : this.defaultAutoQueue;

    const autoQueueIncludeOwnVal = map.get('auto_queue_include_own');
    const autoQueueIncludeOwn = autoQueueIncludeOwnVal !== undefined
      ? autoQueueIncludeOwnVal === 'true' || autoQueueIncludeOwnVal === '1'
      : this.defaultAutoQueueIncludeOwn;

    const engineVal = map.get('review_engine');
    const reviewEngine = (engineVal === 'claude-code' || engineVal === 'mock' || engineVal === 'antigravity')
      ? engineVal
      : this.defaultReviewEngine;

    const agyBin = map.get('agy_bin') ?? this.defaultAgyBin;
    const claudeBin = map.get('claude_bin') ?? this.defaultClaudeBin;
    const legacyRuleId = map.get('default_rule_id') ?? 'preset-correctness';

    let defaultRuleIds = this.defaultRuleIds;
    const defaultRuleIdsVal = map.get('default_rule_ids');
    if (defaultRuleIdsVal !== undefined) {
      try {
        const parsed = JSON.parse(defaultRuleIdsVal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          defaultRuleIds = parsed;
        }
      } catch {
        defaultRuleIds = [legacyRuleId];
      }
    } else if (map.has('default_rule_id')) {
      defaultRuleIds = [legacyRuleId];
    }

    const defaultBackendId = map.get('default_backend_id') ?? this.defaultBackendId;

    const globalMaxConcurrencyVal = map.get('global_max_concurrency');
    const parsedGlobal = globalMaxConcurrencyVal !== undefined ? Number.parseInt(globalMaxConcurrencyVal, 10) : NaN;
    const globalMaxConcurrency = !Number.isNaN(parsedGlobal) && parsedGlobal > 0
      ? parsedGlobal
      : this.defaultGlobalMaxConcurrency;

    let backendMaxConcurrency = this.defaultBackendMaxConcurrency;
    const backendMaxConcurrencyVal = map.get('backend_max_concurrency');
    if (backendMaxConcurrencyVal !== undefined) {
      try {
        const parsed = JSON.parse(backendMaxConcurrencyVal);
        if (typeof parsed === 'object' && parsed !== null) {
          backendMaxConcurrency = {
            antigravity: typeof parsed.antigravity === 'number' ? parsed.antigravity : this.defaultBackendMaxConcurrency.antigravity,
            claudeCode: typeof parsed.claudeCode === 'number' ? parsed.claudeCode : this.defaultBackendMaxConcurrency.claudeCode,
            mock: typeof parsed.mock === 'number' ? parsed.mock : this.defaultBackendMaxConcurrency.mock,
          };
        }
      } catch {
        // Fallback to default
      }
    }

    let engineSettings = this.defaultEngineSettings;
    const engineSettingsVal = map.get('engine_settings');
    if (engineSettingsVal !== undefined) {
      try {
        const parsed = JSON.parse(engineSettingsVal);
        if (typeof parsed === 'object' && parsed !== null) {
          engineSettings = {
            antigravity: {
              ...this.defaultEngineSettings.antigravity,
              ...(parsed.antigravity || {}),
              model: (parsed.antigravity?.model && parsed.antigravity.model !== 'gemini-2.5-pro' && parsed.antigravity.model !== 'gemini-3.1-pro-high')
                ? parsed.antigravity.model
                : this.defaultEngineSettings.antigravity.model,
              binPath: parsed.antigravity?.binPath || agyBin,
            },
            claudeCode: {
              ...this.defaultEngineSettings.claudeCode,
              ...(parsed.claudeCode || {}),
              binPath: parsed.claudeCode?.binPath || claudeBin,
            },
            mock: {
              ...this.defaultEngineSettings.mock,
              ...(parsed.mock || {}),
            },
          };
        }
      } catch {
        // Fallback to default
      }
    } else {
      engineSettings = {
        ...this.defaultEngineSettings,
        antigravity: { ...this.defaultEngineSettings.antigravity, binPath: agyBin },
        claudeCode: { ...this.defaultEngineSettings.claudeCode, binPath: claudeBin },
      };
    }

    return {
      autoQueue,
      autoQueueIncludeOwn,
      reviewEngine,
      agyBin,
      claudeBin,
      defaultRuleIds,
      defaultRuleId: defaultRuleIds[0] ?? legacyRuleId,
      defaultBackendId,
      globalMaxConcurrency,
      backendMaxConcurrency,
      engineSettings,
    };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const now = new Date().toISOString();

    const upsert = async (key: string, value: string) => {
      const existing = await this.db
        .select()
        .from(appSettingsTable)
        .where(eq(appSettingsTable.key, key));

      if (existing.length === 0) {
        await this.db.insert(appSettingsTable).values({ key, value, updatedAt: now });
      } else {
        await this.db
          .update(appSettingsTable)
          .set({ value, updatedAt: now })
          .where(eq(appSettingsTable.key, key));
      }
    };

    if (updates.autoQueue !== undefined) {
      await upsert('auto_queue', updates.autoQueue ? 'true' : 'false');
    }
    if (updates.autoQueueIncludeOwn !== undefined) {
      await upsert('auto_queue_include_own', updates.autoQueueIncludeOwn ? 'true' : 'false');
    }
    if (updates.reviewEngine !== undefined) {
      await upsert('review_engine', updates.reviewEngine);
    }
    if (updates.agyBin !== undefined) {
      await upsert('agy_bin', updates.agyBin);
    }
    if (updates.claudeBin !== undefined) {
      await upsert('claude_bin', updates.claudeBin);
    }
    if (updates.defaultRuleId !== undefined) {
      await upsert('default_rule_id', updates.defaultRuleId);
    }
    if (updates.defaultRuleIds !== undefined) {
      await upsert('default_rule_ids', JSON.stringify(updates.defaultRuleIds));
      if (updates.defaultRuleIds.length > 0) {
        await upsert('default_rule_id', updates.defaultRuleIds[0]);
      }
    }
    if (updates.defaultBackendId !== undefined) {
      await upsert('default_backend_id', updates.defaultBackendId);
    }
    if (updates.globalMaxConcurrency !== undefined) {
      await upsert('global_max_concurrency', updates.globalMaxConcurrency.toString());
    }
    if (updates.backendMaxConcurrency !== undefined) {
      await upsert('backend_max_concurrency', JSON.stringify(updates.backendMaxConcurrency));
    }
    if (updates.engineSettings !== undefined) {
      await upsert('engine_settings', JSON.stringify(updates.engineSettings));
      if (updates.engineSettings.antigravity?.binPath) {
        await upsert('agy_bin', updates.engineSettings.antigravity.binPath);
      }
      if (updates.engineSettings.claudeCode?.binPath) {
        await upsert('claude_bin', updates.engineSettings.claudeCode.binPath);
      }
    }

    return this.getAllSettings();
  }

  async isAutoQueueEnabled(): Promise<boolean> {
    const settings = await this.getAllSettings();
    return settings.autoQueue;
  }

  async isAutoQueueIncludeOwnEnabled(): Promise<boolean> {
    const settings = await this.getAllSettings();
    return settings.autoQueueIncludeOwn;
  }

  async setAutoQueueEnabled(enabled: boolean): Promise<boolean> {
    const updated = await this.updateSettings({ autoQueue: enabled });
    return updated.autoQueue;
  }
}

