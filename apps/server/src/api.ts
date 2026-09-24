import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { desc, eq } from 'drizzle-orm';
import { resolve } from 'node:path';
import type { AppDatabase } from './db/index.ts';
import { reviewJobsTable, reviewReportsTable, reviewRequestsTable, reviewRulesTable, reviewRuleResultsTable, reviewTriggersTable } from './db/schema.ts';

import type { EngineEnvironment, ReportStorage } from '@review-base/core';
import type { GitHubPoller } from './poller.ts';
import type { ReviewQueue } from './queue.ts';
import type { SettingsService } from './settings.ts';
import { compileD2ToSvg, generateStandaloneReviewHtml, resolveEngineEnvironment } from '@review-base/runner';

export interface ApiDependencies {
  db: AppDatabase;
  storage: ReportStorage;
  poller: GitHubPoller;
  queue: ReviewQueue;
  settingsService: SettingsService;
  logsDir?: string;
}

function mapEngineEnvironments(settings: any, transform: (entry: any, previous?: any) => any, previous?: any) {
  const mapConfig = (config: any, oldConfig?: any) => {
    if (!config) return config;
    const customEnv = { ...(config.customEnv ?? {}) };
    for (const [name, entry] of Object.entries(customEnv) as Array<[string, any]>) {
      customEnv[name] = transform(entry, oldConfig?.customEnv?.[name]);
    }
    return { ...config, customEnv };
  };
  const result = { ...settings };
  if (settings.engineSettings) {
    result.engineSettings = {
      ...Object.fromEntries(
        Object.entries(settings.engineSettings).map(([engine, config]: [string, any]) => [
          engine,
          mapConfig(config, previous?.engineSettings?.[engine]),
        ]),
      ),
    };
  }
  if (Array.isArray(settings.engineProfiles)) {
    result.engineProfiles = settings.engineProfiles.map((profile: any) => {
      const oldProfile = previous?.engineProfiles?.find((candidate: any) => candidate.id === profile.id);
      return {
        ...profile,
        config: mapConfig(profile.config, oldProfile?.config),
      };
    });
  }
  return result;
}

function maskSecretEnvironmentValues(settings: any) {
  return mapEngineEnvironments(settings, (entry) => {
    if (typeof entry === 'string' || !entry.secret) return entry;
    return { ...entry, value: '', configured: Boolean(entry.value || entry.configured) };
  });
}

function restoreSecretEnvironmentValues(settings: any, previous: any) {
  return mapEngineEnvironments(settings, (entry, oldEntry) => {
    if (typeof entry === 'string') return entry;
    const value = entry.secret && entry.value === '' && entry.configured && oldEntry?.secret
      ? oldEntry.value
      : entry.value;
    const { configured: _configured, ...persistedEntry } = entry;
    return { ...persistedEntry, value };
  }, previous);
}

