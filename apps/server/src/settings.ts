import { eq } from 'drizzle-orm';
import type { AppDatabase } from './db/index.ts';
import { appSettingsTable } from './db/schema.ts';

export interface AppSettings {
  autoQueue: boolean;
  reviewEngine: 'antigravity' | 'claude-code' | 'mock';
  agyBin: string;
  claudeBin: string;
}

export class SettingsService {
  private readonly db: AppDatabase;
  private readonly defaultAutoQueue: boolean;
  private readonly defaultReviewEngine: 'antigravity' | 'claude-code' | 'mock';
  private readonly defaultAgyBin: string;
  private readonly defaultClaudeBin: string;

  constructor(db: AppDatabase, defaultAutoQueue?: boolean) {
    this.db = db;
    if (defaultAutoQueue !== undefined) {
      this.defaultAutoQueue = defaultAutoQueue;
    } else {
      const envVal = Deno.env.get('AUTO_QUEUE');
      this.defaultAutoQueue = envVal === 'true' || envVal === '1';
    }

    const envEngine = Deno.env.get('REVIEW_ENGINE');
    if (envEngine === 'claude-code' || envEngine === 'mock' || envEngine === 'antigravity') {
      this.defaultReviewEngine = envEngine;
    } else {
      this.defaultReviewEngine = 'antigravity';
    }

    this.defaultAgyBin = Deno.env.get('AGY_BIN') ?? 'agy';
    this.defaultClaudeBin = Deno.env.get('CLAUDE_BIN') ?? 'claude';
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

    const engineVal = map.get('review_engine');
    const reviewEngine = (engineVal === 'claude-code' || engineVal === 'mock' || engineVal === 'antigravity')
      ? engineVal
      : this.defaultReviewEngine;

    const agyBin = map.get('agy_bin') ?? this.defaultAgyBin;
    const claudeBin = map.get('claude_bin') ?? this.defaultClaudeBin;

    return {
      autoQueue,
      reviewEngine,
      agyBin,
      claudeBin,
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
    if (updates.reviewEngine !== undefined) {
      await upsert('review_engine', updates.reviewEngine);
    }
    if (updates.agyBin !== undefined) {
      await upsert('agy_bin', updates.agyBin);
    }
    if (updates.claudeBin !== undefined) {
      await upsert('claude_bin', updates.claudeBin);
    }

    return this.getAllSettings();
  }

  async isAutoQueueEnabled(): Promise<boolean> {
    const settings = await this.getAllSettings();
    return settings.autoQueue;
  }

  async setAutoQueueEnabled(enabled: boolean): Promise<boolean> {
    const updated = await this.updateSettings({ autoQueue: enabled });
    return updated.autoQueue;
  }
}
