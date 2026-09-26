import React, { useState } from 'react';
import {
  Shield,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Terminal,
  Box,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  Power,
  Copy,
} from 'lucide-react';
import { ReviewRule, AppSettings, resolveRuleEngineProfile } from '../../types.ts';
import { Checkbox } from '../../components/Checkbox.tsx';
import {
  SettingCard,
  SettingBadge,
  SettingActionButton,
  SettingButtonGroup,
} from '../../components/settings/SettingCard.tsx';
import {
  SettingViewHeader,
  SettingFormHeader,
  SettingEmptyState,
  SettingFormFooter,
} from '../../components/settings/SettingViewLayout.tsx';
import { useI18n } from '../../i18n/context.tsx';

interface RuleSettingsViewProps {
  rules: ReviewRule[];
  settings?: AppSettings;
  defaultRuleIds?: string[];
  onCreateRule: (rule: Partial<ReviewRule>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<ReviewRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onUpdateDefaultRuleIds?: (ids: string[]) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function RuleSettingsView({
  rules,
  settings,
  defaultRuleIds = [],
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onUpdateDefaultRuleIds,
  onShowSuccess,
  onShowError,
}: RuleSettingsViewProps) {
  const { t } = useI18n();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [expandedInstructionId, setExpandedInstructionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [ruleForm, setRuleForm] = useState<{
    id?: string;
    name: string;
    description: string;
    category: string;
    engine: string;
    instructions: string;
    cancelInProgress: boolean;
    enabled: boolean;
  }>({
    name: '',
    description: '',
    category: 'correctness',
    engine: 'default',
    instructions: '',
    cancelInProgress: true,
    enabled: true,
  });


  const handleOpenCreateRule = () => {
    setRuleForm({
      name: '',
      description: '',
      category: 'correctness',
      engine: 'default',
      instructions: '',
      cancelInProgress: true,
      enabled: true,
    });
    setIsCreatingRule(true);
    setEditingRuleId(null);
    setConfirmDeleteId(null);
  };

  const handleOpenEditRule = (rule: ReviewRule) => {
    const matched = resolveRuleEngineProfile(
      rule.engineProfileId ?? rule.engine,
      settings?.engineProfiles,
      settings?.defaultEngineProfileId,
    );
    const engineValue = !rule.engine || rule.engine === 'default'
      ? 'default'
      : (matched?.id ?? rule.engine);

    setRuleForm({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      engine: engineValue,
      instructions: rule.instructions,
      cancelInProgress: rule.concurrency?.cancelInProgress ?? true,
      enabled: rule.enabled,
    });
    setEditingRuleId(rule.id);
    setIsCreatingRule(false);
    setConfirmDeleteId(null);
  };

  const handleCancelForm = () => {
    setIsCreatingRule(false);
    setEditingRuleId(null);
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const rulePayload: Partial<ReviewRule> = {
        name: ruleForm.name.trim(),
        description: ruleForm.description.trim(),
        category: ruleForm.category,
        engine: ruleForm.engine,
        instructions: ruleForm.instructions.trim(),
        concurrency: {
          cancelInProgress: ruleForm.cancelInProgress,
        },
        enabled: ruleForm.enabled,
      };

      if (editingRuleId) {
        await onUpdateRule(editingRuleId, rulePayload);
        onShowSuccess(t('settings.rules.updatedSuccess', { name: ruleForm.name }));
        setEditingRuleId(null);
      } else {
        await onCreateRule(rulePayload);
        onShowSuccess(t('settings.rules.createdSuccess', { name: ruleForm.name }));
        setIsCreatingRule(false);
      }
    } catch {
      onShowError(t('settings.rules.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await onDeleteRule(id);
      onShowSuccess(t('settings.rules.deletedSuccess', { name }));
      setConfirmDeleteId(null);
    } catch {
      onShowError(t('settings.rules.deleteError'));
    }
  };

  const handleDuplicateRule = async (rule: ReviewRule) => {
    try {
      await onCreateRule({
        name: `${rule.name} (Copy)`,
        description: rule.description,
        category: rule.category,
        engine: rule.engine,
        instructions: rule.instructions,
        trigger: rule.trigger ? { ...rule.trigger } : undefined,
        concurrency: rule.concurrency ? { ...rule.concurrency } : undefined,
        enabled: rule.enabled,
      });
      onShowSuccess(t('settings.rules.duplicatedSuccess', { name: rule.name }));
    } catch {
      onShowError(t('settings.rules.duplicateError'));
    }
  };

  const toggleInstructions = (id: string) => {
    setExpandedInstructionId((prev) => (prev === id ? null : id));
  };

  const isFormMode = isCreatingRule || editingRuleId !== null;
  const defaultEngineProfile = settings?.engineProfiles?.find(
    (profile) => profile.id === settings.defaultEngineProfileId,
  ) ?? settings?.engineProfiles?.find((profile) => profile.isDefault);
  const disabledSelectedProfile = settings?.engineProfiles?.find(
    (profile) => profile.id === ruleForm.engine && profile.enabled === false,
  );

  if (isFormMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingFormHeader
          icon={<Shield className="w-5 h-5" />}
          backLabel={t('settings.rules.backToList')}
          onBack={handleCancelForm}
          title={editingRuleId ? t('settings.rules.editRuleTitle') : t('settings.rules.createRuleTitle')}
          description={
            editingRuleId
              ? t('settings.rules.editRuleDesc', { name: ruleForm.name || 'Rule' })
              : t('settings.rules.createRuleDesc')
          }
        />

        {/* Rule Form */}
        <form
          onSubmit={handleSubmitRule}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">{t('settings.rules.nameLabel')}</label>
              <input
                type="text"
                required
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder={t('settings.rules.namePlaceholder')}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">{t('settings.rules.categoryLabel')}</label>
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="correctness">{t('settings.rules.categoryCorrectness')}</option>
                <option value="security">{t('settings.rules.categorySecurity')}</option>
                <option value="architecture">{t('settings.rules.categoryArchitecture')}</option>
                <option value="performance">{t('settings.rules.categoryPerformance')}</option>
                <option value="general">{t('settings.rules.categoryGeneral')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">{t('settings.rules.descriptionLabel')}</label>
            <input
              type="text"
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              placeholder={t('settings.rules.descriptionPlaceholder')}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">
              {t('settings.rules.instructionsLabel')}
            </label>
            <textarea
              required
              rows={6}
              value={ruleForm.instructions}
              onChange={(e) => setRuleForm({ ...ruleForm, instructions: e.target.value })}
              placeholder={t('settings.rules.instructionsPlaceholder')}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-[#8b949e] mt-1">
              {t('settings.rules.instructionsHelp')}
            </p>
          </div>

          <div>
            <label className="text-xs text-[#8b949e] block mb-1">{t('settings.rules.profileLabel')}</label>
            <select
              value={ruleForm.engine}
              onChange={(e) => setRuleForm({ ...ruleForm, engine: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="default">
                {t('settings.rules.systemDefaultProfile', { name: defaultEngineProfile?.name ?? t('settings.engines.modelUnspecified') })}
              </option>

              {disabledSelectedProfile && (
                <option value={disabledSelectedProfile.id} disabled>
                  {t('settings.rules.disabledProfileSuffix', { name: disabledSelectedProfile.name })}
                </option>
              )}

              {settings?.engineProfiles?.filter((profile) => profile.enabled !== false).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            {(!settings?.engineProfiles || settings.engineProfiles.length === 0) && (
              <p className="text-[11px] text-amber-400/80 mt-1">
                {t('settings.rules.noProfilesWarning', { engine: settings?.reviewEngine ?? t('settings.engines.modelUnspecified') })}
              </p>
            )}
          </div>

          <SettingFormFooter
            onCancel={handleCancelForm}
            submitLabel={t('settings.rules.saveRuleBtn')}
            saving={saving}
            leftContent={
              <div className="flex items-center gap-6">
                <Checkbox
                  checked={ruleForm.enabled}
                  onChange={(checked) => setRuleForm({ ...ruleForm, enabled: checked })}
                  label={t('settings.rules.enableRuleLabel')}
                />

                <Checkbox
                  checked={ruleForm.cancelInProgress}
                  onChange={(checked) =>
                    setRuleForm({ ...ruleForm, cancelInProgress: checked })
                  }
                  label={t('settings.rules.cancelOnNewCommitLabel')}
                />
              </div>
            }
          />
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SettingViewHeader
        icon={<Shield className="w-5 h-5" />}
        title={t('settings.rules.title')}
        description={t('settings.rules.description')}
        action={{
          label: t('settings.rules.addRuleBtn'),
          onClick: handleOpenCreateRule,
        }}
      />

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <SettingEmptyState
            icon={<Shield className="w-8 h-8" />}
            message={t('settings.rules.noRulesMessage')}
            description={t('settings.rules.noRulesDesc')}
            action={{
              label: t('settings.rules.createFirstRule'),
              onClick: handleOpenCreateRule,
            }}
          />
        ) : (
          rules.map((rule) => {
            const isDefault = defaultRuleIds.includes(rule.id);
            const isExpanded = expandedInstructionId === rule.id;
            const isConfirmingDelete = confirmDeleteId === rule.id;

            return (
              <SettingCard
                key={rule.id}
                className="overflow-hidden"
                isDefault={isDefault}
                disabled={!rule.enabled}
                title={rule.name}
                badges={
                  <>
                    <SettingBadge variant="primary">{rule.category}</SettingBadge>

                    {(() => {
                      const matchedProfile = resolveRuleEngineProfile(
                        rule.engineProfileId ?? rule.engine,
                        settings?.engineProfiles,
                        settings?.defaultEngineProfileId,
                      );
                      const isSystemDefault = !rule.engine || rule.engine === 'default';
                      const label = isSystemDefault
                        ? t('settings.rules.systemDefaultProfile', { name: matchedProfile?.name ?? t('settings.engines.modelUnspecified') })
                        : (matchedProfile?.name ?? rule.engine);
                      const engineType = matchedProfile?.engineType;
                      return (
                        <SettingBadge
                          variant="neutral"
                          icon={
                            engineType === 'claude-code' ? (
                              <Terminal className="w-3 h-3" />
                            ) : engineType === 'antigravity' ? (
                              <Cpu className="w-3 h-3" />
                            ) : (
                              <Box className="w-3 h-3" />
                            )
                          }
                        >
                          {t('settings.rules.profileBadge', { name: label })}
                        </SettingBadge>
                      );
                    })()}

                    {(() => {
                      const profile = resolveRuleEngineProfile(
                        rule.engineProfileId ?? rule.engine,
                        settings?.engineProfiles,
                        settings?.defaultEngineProfileId,
                      );
                      return profile && settings?.enabledEngines && !settings.enabledEngines.includes(profile.engineType);
                    })() && (
                      <SettingBadge variant="warning" icon={<AlertCircle className="w-3 h-3" />}>
                        {t('settings.rules.engineDisabledBadge')}
                      </SettingBadge>
                    )}

                    {isDefault && (
                      <SettingBadge variant="default" icon={<CheckCircle2 className="w-3 h-3" />}>
                        {t('settings.rules.defaultBadge')}
                      </SettingBadge>
                    )}

                    {!rule.enabled && (
                      <SettingBadge variant="muted" icon={<Ban className="w-3 h-3" />}>
                        {t('settings.rules.disabledBadge')}
                      </SettingBadge>
                    )}
                  </>
                }
                description={rule.description}
                metadata={
                  rule.concurrency?.cancelInProgress ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                      <Clock className="w-3 h-3" />
                      <span>{t('settings.rules.cancelBadge')}</span>
                    </div>
                  ) : undefined
                }
                actions={
                  <>
                    {/* 状態・トグル系グループ */}
                    <SettingButtonGroup>
                      {/* 1. 既定トグル */}
                      {onUpdateDefaultRuleIds && (
                        <SettingActionButton
                          active={isDefault}
                          onClick={() => {
                            const next = isDefault
                              ? defaultRuleIds.filter((id) => id !== rule.id)
                              : [...defaultRuleIds, rule.id];
                            onUpdateDefaultRuleIds(next);
                          }}
                          title={isDefault ? t('settings.rules.removeFromDefaultTooltip') : t('settings.rules.addToDefaultTooltip')}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isDefault ? 'fill-emerald-400/20' : ''}`} />
                        </SettingActionButton>
                      )}

                      {/* 2. 有効/無効トグル */}
                      <SettingActionButton
                        active={rule.enabled}
                        onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                        title={rule.enabled ? t('settings.rules.disableRuleTooltip') : t('settings.rules.enableRuleTooltip')}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </SettingActionButton>
                    </SettingButtonGroup>

                    {/* 管理操作系グループ */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                        <span className="text-[11px] text-rose-300 px-1">{t('settings.rules.confirmDelete', { name: rule.name })}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id, rule.name)}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          {t('common.delete')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 rounded text-[#8b949e] hover:text-white text-[11px] cursor-pointer"
                        >
                          {t('common.back')}
                        </button>
                      </div>
                    ) : (
                      <SettingButtonGroup>
                        <SettingActionButton onClick={() => handleOpenEditRule(rule)} title={t('settings.rules.editRuleTooltip')}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </SettingActionButton>
                        <SettingActionButton onClick={() => handleDuplicateRule(rule)} title={t('settings.rules.duplicateRuleTooltip')}>
                          <Copy className="w-3.5 h-3.5" />
                        </SettingActionButton>
                        <SettingActionButton
                          danger
                          onClick={() => setConfirmDeleteId(rule.id)}
                          title={t('settings.rules.deleteRuleTooltip')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </SettingActionButton>
                      </SettingButtonGroup>
                    )}
                  </>
                }
              >
                <button
                  type="button"
                  onClick={() => toggleInstructions(rule.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`rule-instructions-${rule.id}`}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 border-t border-[#30363d]/60 text-left text-xs text-[#8b949e] hover:text-white hover:bg-[#21262d]/60 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 focus-visible:outline-offset-[-2px]"
                >
                  <span>{isExpanded ? t('settings.rules.hideInstructions') : t('settings.rules.showInstructions')}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
                <div
                  id={`rule-instructions-${rule.id}`}
                  hidden={!isExpanded}
                  className="px-5 py-4 bg-[#0d1117] border-t border-[#30363d] space-y-2"
                >
                  <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider block">
                    {t('settings.rules.instructionsHeader')}
                  </span>
                  <pre className="text-xs text-white/90 font-mono whitespace-pre-wrap leading-relaxed bg-[#161b22] p-3 rounded-lg border border-[#30363d]/60">
                    {rule.instructions}
                  </pre>
                </div>
              </SettingCard>
            );
          })
        )}
      </div>
    </div>
  );
}