export function createApi(deps: ApiDependencies) {
  const app = new Hono();

  app.use('*', cors());

  // List all review requests with their latest review status and report info
  app.get('/api/reviews', async (c) => {
    const stateParam = c.req.query('state');
    const baseQuery = deps.db.select().from(reviewRequestsTable);
    const requests = stateParam
      ? await baseQuery.where(eq(reviewRequestsTable.state, stateParam)).orderBy(desc(reviewRequestsTable.updatedAt))
      : await baseQuery.orderBy(desc(reviewRequestsTable.updatedAt));

    const jobs = await deps.db.select().from(reviewJobsTable);
    const reports = await deps.db.select().from(reviewReportsTable);

    const items = requests.map((req) => {
      const prJobs = jobs.filter((j) => j.requestId === req.id);
      // Latest job by startedAt or created
      const latestJob = prJobs.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0];
      const report = latestJob
        ? reports.find((r) => r.id === latestJob.reportId) ?? reports.find((r) => r.jobId === latestJob.id)
        : undefined;

      let parsedLabels: Array<{ name: string; color?: string; description?: string }> = [];
      if (req.labels) {
        try {
          parsedLabels = JSON.parse(req.labels);
        } catch {}
      }

      let parsedAssignees: Array<{ login: string; avatarUrl?: string }> = [];
      if (req.assignees) {
        try {
          parsedAssignees = JSON.parse(req.assignees);
        } catch {}
      }

      return {
        ...req,
        labels: parsedLabels,
        milestone: req.milestone || null,
        assignees: parsedAssignees,
        latestJob: latestJob
          ? {
              id: latestJob.id,
              status: latestJob.status,
              startedAt: latestJob.startedAt,
              completedAt: latestJob.completedAt,
              error: latestJob.error,
            }
          : null,
        report: report
          ? {
              id: report.id,
              summary: report.summary,
              verdict: report.verdict,
              createdAt: report.createdAt,
            }
          : null,
      };
    });

    return c.json({ items });
  });

  // Manual refresh / poll
  app.post('/api/reviews/refresh', async (c) => {
    await deps.poller.poll();
    return c.json({ success: true, message: 'Polled successfully' });
  });

  // Trigger review manually for a specific PR (supports optional ruleId or ruleIds)
  app.post('/api/reviews/:id/run', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    let ruleIds: string[] | undefined;
    let engine: string | undefined;
    try {
      const body = await c.req.json();
      if (body.ruleIds && Array.isArray(body.ruleIds)) {
        ruleIds = body.ruleIds.map(String);
      } else if (body.ruleId && typeof body.ruleId === 'string') {
        ruleIds = [body.ruleId];
      }
      if (typeof body.engine === 'string' && body.engine.trim()) {
        engine = body.engine.trim();
      }
    } catch {
      // Body is optional
    }

    const jobIds = await deps.queue.enqueueRules(id, ruleIds, engine);
    return c.json({ success: true, jobIds, jobId: jobIds[0] ?? '' });
  });

  // Get all rule results for a PR
  app.get('/api/reviews/:id/rule-results', async (c) => {
    const id = decodeURIComponent(c.req.param('id'));
    const rows = await deps.db
      .select()
      .from(reviewRuleResultsTable)
      .where(eq(reviewRuleResultsTable.requestId, id))
      .orderBy(desc(reviewRuleResultsTable.createdAt));

    const results = rows.map((r) => {
      let findings = [];
      try {
        findings = JSON.parse(r.findings);
      } catch {
        // ignore
      }
      let metadata = undefined;
      if (r.metadata) {
        try {
          metadata = JSON.parse(r.metadata);
          if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            metadata = Object.fromEntries(
              Object.entries(metadata).filter(([key]) => key !== 'reviewReport')
            );
          }
        } catch {
          // ignore
        }
      }
      return {
        ...r,
        findings,
        metadata,
      };
    });

    return c.json({ results });
  });

  // Serve generated review HTML report
  app.get('/api/reports/:id/html', async (c) => {
    const id = c.req.param('id');
    // Path traversal defense
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid report ID format', 400);
    }

    const html = await deps.storage.getReportHtml(id);
    if (html !== null) {
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('X-Frame-Options', 'SAMEORIGIN');
      c.header(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' https:; script-src 'unsafe-inline' 'self'; frame-ancestors 'self'"
      );
      return c.html(html);
    }

    // On-demand HTML generation from reportData
    const data = await deps.storage.getReportData(id);
    if (data === null) {
      return c.text('Report not found', 404);
    }

    const generatedHtml = generateStandaloneReviewHtml(data);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    return c.html(generatedHtml);
  });

  // Serve generated review JSON report data
  app.get('/api/reports/:id/data', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.json({ error: 'Invalid report ID format' }, 400);
    }

    const data = await deps.storage.getReportData(id);
    if (data !== null) {
      return c.json(data);
    }

    const reportRecords = await deps.db
      .select()
      .from(reviewReportsTable)
      .where(eq(reviewReportsTable.id, id));
    const report = reportRecords[0];
    if (!report) {
      return c.json({ error: 'Report data not found' }, 404);
    }

    return c.json({
      verdict: report.verdict ?? 'COMMENT',
      summary: {
        brief: report.summary ?? '',
        changedCode: [],
        reachPaths: [],
      },
      comments: [],
      createdAt: report.createdAt,
    });
  });

  // On-demand export HTML report
  app.get('/api/reports/:id/export.html', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid report ID format', 400);
    }

    let html = await deps.storage.getReportHtml(id);
    if (html === null) {
      const data = await deps.storage.getReportData(id);
      if (data === null) {
        return c.text('Report not found', 404);
      }
      html = generateStandaloneReviewHtml(data);
    }

    c.header('Content-Disposition', `attachment; filename="report-${id}.html"`);
    return c.html(html);
  });

  // Serve job execution log
  app.get('/api/jobs/:id/log', async (c) => {
    const id = c.req.param('id');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.text('Invalid job ID format', 400);
    }

    const logPath = resolve(deps.logsDir ?? './data/logs', `${id}.log`);
    try {
      const content = await Deno.readTextFile(logPath);
      return c.text(content);
    } catch {
      return c.text('No log available for this job', 404);
    }
  });

  // Review Rules CRUD
  app.get('/api/rules', async (c) => {
    const rows = await deps.db.select().from(reviewRulesTable);
    const rules = rows.map((row) => {
      let trigger = {};
      try {
        trigger = JSON.parse(row.triggerJson);
      } catch {
        // Fallback to empty object
      }
      let concurrency = undefined;
      if (row.concurrencyJson) {
        try {
          concurrency = JSON.parse(row.concurrencyJson);
        } catch {
          // Fallback to undefined
        }
      }
      let engineOverride = undefined;
      if (row.engineOverrideJson) {
        try {
          engineOverride = JSON.parse(row.engineOverrideJson);
        } catch {
          // Fallback to undefined
        }
      }
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        engine: row.engine,
        instructions: row.instructions,
        engineOverride,
        trigger,
        concurrency,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    return c.json({ rules });
  });

  app.post('/api/rules', async (c) => {
    try {
      const body = await c.req.json();
      if (!body.name || !body.instructions) {
        return c.json({ error: 'name and instructions are required' }, 400);
      }

      const now = new Date().toISOString();
      const id = body.id || `rule-${crypto.randomUUID().slice(0, 8)}`;
      const newRule = {
        id,
        name: String(body.name),
        description: body.description ? String(body.description) : '',
        category: body.category ? String(body.category) : 'general',
        engine: body.engine ? String(body.engine) : 'default',
        instructions: String(body.instructions),
        engineOverrideJson: body.engineOverride ? JSON.stringify(body.engineOverride) : null,
        triggerJson: JSON.stringify(body.trigger ?? { types: ['opened', 'synchronize'] }),
        concurrencyJson: body.concurrency ? JSON.stringify(body.concurrency) : null,
        enabled: body.enabled !== false,
        createdAt: now,
        updatedAt: now,
      };

      await deps.db.insert(reviewRulesTable).values(newRule);
      return c.json({
        success: true,
        rule: {
          ...newRule,
          engineOverride: body.engineOverride,
          trigger: body.trigger ?? { types: ['opened', 'synchronize'] },
          concurrency: body.concurrency,
          enabled: newRule.enabled,
        },
      }, 201);
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.get('/api/rules/:id', async (c) => {
    const id = c.req.param('id');
    const rows = await deps.db.select().from(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    if (rows.length === 0) {
      return c.json({ error: 'Rule not found' }, 404);
    }
    const row = rows[0];
    let trigger = {};
    try {
      trigger = JSON.parse(row.triggerJson);
    } catch {
      // Fallback
    }
    let concurrency = undefined;
    if (row.concurrencyJson) {
      try {
        concurrency = JSON.parse(row.concurrencyJson);
      } catch {
        // Fallback
      }
    }
    let engineOverride = undefined;
    if (row.engineOverrideJson) {
      try {
        engineOverride = JSON.parse(row.engineOverrideJson);
      } catch {
        // Fallback
      }
    }
    return c.json({
      rule: {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        engine: row.engine,
        instructions: row.instructions,
        engineOverride,
        trigger,
        concurrency,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  });

  app.put('/api/rules/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Rule not found' }, 404);
    }

    try {
      const body = await c.req.json();
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updatedAt: now };

      if (body.name !== undefined) updates.name = String(body.name);
      if (body.description !== undefined) updates.description = String(body.description);
      if (body.category !== undefined) updates.category = String(body.category);
      if (body.engine !== undefined) updates.engine = String(body.engine);
      if (body.instructions !== undefined) updates.instructions = String(body.instructions);
      if (body.engineOverride !== undefined) {
        updates.engineOverrideJson = body.engineOverride ? JSON.stringify(body.engineOverride) : null;
      }
      if (body.trigger !== undefined) updates.triggerJson = JSON.stringify(body.trigger);
      if (body.concurrency !== undefined) updates.concurrencyJson = JSON.stringify(body.concurrency);
      if (body.enabled !== undefined) updates.enabled = body.enabled ? true : false;

      await deps.db.update(reviewRulesTable).set(updates).where(eq(reviewRulesTable.id, id));
      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.delete('/api/rules/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Rule not found' }, 404);
    }

    await deps.db.delete(reviewRulesTable).where(eq(reviewRulesTable.id, id));
    return c.json({ success: true });
  });

  // Triggers CRUD endpoints
  app.get('/api/triggers', async (c) => {
    const rows = await deps.db.select().from(reviewTriggersTable);
    const triggers = rows.map((row) => {
      let paths: string[] | undefined = undefined;
      let pathsIgnore: string[] | undefined = undefined;
      let ruleIds: string[] = [];
      try {
        if (row.pathsJson) paths = JSON.parse(row.pathsJson);
        if (row.pathsIgnoreJson) pathsIgnore = JSON.parse(row.pathsIgnoreJson);
        if (row.ruleIdsJson) ruleIds = JSON.parse(row.ruleIdsJson);
      } catch {
        // Fallback
      }
      return {
        id: row.id,
        name: row.name,
        repository: row.repository,
        paths,
        pathsIgnore,
        ruleIds,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    return c.json({ triggers });
  });

  app.post('/api/triggers', async (c) => {
    try {
      const body = await c.req.json();
      if (!body.name || !body.repository) {
        return c.json({ error: 'Name and repository are required' }, 400);
      }
      const now = new Date().toISOString();
      const id = body.id || `trigger-${Date.now()}`;
      const newTrigger = {
        id,
        name: String(body.name),
        repository: String(body.repository),
        pathsJson: body.paths && Array.isArray(body.paths) ? JSON.stringify(body.paths) : null,
        pathsIgnoreJson: body.pathsIgnore && Array.isArray(body.pathsIgnore) ? JSON.stringify(body.pathsIgnore) : null,
        ruleIdsJson: JSON.stringify(Array.isArray(body.ruleIds) ? body.ruleIds : []),
        enabled: body.enabled !== false,
        createdAt: now,
        updatedAt: now,
      };
      await deps.db.insert(reviewTriggersTable).values(newTrigger);
      return c.json({ success: true, trigger: { ...newTrigger, paths: body.paths, pathsIgnore: body.pathsIgnore, ruleIds: body.ruleIds || [] } }, 201);
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.get('/api/triggers/:id', async (c) => {
    const id = c.req.param('id');
    const rows = await deps.db.select().from(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    if (rows.length === 0) {
      return c.json({ error: 'Trigger not found' }, 404);
    }
    const row = rows[0];
    let paths: string[] | undefined = undefined;
    let pathsIgnore: string[] | undefined = undefined;
    let ruleIds: string[] = [];
    try {
      if (row.pathsJson) paths = JSON.parse(row.pathsJson);
      if (row.pathsIgnoreJson) pathsIgnore = JSON.parse(row.pathsIgnoreJson);
      if (row.ruleIdsJson) ruleIds = JSON.parse(row.ruleIdsJson);
    } catch {
      // Fallback
    }
    return c.json({
      trigger: {
        id: row.id,
        name: row.name,
        repository: row.repository,
        paths,
        pathsIgnore,
        ruleIds,
        enabled: Boolean(row.enabled),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  });

  app.put('/api/triggers/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Trigger not found' }, 404);
    }

    try {
      const body = await c.req.json();
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { updatedAt: now };

      if (body.name !== undefined) updates.name = String(body.name);
      if (body.repository !== undefined) updates.repository = String(body.repository);
      if (body.paths !== undefined) {
        updates.pathsJson = Array.isArray(body.paths) && body.paths.length > 0 ? JSON.stringify(body.paths) : null;
      }
      if (body.pathsIgnore !== undefined) {
        updates.pathsIgnoreJson = Array.isArray(body.pathsIgnore) && body.pathsIgnore.length > 0 ? JSON.stringify(body.pathsIgnore) : null;
      }
      if (body.ruleIds !== undefined) {
        updates.ruleIdsJson = JSON.stringify(Array.isArray(body.ruleIds) ? body.ruleIds : []);
      }
      if (body.enabled !== undefined) updates.enabled = body.enabled ? true : false;

      await deps.db.update(reviewTriggersTable).set(updates).where(eq(reviewTriggersTable.id, id));
      return c.json({ success: true });
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  app.delete('/api/triggers/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await deps.db.select().from(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    if (existing.length === 0) {
      return c.json({ error: 'Trigger not found' }, 404);
    }

    await deps.db.delete(reviewTriggersTable).where(eq(reviewTriggersTable.id, id));
    return c.json({ success: true });
  });

  // Settings endpoints
  app.get('/api/settings', async (c) => {
    const settings = await deps.settingsService.getAllSettings();
    return c.json(maskSecretEnvironmentValues(settings));
  });

  app.post('/api/settings', async (c) => {
    try {
      const body = await c.req.json();
      const current = await deps.settingsService.getAllSettings();
      const merged = restoreSecretEnvironmentValues(body, current);
      const updated = await deps.settingsService.updateSettings(merged);
      return c.json(maskSecretEnvironmentValues(updated));
    } catch {
      return c.json({ error: 'Invalid JSON payload' }, 400);
    }
  });

  // Engine connection and execution test endpoint
  app.post('/api/engines/:engine/test', async (c) => {
    const engine = c.req.param('engine');
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // Body is optional
    }

    const mode = body?.mode === 'execution' ? 'execution' : 'version';

    const settings = await deps.settingsService.getAllSettings();
    const matchedProfile = settings.engineProfiles?.find((p) => p.id === (body?.profileId ?? engine));

    let effectiveEngine = engine;
    let profileConfig: any = null;
    if (matchedProfile) {
      effectiveEngine = matchedProfile.engineType;
      profileConfig = matchedProfile.config;
    }

    if (effectiveEngine === 'mock') {
      if (mode === 'execution') {
        const delay = profileConfig?.delayMs ?? settings.engineSettings?.mock?.delayMs ?? 500;
        await new Promise((r) => setTimeout(r, Math.min(delay, 1500)));
        return c.json({
          success: true,
          mode: 'execution',
          version: 'mock-engine 1.0.0',
          message: 'Mockエンジンの実行検証（推論テスト）に成功しました。',
          output: 'OK (Mock engine simulation passed)',
        });
      }
      return c.json({
        success: true,
        mode: 'version',
        version: 'mock-engine 1.0.0',
        message: 'Mockエンジンは正常に利用可能です。',
      });
    }

    if (!['antigravity', 'claude-code', 'codex'].includes(effectiveEngine)) {
      return c.json({ error: `Unknown engine or profile: ${engine}` }, 400);
    }

    let binPath = '';
    let model = '';
    let effort = '';
    if (effectiveEngine === 'antigravity') {
      binPath = body?.binPath || profileConfig?.binPath || settings.engineSettings?.antigravity?.binPath || settings.agyBin || 'agy';
      model = body?.model || profileConfig?.model || settings.engineSettings?.antigravity?.model || '';
      effort = body?.effort || profileConfig?.effort || settings.engineSettings?.antigravity?.effort || '';
    } else if (effectiveEngine === 'claude-code') {
      binPath = body?.binPath || profileConfig?.binPath || settings.engineSettings?.claudeCode?.binPath || settings.claudeBin || 'claude';
      model = body?.model || profileConfig?.model || settings.engineSettings?.claudeCode?.model || '';
      effort = body?.effort || profileConfig?.effort || settings.engineSettings?.claudeCode?.effort || '';
    } else {
      binPath = body?.binPath || profileConfig?.binPath || settings.engineSettings?.codex?.binPath || 'codex';
      model = body?.model || profileConfig?.model || settings.engineSettings?.codex?.model || '';
      effort = body?.effort || profileConfig?.effort || settings.engineSettings?.codex?.effort || '';
    }

    const isExecution = mode === 'execution';
    const timeoutMs = isExecution ? 45000 : 5000;

    let args: string[] = isExecution
      ? ['-p', 'Respond with "review-base test OK"', '--dangerously-skip-permissions']
      : ['--version'];

    if (effectiveEngine === 'codex' && isExecution) {
      const sandboxMode = body?.sandboxMode || profileConfig?.sandboxMode || settings.engineSettings.codex.sandboxMode || 'workspace-write';
      args = ['exec', '--json', '--sandbox', sandboxMode, '--config', 'approval_policy="never"'];
      if (body?.ephemeral ?? profileConfig?.ephemeral ?? settings.engineSettings.codex.ephemeral) args.push('--ephemeral');
      if (model) args.push('--model', model);
      if (effort) args.push('--config', `model_reasoning_effort=${JSON.stringify(effort)}`);
      args.push('-');
    }

    if (isExecution && effectiveEngine !== 'codex') {
      if (model) {
        args.push('--model', model);
      }
      if (effort) {
        args.push('--effort', effort);
      }
    }

    const engineKey = effectiveEngine === 'claude-code' ? 'claudeCode' : effectiveEngine;
    const globalEnvironment = (settings.engineSettings as unknown as Record<string, { customEnv?: EngineEnvironment }> | undefined)?.[engineKey]?.customEnv;
    const env = resolveEngineEnvironment(Deno.env.toObject(), globalEnvironment, profileConfig?.customEnv, body?.customEnv);
    try {
      const cmd = new Deno.Command(binPath, {
        args,
        stdin: effectiveEngine === 'codex' && isExecution ? 'piped' : 'null',
        stdout: 'piped',
        stderr: 'piped',
        env,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const child = cmd.spawn();
      if (effectiveEngine === 'codex' && isExecution) {
        const writer = child.stdin.getWriter();
        await writer.write(new TextEncoder().encode('Respond with "review-base test OK"'));
        await writer.close();
      }
      const output = await child.output();
      const stdout = new TextDecoder().decode(output.stdout).trim();
      const stderr = new TextDecoder().decode(output.stderr).trim();

      if (output.success) {
        return c.json({
          success: true,
          mode,
          version: !isExecution ? (stdout || 'Version output empty') : undefined,
          output: isExecution ? (stdout || 'OK') : undefined,
          message: isExecution
            ? `${engine} の実行検証（推論テスト）に成功しました。`
            : `${engine} CLI の接続テストに成功しました。`,
        });
      } else {
        return c.json({
          success: false,
          mode,
          error: stderr || stdout || `CLI command exited with status ${output.code}`,
        });
      }
    } catch (err: any) {
      if (err.name === 'TimeoutError') {
        return c.json({
          success: false,
          mode,
          error: `${isExecution ? '推論実行テスト' : '接続テスト'}がタイムアウトしました (${timeoutMs / 1000}秒超過): ${binPath}`,
        });
      }
      if (err instanceof Deno.errors.NotFound) {
        return c.json({
          success: false,
          mode,
          error: `指定されたバイナリが見つかりません: ${binPath}`,
        });
      }
      return c.json({
        success: false,
        mode,
        error: `実行エラー: ${err.message || String(err)}`,
      });
    }
  });

  // Compile D2 diagram source with specified layout engine
  app.post('/api/diagram/compile', async (c) => {
    try {
      const body = await c.req.json();
      const d2Source = typeof body.d2Source === 'string' ? body.d2Source : '';
      if (!d2Source.trim()) {
        return c.json({ error: 'd2Source is required' }, 400);
      }

      const layout = ['tala', 'elk', 'dagre'].includes(body.layout) ? body.layout : 'tala';
      const svg = await compileD2ToSvg(d2Source, { layout });
      return c.json({ svg, layout });
    } catch (err: any) {
      return c.json({ error: `Compilation failed: ${err.message || err}` }, 500);
    }
  });

  return app;
}
