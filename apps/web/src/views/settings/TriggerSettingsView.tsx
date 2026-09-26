import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  Save,
  ArrowLeft,
  FolderGit2,
  FileCode,
  Shield,
  CheckCircle2,
  Ban,
  CheckSquare,
  Square,
  Sparkles,
  Power,
  Copy,
} from 'lucide-react';
import { AppSettings, ReviewTrigger, ReviewRule, resolveRuleEngineProfile } from '../../types.ts';
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

interface TriggerSettingsViewProps {
  triggers: ReviewTrigger[];
  rules: ReviewRule[];
  settings: AppSettings;
  knownRepositories: string[];
  onCreateTrigger: (trigger: Partial<ReviewTrigger>) => Promise<void>;
  onUpdateTrigger: (id: string, updates: Partial<ReviewTrigger>) => Promise<void>;
  onDeleteTrigger: (id: string) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function TriggerSettingsView({
  triggers,
  rules,
  settings,
  knownRepositories,
  onCreateTrigger,
  onUpdateTrigger,
  onDeleteTrigger,
  onShowSuccess,
  onShowError,
}: TriggerSettingsViewProps) {
  const { t } = useI18n();
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [triggerForm, setTriggerForm] = useState<{
    id?: string;
    name: string;
    repository: string;
    paths: string;
    pathsIgnore: string;
    ruleIds: string[];
    enabled: boolean;
  }>({
    name: '',
    repository: '',
    paths: '',
    pathsIgnore: '',
    ruleIds: [],
    enabled: true,
  });

  const handleOpenCreateTrigger = () => {
    setTriggerForm({
      name: '',
      repository: knownRepositories[0] || '*',
      paths: '',
      pathsIgnore: '',
      ruleIds: rules.filter((r) => r.enabled).slice(0, 1).map((r) => r.id),
      enabled: true,
    });
    setIsCreatingTrigger(true);
    setEditingTriggerId(null);
    setConfirmDeleteId(null);
  };

  const handleOpenEditTrigger = (trigger: ReviewTrigger) => {
    setTriggerForm({
      id: trigger.id,
      name: trigger.name,
      repository: trigger.repository,
      paths: trigger.paths ? trigger.paths.join(', ') : '',
      pathsIgnore: trigger.pathsIgnore ? trigger.pathsIgnore.join(', ') : '',
      ruleIds: trigger.ruleIds || [],
      enabled: trigger.enabled,
    });
    setEditingTriggerId(trigger.id);
    setIsCreatingTrigger(false);
    setConfirmDeleteId(null);
  };

  const handleCancelForm = () => {
    setIsCreatingTrigger(false);
    setEditingTriggerId(null);
  };

  const handleToggleRule = (ruleId: string) => {
    setTriggerForm((prev) => {
      const exists = prev.ruleIds.includes(ruleId);
      const next = exists
        ? prev.ruleIds.filter((id) => id !== ruleId)
        : [...prev.ruleIds, ruleId];
      return { ...prev, ruleIds: next };
    });
  };

  const handleSelectAllRules = () => {
    setTriggerForm((prev) => ({
      ...prev,
      ruleIds: rules.map((r) => r.id),
    }));
  };

  const handleClearRuleSelection = () => {
    setTriggerForm((prev) => ({
      ...prev,
      ruleIds: [],
    }));
  };

  const handleSubmitTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (triggerForm.ruleIds.length === 0) {
      onShowError(t('settings.triggers.requireRuleError'));
      return;
    }

    setSaving(true);
    try {
      const pathsArray = triggerForm.paths
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const pathsIgnoreArray = triggerForm.pathsIgnore
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const payload: Partial<ReviewTrigger> = {
        name: triggerForm.name.trim(),
        repository: triggerForm.repository.trim() || '*',
        paths: pathsArray.length > 0 ? pathsArray : undefined,
        pathsIgnore: pathsIgnoreArray.length > 0 ? pathsIgnoreArray : undefined,
        ruleIds: triggerForm.ruleIds,
        enabled: triggerForm.enabled,
      };

      if (editingTriggerId) {
        await onUpdateTrigger(editingTriggerId, payload);
        onShowSuccess(t('settings.triggers.updatedSuccess', { name: triggerForm.name }));
        setEditingTriggerId(null);
      } else {
        await onCreateTrigger(payload);
        onShowSuccess(t('settings.triggers.createdSuccess', { name: triggerForm.name }));
        setIsCreatingTrigger(false);
      }
    } catch {
      onShowError(t('settings.triggers.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await onDeleteTrigger(id);
      onShowSuccess(t('settings.triggers.deletedSuccess', { name }));
      setConfirmDeleteId(null);
    } catch {
      onShowError(t('settings.triggers.deleteError'));
    }
  };

  const handleDuplicateTrigger = async (trigger: ReviewTrigger) => {
    try {
      await onCreateTrigger({
        name: `${trigger.name} (Copy)`,
        repository: trigger.repository,
        paths: trigger.paths ? [...trigger.paths] : undefined,
        pathsIgnore: trigger.pathsIgnore ? [...trigger.pathsIgnore] : undefined,
        ruleIds: trigger.ruleIds ? [...trigger.ruleIds] : [],
        enabled: trigger.enabled,
      });
      onShowSuccess(t('settings.triggers.duplicatedSuccess', { name: trigger.name }));
    } catch {
      onShowError(t('settings.triggers.duplicateError'));
    }
  };

  const isFormMode = isCreatingTrigger || editingTriggerId !== null;

  if (isFormMode) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SettingFormHeader
          icon={<Zap className="w-5 h-5" />}
          backLabel={t('settings.triggers.backToList')}
          onBack={handleCancelForm}
          title={editingTriggerId ? t('settings.triggers.editTriggerTitle') : t('settings.triggers.createTriggerTitle')}
          description={t('settings.triggers.formDesc')}
        />

        <form
          onSubmit={handleSubmitTrigger}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">{t('settings.triggers.nameLabel')}</label>
              <input
                type="text"
                required
                value={triggerForm.name}
                onChange={(e) => setTriggerForm({ ...triggerForm, name: e.target.value })}
                placeholder={t('settings.triggers.namePlaceholder')}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">{t('settings.triggers.repoLabel')}</label>
              <input
                type="text"
                required
                list="trigger-known-repos"
                value={triggerForm.repository}
                onChange={(e) => setTriggerForm({ ...triggerForm, repository: e.target.value })}
                placeholder={t('settings.triggers.repoPlaceholder')}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <datalist id="trigger-known-repos">
                <option value="*" label={t('settings.triggers.allReposOption')} />
                {knownRepositories.map((repo) => (
                  <option key={repo} value={repo} />
                ))}
              </datalist>
              <span className="text-[11px] text-[#8b949e] mt-1 block">
                {t('settings.triggers.repoHelp')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                {t('settings.triggers.pathsLabel')}
              </label>
              <input
                type="text"
                value={triggerForm.paths}
                onChange={(e) => setTriggerForm({ ...triggerForm, paths: e.target.value })}
                placeholder={t('settings.triggers.pathsPlaceholder')}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-[#8b949e] mt-1 block">
                {t('settings.triggers.pathsHelp')}
              </span>
            </div>

            <div>
              <label className="text-xs text-[#8b949e] block mb-1">
                {t('settings.triggers.ignorePathsLabel')}
              </label>
              <input
                type="text"
                value={triggerForm.pathsIgnore}
                onChange={(e) => setTriggerForm({ ...triggerForm, pathsIgnore: e.target.value })}
                placeholder={t('settings.triggers.ignorePathsPlaceholder')}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-[#8b949e] mt-1 block">
                {t('settings.triggers.ignorePathsHelp')}
              </span>
            </div>
          </div>

          {/* Rules Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
              <div>
                <label className="text-xs font-semibold text-white block">
                  {t('settings.triggers.rulesToTriggerLabel')}
                </label>
                <p className="text-[11px] text-[#8b949e]">
                  {t('settings.triggers.rulesToTriggerHelp')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllRules}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('settings.triggers.selectAll')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearRuleSelection}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors"
                >
                  <Square className="w-3.5 h-3.5 text-[#8b949e]" />
                  <span>{t('settings.triggers.deselectAll')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {rules.map((rule) => {
                const isSelected = triggerForm.ruleIds.includes(rule.id);
                return (
                  <div
                    key={rule.id}
                    onClick={() => handleToggleRule(rule.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-sky-950/30 border-sky-800/80 text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-sky-400">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8b949e]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#c9d1d9]'}`}>
                          {rule.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161b22] text-sky-400 border border-sky-800/40">
                          {rule.category}
                        </span>
                        {(() => {
                          const matched = resolveRuleEngineProfile(
                            rule.engineProfileId ?? rule.engine,
                            settings.engineProfiles,
                            settings.defaultEngineProfileId,
                          );
                          const isSystemDefault = !rule.engine || rule.engine === 'default';
                          const profileName = isSystemDefault
                            ? t('settings.rules.systemDefaultProfile', { name: matched?.name ?? t('settings.engines.modelUnspecified') })
                            : (matched?.name ?? rule.engine);
                          return (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#21262d] text-[#8b949e] font-mono">
                              {t('settings.rules.profileBadge', { name: profileName })}
                            </span>
                          );
                        })()}
                        {!rule.enabled && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                            {t('settings.rules.disabledBadge')}
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-[#8b949e] line-clamp-1">{rule.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-sky-400/90 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('settings.triggers.selectedRulesCount', { count: triggerForm.ruleIds.length })}</span>
            </div>
          </div>

          <SettingFormFooter
            onCancel={handleCancelForm}
            submitLabel={t('settings.triggers.saveTriggerBtn')}
            saving={saving}
            leftContent={
              <Checkbox
                checked={triggerForm.enabled}
                onChange={(checked) => setTriggerForm({ ...triggerForm, enabled: checked })}
                label={t('settings.triggers.enableTriggerLabel')}
              />
            }
          />
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SettingViewHeader
        icon={<Zap className="w-5 h-5" />}
        title={t('settings.triggers.title')}
        description={t('settings.triggers.description')}
        action={{
          label: t('settings.triggers.addTriggerBtn'),
          onClick: handleOpenCreateTrigger,
        }}
      />

      {/* Triggers List */}
      <div className="space-y-3">
        {triggers.length === 0 ? (
          <SettingEmptyState
            icon={<Zap className="w-8 h-8" />}
            message={t('settings.triggers.noTriggersMessage')}
            description={t('settings.triggers.noTriggersDesc')}
            action={{
              label: t('settings.triggers.createFirstTrigger'),
              onClick: handleOpenCreateTrigger,
            }}
          />
        ) : (
          triggers.map((trigger) => {
            const isConfirmingDelete = confirmDeleteId === trigger.id;
            const boundRules = rules.filter((r) => trigger.ruleIds?.includes(r.id));

            return (
              <SettingCard
                key={trigger.id}
                disabled={!trigger.enabled}
                title={trigger.name}
                badges={
                  !trigger.enabled ? (
                    <SettingBadge variant="muted" icon={<Ban className="w-3 h-3" />}>
                      {t('settings.triggers.disabledBadge')}
                    </SettingBadge>
                  ) : undefined
                }
                metadata={
                  <>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-sky-400">
                      <FolderGit2 className="w-3.5 h-3.5" />
                      <span>{t('settings.triggers.repoBadge', { repo: trigger.repository === '*' ? t('settings.triggers.allReposOption') : trigger.repository })}</span>
                    </div>

                    {trigger.paths && trigger.paths.length > 0 ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-teal-400">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{t('settings.triggers.pathsBadge', { paths: trigger.paths.join(', ') })}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{t('settings.triggers.allFilesBadge')}</span>
                      </div>
                    )}

                    {trigger.pathsIgnore && trigger.pathsIgnore.length > 0 && (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400/80">
                        <span>{t('settings.triggers.ignoreBadge', { paths: trigger.pathsIgnore.join(', ') })}</span>
                      </div>
                    )}
                  </>
                }
                actions={
                  <>
                    {/* 状態・トグル系グループ */}
                    <SettingButtonGroup>
                      <SettingActionButton
                        active={trigger.enabled}
                        onClick={() => onUpdateTrigger(trigger.id, { enabled: !trigger.enabled })}
                        title={trigger.enabled ? t('settings.triggers.disableTriggerTooltip') : t('settings.triggers.enableTriggerTooltip')}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </SettingActionButton>
                    </SettingButtonGroup>

                    {/* 管理操作系グループ */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-800/80 rounded-lg p-1">
                        <span className="text-[11px] text-rose-300 px-1">{t('settings.triggers.confirmDelete', { name: trigger.name })}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(trigger.id, trigger.name)}
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
                        <SettingActionButton
                          onClick={() => handleOpenEditTrigger(trigger)}
                          title={t('settings.triggers.editTriggerTooltip')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </SettingActionButton>
                        <SettingActionButton
                          onClick={() => handleDuplicateTrigger(trigger)}
                          title={t('settings.triggers.duplicateTriggerTooltip')}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </SettingActionButton>
                        <SettingActionButton
                          danger
                          onClick={() => setConfirmDeleteId(trigger.id)}
                          title={t('settings.triggers.deleteTriggerTooltip')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </SettingActionButton>
                      </SettingButtonGroup>
                    )}
                  </>
                }
              >
                <div className="border-t border-[#30363d]/60 px-4 sm:px-5 py-3 bg-[#0d1117]/30">
                  <div className="text-[11px] text-[#8b949e] mb-1.5 font-medium">{t('settings.triggers.boundRulesHeader', { count: boundRules.length })}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {boundRules.map((r) => (
                      <SettingBadge
                        key={r.id}
                        variant="primary"
                        icon={<Shield className="w-3 h-3 text-sky-400" />}
                      >
                        {r.name}
                      </SettingBadge>
                    ))}
                    {boundRules.length === 0 && (
                      <span className="text-xs text-amber-400/80">{t('settings.triggers.noBoundRules')}</span>
                    )}
                  </div>
                </div>
              </SettingCard>
            );
          })
        )}
      </div>
    </div>
  );
}
