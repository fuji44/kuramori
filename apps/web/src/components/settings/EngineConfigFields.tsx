import { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type {
  AntigravityEngineConfig,
  ClaudeCodeEngineConfig,
  MockEngineConfig,
  CodexEngineConfig,
  BaseCliEngineConfig,
} from '../../types.ts';
import { Checkbox } from '../Checkbox.tsx';
import { useI18n } from '../../i18n/context.tsx';

export interface AntigravityFieldsProps {
  values: Partial<AntigravityEngineConfig>;
  onChange: (updates: Partial<AntigravityEngineConfig>) => void;
  isOverride?: boolean;
  disabled?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function AntigravityFields({
  values,
  onChange,
  isOverride = false,
  disabled = false,
  showAdvanced,
  onToggleAdvanced,
}: AntigravityFieldsProps) {
  const { t } = useI18n();
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const isAdvancedOpen = showAdvanced !== undefined ? showAdvanced : internalShowAdvanced;
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced((prev) => !prev));

  const advancedCount = disabled
    ? 0
    : [
        Boolean(values.systemPrompt?.trim()),
        values.inputFormat && values.inputFormat !== 'text',
        values.outputFormat && values.outputFormat !== 'text',
        Boolean(values.jsonSchema?.trim()),
        Boolean(values.printTimeout?.trim()),
        isOverride ? values.sandbox !== undefined : Boolean(values.sandbox),
        isOverride ? values.disableSlashCommands !== undefined : Boolean(values.disableSlashCommands),
        Boolean(values.customArgs?.trim()),
        Object.keys(values.customEnv ?? {}).length > 0,
      ].filter(Boolean).length;

  const inputClass = `w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`;
  const textareaClass = `w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`;
  const selectClass = `w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`;

  return (
    <div className="space-y-4">
      {/* 1. バイナリパス (全体設定のみ) */}
      {!isOverride && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.engineBinPath', { engine: 'agy' })}
            </label>
            <input
              type="text"
              required
              disabled={disabled}
              value={values.binPath ?? ''}
              onChange={(e) => onChange({ binPath: e.target.value })}
              placeholder={t('settings.engines.binPathPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.timeoutLabel')}
            </label>
            <input
              type="number"
              min={10}
              max={3600}
              step={1}
              disabled={disabled}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              onBlur={() => {
                if (
                  values.timeoutSeconds === '' ||
                  values.timeoutSeconds === undefined ||
                  isNaN(Number(values.timeoutSeconds)) ||
                  Number(values.timeoutSeconds) <= 0
                ) {
                  onChange({ timeoutSeconds: 900 });
                }
              }}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* 2. 基本設定 (モデル・推論レベル・タイムアウト) */}
      <div className={`grid grid-cols-1 ${isOverride ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">
            {t('settings.engines.modelLabel')}
          </label>
          <input
            type="text"
            list="agy-model-suggestions"
            disabled={disabled}
            value={values.model ?? ''}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder={
              isOverride
                ? t('settings.engines.modelInheritPlaceholder')
                : t('settings.engines.modelPlaceholder')
            }
            className={inputClass}
          />
          <datalist id="agy-model-suggestions">
            <option value="gemini-3.1-pro" label={t('settings.engines.modelOptionRecommended')} />
            <option value="gemini-3.8-flash" label={t('settings.engines.modelOptionFast')} />
            <option value="gemini-3.7-flash" />
            <option value="gemini-3.6-flash" />
            <option value="claude-sonnet-4-6" />
            <option value="claude-opus-4-6" />
            <option value="gpt-oss-120b" />
          </datalist>
        </div>

        <div>
          <label className="text-xs text-[#8b949e] block mb-1">
            {t('settings.engines.effortLabel')}
          </label>
          <input
            type="text"
            list="agy-effort-suggestions"
            disabled={disabled}
            value={values.effort ?? ''}
            onChange={(e) => onChange({ effort: e.target.value })}
            placeholder={
              isOverride
                ? t('settings.engines.effortInheritPlaceholder')
                : t('settings.engines.effortPlaceholder')
            }
            className={inputClass}
          />
          <datalist id="agy-effort-suggestions">
            <option value="high" />
            <option value="medium" />
            <option value="low" />
          </datalist>
        </div>

        {isOverride && (
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.timeoutLabel')}
            </label>
            <input
              type="number"
              min={10}
              max={3600}
              step={1}
              disabled={disabled}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              placeholder={t('settings.engines.timeoutInheritPlaceholder')}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* 3. 高度な設定トグルボタン */}
      <div className="pt-1">
        <button
          type="button"
          onClick={toggleAdvanced}
          aria-expanded={isAdvancedOpen}
          className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('settings.engines.advancedSettings')}</span>
            {advancedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                {t('settings.engines.advancedCountBadge', { count: advancedCount })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <span>{isAdvancedOpen ? t('settings.engines.closeAdvanced') : t('settings.engines.openAdvanced')}</span>
            {isAdvancedOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>

      {/* 4. 高度な設定コンテンツ */}
      {isAdvancedOpen && (
        <div className="space-y-4 pt-1 pl-3 border-l-2 border-sky-800/40">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.systemPromptLabel')}
            </label>
            <textarea
              rows={3}
              disabled={disabled}
              value={values.systemPrompt ?? ''}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.systemPromptInheritPlaceholder')
                  : t('settings.engines.systemPromptPlaceholder')
              }
              className={textareaClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {isOverride
                ? t('settings.engines.systemPromptOverrideHelp')
                : t('settings.engines.systemPromptHelp')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                {t('settings.engines.inputFormatLabel')}
              </label>
              <select
                disabled={disabled}
                value={values.inputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'stream-json' | '';
                  if (val === '') {
                    onChange({ inputFormat: undefined });
                  } else {
                    onChange({
                      inputFormat: val,
                      ...(val === 'stream-json' ? { outputFormat: 'stream-json' } : {}),
                    });
                  }
                }}
                className={selectClass}
              >
                {isOverride && <option value="">{t('settings.engines.formatInherit')}</option>}
                <option value="text">{t('settings.engines.formatTextPrompt')}</option>
                <option value="stream-json">{t('settings.engines.formatStreamJsonInput')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                {t('settings.engines.outputFormatLabel')}
              </label>
              <select
                disabled={disabled}
                value={values.outputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'json' | 'stream-json' | '';
                  onChange({ outputFormat: val === '' ? undefined : val });
                }}
                className={selectClass}
              >
                {isOverride && <option value="">{t('settings.engines.formatInherit')}</option>}
                <option value="text">{t('settings.engines.formatText')}</option>
                <option value="json">{t('settings.engines.formatJson')}</option>
                <option value="stream-json">{t('settings.engines.formatStreamJson')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.jsonSchemaLabel')}
            </label>
            <textarea
              rows={4}
              disabled={disabled}
              value={values.jsonSchema ?? ''}
              onChange={(e) => onChange({ jsonSchema: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.jsonSchemaPlaceholder')
                  : t('settings.engines.jsonSchemaPlaceholder')
              }
              className={textareaClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {t('settings.engines.jsonSchemaHelp')}
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.printTimeoutLabel')}
            </label>
            <input
              type="text"
              disabled={disabled}
              value={values.printTimeout ?? ''}
              onChange={(e) => onChange({ printTimeout: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.printTimeoutPlaceholder')
                  : t('settings.engines.printTimeoutDefaultPlaceholder')
              }
              className={inputClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {t('settings.engines.printTimeoutHelp')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {isOverride ? (
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  {t('settings.engines.sandboxLabel')}
                </label>
                <select
                  disabled={disabled}
                  value={values.sandbox === undefined ? '' : String(values.sandbox)}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({ sandbox: val === '' ? undefined : val === 'true' });
                  }}
                  className={selectClass}
                >
                  <option value="">{t('settings.engines.sandboxOptionInherit')}</option>
                  <option value="true">{t('settings.engines.sandboxOptionEnable')}</option>
                  <option value="false">{t('settings.engines.sandboxOptionDisable')}</option>
                </select>
              </div>
            ) : (
              <Checkbox
                variant="card"
                disabled={disabled}
                checked={Boolean(values.sandbox)}
                onChange={(checked) => onChange({ sandbox: checked })}
                label={t('settings.engines.sandboxLabel')}
                description={t('settings.engines.sandboxDesc')}
              />
            )}

            {isOverride ? (
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  {t('settings.engines.disableSlashCommands')}
                </label>
                <select
                  disabled={disabled}
                  value={
                    values.disableSlashCommands === undefined
                      ? ''
                      : String(values.disableSlashCommands)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      disableSlashCommands: val === '' ? undefined : val === 'true',
                    });
                  }}
                  className={selectClass}
                >
                  <option value="">{t('settings.engines.disableSlashCommandsOptionInherit')}</option>
                  <option value="true">{t('settings.engines.disableSlashCommandsOptionEnable')}</option>
                  <option value="false">{t('settings.engines.disableSlashCommandsOptionDisable')}</option>
                </select>
              </div>
            ) : (
              <Checkbox
                variant="card"
                disabled={disabled}
                checked={Boolean(values.disableSlashCommands)}
                onChange={(checked) => onChange({ disableSlashCommands: checked })}
                label={t('settings.engines.disableSlashCommands')}
                description={t('settings.engines.disableSlashCommandsDesc')}
              />
            )}
          </div>

          <div>
            <EngineEnvironmentVariables values={values} onChange={onChange} disabled={disabled} engineLabel="Antigravity" />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.customArgs')}
            </label>
            <input
              type="text"
              disabled={disabled}
              value={values.customArgs ?? ''}
              onChange={(e) => onChange({ customArgs: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.customArgsInheritPlaceholder', { example: '--project my-project' })
                  : t('settings.engines.customArgsPlaceholder')
              }
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface ClaudeCodeFieldsProps {
  values: Partial<ClaudeCodeEngineConfig>;
  onChange: (updates: Partial<ClaudeCodeEngineConfig>) => void;
  isOverride?: boolean;
  disabled?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function EngineEnvironmentVariables({
  values,
  onChange,
  disabled,
  engineLabel,
}: {
  values: Partial<BaseCliEngineConfig>;
  onChange: (updates: Partial<BaseCliEngineConfig>) => void;
  disabled: boolean;
  engineLabel: string;
}) {
  const { t } = useI18n();
  const environment: Record<string, { value: string; secret: boolean; configured?: boolean }> = Object.fromEntries(
    Object.entries(values.customEnv ?? {}).map(([name, entry]) => [
      name,
      typeof entry === 'string' ? { value: entry, secret: false } : entry,
    ]),
  );
  const updateVariable = (name: string, nextName: string, entry: { value: string; secret: boolean; configured?: boolean }) => {
    const trimmedName = nextName.trim();
    if (trimmedName !== name && Object.prototype.hasOwnProperty.call(environment, trimmedName)) {
      return;
    }
    const nextEnvironment = Object.fromEntries(
      Object.entries(environment).flatMap(([currentName, currentEntry]) => {
        if (currentName !== name) return [[currentName, currentEntry]];
        return trimmedName ? [[trimmedName, entry]] : [];
      }),
    );
    onChange({ customEnv: nextEnvironment });
  };

  const addVariable = () => {
    let name = 'CUSTOM_ENV_VAR';
    let suffix = 1;
    while (Object.prototype.hasOwnProperty.call(environment, name)) {
      name = `CUSTOM_ENV_VAR_${suffix}`;
      suffix += 1;
    }
    onChange({ customEnv: { ...environment, [name]: { value: '', secret: false } } });
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs text-[#8b949e]">{t('settings.engines.envVarsLabel')}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={addVariable}
          className="inline-flex items-center gap-1 rounded border border-[#30363d] px-2 py-1 text-[11px] text-sky-400 hover:bg-[#21262d] disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          {t('settings.engines.addEnvVar')}
        </button>
      </div>

      {Object.entries(environment).length === 0 ? (
        <p className="text-[11px] text-[#8b949e]">{t('settings.engines.envVarsDesc', { engine: engineLabel })}</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(environment).map(([name, entry], index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto_auto] gap-2">
              <input
                type="text"
                disabled={disabled}
                aria-label={t('settings.engines.envVarName')}
                value={name}
                onChange={(event) => updateVariable(name, event.target.value, entry)}
                placeholder={t('settings.engines.envVarName')}
                className="min-w-0 rounded border border-[#30363d] bg-[#0d1117] px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <input
                type={entry.secret ? 'password' : 'text'}
                disabled={disabled}
                aria-label={entry.secret ? t('settings.engines.envVarValueSecretAria', { name }) : t('settings.engines.envVarValueAria', { name })}
                value={entry.value}
                onChange={(event) => updateVariable(name, name, { ...entry, value: event.target.value })}
                placeholder={entry.secret && entry.configured ? t('settings.engines.envVarConfigured') : t('settings.engines.envVarValue')}
                className="min-w-0 rounded border border-[#30363d] bg-[#0d1117] px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <label className="flex items-center gap-1 text-[10px] text-[#8b949e]">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={entry.secret}
                  onChange={(event) => updateVariable(name, name, { ...entry, secret: event.target.checked })}
                  aria-label={t('settings.engines.envVarSecretAria', { name })}
                />
                {t('settings.engines.envVarSecret')}
              </label>
              <button
                type="button"
                disabled={disabled}
                aria-label={t('settings.engines.envVarDeleteAria', { name })}
                onClick={() => updateVariable(name, '', { value: '', secret: false })}
                className="rounded border border-[#30363d] px-2 text-[#8b949e] hover:border-rose-700 hover:text-rose-300 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-amber-300/90">
        {t('settings.engines.envVarNotice')}
      </p>
    </div>
  );
}

export function ClaudeCodeFields({
  values,
  onChange,
  isOverride = false,
  disabled = false,
  showAdvanced,
  onToggleAdvanced,
}: ClaudeCodeFieldsProps) {
  const { t } = useI18n();
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const isAdvancedOpen = showAdvanced !== undefined ? showAdvanced : internalShowAdvanced;
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced((prev) => !prev));

  const advancedCount = disabled
    ? 0
    : [
        Object.keys(values.customEnv ?? {}).length > 0,
        Boolean(values.systemPrompt?.trim()),
        values.inputFormat && values.inputFormat !== 'text',
        values.outputFormat && values.outputFormat !== 'text',
        Boolean(values.jsonSchema?.trim()),
        Boolean(values.allowedTools?.trim()),
        isOverride ? values.bare !== undefined : Boolean(values.bare),
        values.maxTurns !== undefined && values.maxTurns > 0,
        Boolean(values.customArgs?.trim()),
      ].filter(Boolean).length;

  const inputClass = `w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`;
  const textareaClass = `w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 leading-relaxed resize-y font-mono disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`;
  const selectClass = `w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`;

  return (
    <div className="space-y-4">
      {/* 1. バイナリパス (全体設定のみ) */}
      {!isOverride && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.engineBinPath', { engine: 'claude' })}
            </label>
            <input
              type="text"
              required
              disabled={disabled}
              value={values.binPath ?? ''}
              onChange={(e) => onChange({ binPath: e.target.value })}
              placeholder={t('settings.engines.binPathPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.timeoutLabel')}
            </label>
            <input
              type="number"
              min={10}
              max={3600}
              step={1}
              disabled={disabled}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              onBlur={() => {
                if (
                  values.timeoutSeconds === '' ||
                  values.timeoutSeconds === undefined ||
                  isNaN(Number(values.timeoutSeconds)) ||
                  Number(values.timeoutSeconds) <= 0
                ) {
                  onChange({ timeoutSeconds: 900 });
                }
              }}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* 2. 基本設定 (モデル・推論レベル・タイムアウト) */}
      <div className={`grid grid-cols-1 ${isOverride ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">
            {t('settings.engines.modelLabel')}
          </label>
          <input
            type="text"
            list="claude-model-suggestions"
            disabled={disabled}
            value={values.model ?? ''}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder={
              isOverride
                ? t('settings.engines.modelInheritPlaceholder')
                : t('settings.engines.modelPlaceholder')
            }
            className={inputClass}
          />
          <datalist id="claude-model-suggestions">
            <option value="sonnet" label={t('settings.engines.modelOptionRecommended')} />
            <option value="opus" label={t('settings.engines.modelOptionReasoning')} />
            <option value="haiku" label={t('settings.engines.modelOptionFast')} />
            <option value="best" label={t('settings.engines.modelOptionBest')} />
            <option value="fable" />
            <option value="opusplan" label={t('settings.engines.modelOptionHybrid')} />
            <option value="sonnet[1m]" />
            <option value="opus[1m]" />
            <option value="default" />
            <option value="claude-opus-4-8" />
            <option value="claude-sonnet-4-6" />
            <option value="claude-sonnet-4-5" />
            <option value="claude-haiku-4-5" />
            <option value="claude-3-7-sonnet-20250219" />
          </datalist>
        </div>

        <div>
          <label className="text-xs text-[#8b949e] block mb-1">
            {t('settings.engines.effortLabel')}
          </label>
          <input
            type="text"
            list="claude-effort-suggestions"
            disabled={disabled}
            value={values.effort ?? ''}
            onChange={(e) => onChange({ effort: e.target.value })}
            placeholder={
              isOverride
                ? t('settings.engines.effortInheritPlaceholder')
                : t('settings.engines.effortPlaceholder')
            }
            className={inputClass}
          />
          <datalist id="claude-effort-suggestions">
            <option value="high" />
            <option value="xhigh" />
            <option value="max" />
            <option value="medium" />
            <option value="low" />
          </datalist>
        </div>

        {isOverride && (
          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.timeoutLabel')}
            </label>
            <input
              type="number"
              min={10}
              max={3600}
              step={1}
              disabled={disabled}
              value={values.timeoutSeconds !== undefined ? values.timeoutSeconds : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ timeoutSeconds: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ timeoutSeconds: num });
                  }
                }
              }}
              placeholder={t('settings.engines.timeoutInheritPlaceholder')}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* 3. 高度な設定トグルボタン */}
      <div className="pt-1">
        <button
          type="button"
          onClick={toggleAdvanced}
          aria-expanded={isAdvancedOpen}
          className="flex items-center justify-between w-full py-2.5 px-3.5 text-xs font-medium text-[#c9d1d9] bg-[#0d1117] hover:bg-[#1c2128] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('settings.engines.advancedSettings')}</span>
            {advancedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-950 text-sky-300 border border-sky-800/80">
                {t('settings.engines.advancedCountBadge', { count: advancedCount })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
            <span>{isAdvancedOpen ? t('settings.engines.closeAdvanced') : t('settings.engines.openAdvanced')}</span>
            {isAdvancedOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>

      {/* 4. 高度な設定コンテンツ */}
      {isAdvancedOpen && (
        <div className="space-y-4 pt-1 pl-3 border-l-2 border-sky-800/40">
          <EngineEnvironmentVariables values={values} onChange={onChange} disabled={disabled} engineLabel="CLI" />

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.systemPromptLabel')}
            </label>
            <textarea
              rows={3}
              disabled={disabled}
              value={values.systemPrompt ?? ''}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.systemPromptInheritPlaceholder')
                  : t('settings.engines.systemPromptPlaceholder')
              }
              className={textareaClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {isOverride
                ? t('settings.engines.systemPromptOverrideHelp')
                : t('settings.engines.systemPromptHelp')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                {t('settings.engines.inputFormatLabel')}
              </label>
              <select
                disabled={disabled}
                value={values.inputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'stream-json' | '';
                  if (val === '') {
                    onChange({ inputFormat: undefined });
                  } else {
                    onChange({
                      inputFormat: val,
                      ...(val === 'stream-json' ? { outputFormat: 'stream-json' } : {}),
                    });
                  }
                }}
                className={selectClass}
              >
                {isOverride && <option value="">{t('settings.engines.formatInherit')}</option>}
                <option value="text">{t('settings.engines.formatTextPrompt')}</option>
                <option value="stream-json">{t('settings.engines.formatStreamJsonInput')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                {t('settings.engines.outputFormatLabel')}
              </label>
              <select
                disabled={disabled}
                value={values.outputFormat ?? (isOverride ? '' : 'text')}
                onChange={(e) => {
                  const val = e.target.value as 'text' | 'json' | 'stream-json' | '';
                  onChange({ outputFormat: val === '' ? undefined : val });
                }}
                className={selectClass}
              >
                {isOverride && <option value="">{t('settings.engines.formatInherit')}</option>}
                <option value="text">{t('settings.engines.formatText')}</option>
                <option value="json">{t('settings.engines.formatJson')}</option>
                <option value="stream-json">{t('settings.engines.formatStreamJson')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.jsonSchemaLabel')}
            </label>
            <textarea
              rows={4}
              disabled={disabled}
              value={values.jsonSchema ?? ''}
              onChange={(e) => onChange({ jsonSchema: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.jsonSchemaPlaceholder')
                  : t('settings.engines.jsonSchemaPlaceholder')
              }
              className={textareaClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {t('settings.engines.jsonSchemaHelp')}
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.allowedToolsLabel')}
            </label>
            <input
              type="text"
              disabled={disabled}
              value={values.allowedTools ?? ''}
              onChange={(e) => onChange({ allowedTools: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.customArgsInheritPlaceholder', { example: 'Bash,Edit,GlobTool' })
                  : t('settings.engines.allowedToolsPlaceholder')
              }
              className={inputClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {t('settings.engines.allowedToolsHelp')}
            </p>
          </div>

          <div className="pt-1">
            {isOverride ? (
              <div>
                <label className="text-xs text-[#8b949e] block mb-1">
                  {t('settings.engines.bareMode')}
                </label>
                <select
                  disabled={disabled}
                  value={values.bare === undefined ? '' : String(values.bare)}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({ bare: val === '' ? undefined : val === 'true' });
                  }}
                  className={selectClass}
                >
                  <option value="">{t('settings.engines.bareModeOptionInherit')}</option>
                  <option value="true">{t('settings.engines.bareModeOptionEnable')}</option>
                  <option value="false">{t('settings.engines.bareModeOptionDisable')}</option>
                </select>
              </div>
            ) : (
              <Checkbox
                variant="card"
                disabled={disabled}
                checked={Boolean(values.bare)}
                onChange={(checked) => onChange({ bare: checked })}
                label={t('settings.engines.bareMode')}
                description={t('settings.engines.bareModeDesc')}
              />
            )}
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.maxTurnsLabel')}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              disabled={disabled}
              value={values.maxTurns !== undefined ? values.maxTurns : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onChange({ maxTurns: undefined });
                } else {
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    onChange({ maxTurns: num });
                  }
                }
              }}
              placeholder={
                isOverride
                  ? t('settings.engines.customArgsInheritPlaceholder', { example: '15' })
                  : t('settings.engines.maxTurnsPlaceholder')
              }
              className={inputClass}
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {t('settings.engines.maxTurnsHelp')}
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.engines.customArgs')}
            </label>
            <input
              type="text"
              disabled={disabled}
              value={values.customArgs ?? ''}
              onChange={(e) => onChange({ customArgs: e.target.value })}
              placeholder={
                isOverride
                  ? t('settings.engines.customArgsInheritPlaceholder', { example: '--dangerously-skip-permissions' })
                  : t('settings.engines.customArgsPlaceholder')
              }
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export interface CodexFieldsProps {
  values: Partial<CodexEngineConfig>;
  onChange: (updates: Partial<CodexEngineConfig>) => void;
  disabled?: boolean;
}

export function CodexFields({ values, onChange, disabled = false }: CodexFieldsProps) {
  const { t } = useI18n();
  const inputClass = 'w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">
            {t('settings.engines.engineBinPath', { engine: 'codex' })}
          </label>
          <input required disabled={disabled} className={inputClass} value={values.binPath ?? ''} onChange={(event) => onChange({ binPath: event.target.value })} placeholder={t('settings.engines.binPathPlaceholder')} />
        </div>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">{t('settings.engines.timeoutLabel')}</label>
          <input type="number" min={10} max={3600} disabled={disabled} className={inputClass} value={values.timeoutSeconds ?? 900} onChange={(event) => onChange({ timeoutSeconds: Number(event.target.value) || 900 })} />
        </div>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">{t('settings.engines.modelLabel')}</label>
          <input list="codex-model-suggestions" disabled={disabled} className={inputClass} value={values.model ?? ''} onChange={(event) => onChange({ model: event.target.value })} placeholder="gpt-6-sol" />
          <datalist id="codex-model-suggestions">
            <option value="gpt-6-sol" label={t('settings.engines.modelOptionCodexRecommended')} />
            <option value="gpt-5.3-codex" label={t('settings.engines.modelOptionCodexOptimized')} />
          </datalist>
        </div>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">{t('settings.engines.effortLabel')}</label>
          <input list="codex-effort-suggestions" disabled={disabled} className={inputClass} value={values.effort ?? ''} onChange={(event) => onChange({ effort: event.target.value })} placeholder="high" />
          <datalist id="codex-effort-suggestions"><option value="low" /><option value="medium" /><option value="high" /><option value="xhigh" /><option value="max" /><option value="ultra" /></datalist>
        </div>
        <div>
          <label className="text-xs text-[#8b949e] block mb-1">{t('settings.engines.sandboxModeLabel')}</label>
          <select disabled={disabled} className={inputClass} value={values.sandboxMode ?? 'workspace-write'} onChange={(event) => onChange({ sandboxMode: event.target.value as CodexEngineConfig['sandboxMode'] })}>
            <option value="read-only">read-only</option><option value="workspace-write">workspace-write</option><option value="danger-full-access">danger-full-access</option>
          </select>
        </div>
      </div>
      <Checkbox variant="card" disabled={disabled} checked={values.ephemeral ?? true} onChange={(checked) => onChange({ ephemeral: checked })} label={t('settings.engines.ephemeralLabel')} description={t('settings.engines.ephemeralDesc')} />
      <details className="rounded border border-[#30363d] p-3">
        <summary className="cursor-pointer text-xs text-[#c9d1d9]">{t('settings.engines.advancedSettings')}</summary>
        <div className="mt-3 space-y-4">
          <label className="block text-xs text-[#8b949e]">{t('settings.engines.systemPromptLabel')}
            <textarea rows={3} disabled={disabled} className={`${inputClass} mt-1`} value={values.systemPrompt ?? ''} onChange={(event) => onChange({ systemPrompt: event.target.value })} />
          </label>
          <EngineEnvironmentVariables values={values} onChange={onChange} disabled={disabled} engineLabel="Codex" />
          <label className="block text-xs text-[#8b949e]">{t('settings.engines.customArgs')}
            <input disabled={disabled} className={`${inputClass} mt-1`} value={values.customArgs ?? ''} onChange={(event) => onChange({ customArgs: event.target.value })} />
          </label>
        </div>
      </details>
    </div>
  );
}

export interface MockFieldsProps {
  values: Partial<MockEngineConfig>;
  onChange: (updates: Partial<MockEngineConfig>) => void;
  isOverride?: boolean;
  disabled?: boolean;
}

export function MockFields({
  values,
  onChange,
  isOverride = false,
  disabled = false,
}: MockFieldsProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[#8b949e] block mb-1">
          {t('settings.engines.delayMsLabel')}
        </label>
        <input
          type="number"
          min={0}
          max={60000}
          step={100}
          disabled={disabled}
          value={values.delayMs !== undefined ? values.delayMs : ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange({ delayMs: undefined });
            } else {
              const num = parseInt(raw, 10);
              if (!isNaN(num)) {
                onChange({ delayMs: num });
              }
            }
          }}
          onBlur={() => {
            if (
              !isOverride &&
              (values.delayMs === '' || values.delayMs === undefined || isNaN(Number(values.delayMs)))
            ) {
              onChange({ delayMs: 500 });
            }
          }}
          placeholder={
            isOverride
              ? t('settings.engines.mockDelayInheritPlaceholder')
              : t('settings.engines.mockDelayPlaceholder')
          }
          className={`w-full ${isOverride ? 'bg-[#161b22]' : 'bg-[#0d1117]'} border border-[#30363d] rounded px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#090d13]`}
        />
        <p className="text-[11px] text-[#8b949e] mt-1">
          {t('settings.engines.simulationDelayHelp')}
        </p>
      </div>
    </div>
  );
}

export interface EngineConfigFieldsProps {
  engine: string;
  values: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  isOverride?: boolean;
  disabled?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
}

export function EngineConfigFields({
  engine,
  values,
  onChange,
  isOverride = false,
  disabled = false,
  showAdvanced,
  onToggleAdvanced,
}: EngineConfigFieldsProps) {
  const { t } = useI18n();

  if (engine === 'antigravity') {
    return (
      <AntigravityFields
        values={values}
        onChange={onChange}
        isOverride={isOverride}
        disabled={disabled}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />
    );
  }

  if (engine === 'claudeCode' || engine === 'claude-code') {
    return (
      <ClaudeCodeFields
        values={values}
        onChange={onChange}
        isOverride={isOverride}
        disabled={disabled}
        showAdvanced={showAdvanced}
        onToggleAdvanced={onToggleAdvanced}
      />
    );
  }

  if (engine === 'mock') {
    return (
      <MockFields
        values={values}
        onChange={onChange}
        isOverride={isOverride}
        disabled={disabled}
      />
    );
  }

  if (engine === 'codex') {
    return <CodexFields values={values} onChange={onChange} disabled={disabled} />;
  }

  return (
    <div className="text-xs text-[#8b949e] p-3 rounded bg-[#0d1117] border border-[#30363d]">
      {t('settings.engines.noConfigForEngine', { engine })}
    </div>
  );
}
