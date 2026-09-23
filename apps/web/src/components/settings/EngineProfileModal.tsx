import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Terminal,
  Box,
  Save,
  FlaskConical,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  EngineProfile,
  EngineType,
  ClaudeCodeEngineConfig,
  AntigravityEngineConfig,
  MockEngineConfig,
} from '../../types.ts';
import {
  AntigravityFields,
  ClaudeCodeFields,
  MockFields,
} from './EngineConfigFields.tsx';

interface EngineProfileModalProps {
  isOpen: boolean;
  profile: EngineProfile | null;
  existingProfiles: EngineProfile[];
  onClose: () => void;
  onSave: (profile: EngineProfile) => Promise<void>;
  onShowSuccess: (msg: string) => void;
  onShowError: (msg: string) => void;
}

export function EngineProfileModal({
  isOpen,
  profile,
  existingProfiles,
  onClose,
  onSave,
  onShowSuccess,
  onShowError,
}: EngineProfileModalProps) {
  const isNew = !profile;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [engineType, setEngineType] = useState<EngineType>('claude-code');

  const [claudeConfig, setClaudeConfig] = useState<ClaudeCodeEngineConfig>({
    binPath: 'claude',
    model: 'ornith-1.5:9b',
    effort: 'high',
    timeoutSeconds: 900,
    allowedTools: '',
    bare: false,
    apiBaseUrl: 'http://localhost:11434',
    authToken: '',
    maxTurns: 15,
  });

  const [antigravityConfig, setAntigravityConfig] = useState<AntigravityEngineConfig>({
    binPath: 'agy',
    model: 'gemini-3.1-pro',
    effort: 'high',
    timeoutSeconds: 900,
    printTimeout: '',
    sandbox: false,
    disableSlashCommands: false,
  });

  const [mockConfig, setMockConfig] = useState<MockEngineConfig>({
    delayMs: 500,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    mode?: 'version' | 'execution';
    version?: string;
    output?: string;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTestResult(null);
      return;
    }

    if (profile) {
      setName(profile.name);
      setDescription(profile.description ?? '');
      setIsDefault(Boolean(profile.isDefault));
      setEngineType(profile.engineType);

      if (profile.engineType === 'claude-code') {
        setClaudeConfig({ ...profile.config });
      } else if (profile.engineType === 'antigravity') {
        setAntigravityConfig({ ...profile.config });
      } else if (profile.engineType === 'mock') {
        setMockConfig({ ...profile.config });
      }
    } else {
      setName('');
      setDescription('');
      setIsDefault(existingProfiles.length === 0);
      setEngineType('claude-code');
      setClaudeConfig({
        binPath: 'claude',
        model: 'ornith-1.5:9b',
        effort: 'high',
        timeoutSeconds: 900,
        allowedTools: '',
        bare: false,
        apiBaseUrl: 'http://localhost:11434',
        authToken: '',
        maxTurns: 15,
      });
      setAntigravityConfig({
        binPath: 'agy',
        model: 'gemini-3.1-pro',
        effort: 'high',
        timeoutSeconds: 900,
        printTimeout: '',
        sandbox: false,
        disableSlashCommands: false,
      });
      setMockConfig({ delayMs: 500 });
    }
  }, [isOpen, profile, existingProfiles.length]);

  if (!isOpen) return null;

  const handleTest = async (mode: 'version' | 'execution') => {
    setIsTesting(true);
    setTestResult(null);
    try {
      let binPath: string | undefined;
      let model: string | undefined;
      let effort: string | undefined;
      let apiBaseUrl: string | undefined;
      let authToken: string | undefined;

      if (engineType === 'claude-code') {
        binPath = claudeConfig.binPath;
        model = claudeConfig.model;
        effort = claudeConfig.effort;
        apiBaseUrl = claudeConfig.apiBaseUrl;
        authToken = claudeConfig.authToken;
      } else if (engineType === 'antigravity') {
        binPath = antigravityConfig.binPath;
        model = antigravityConfig.model;
        effort = antigravityConfig.effort;
      }

      const res = await fetch(`/api/engines/${engineType}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, binPath, model, effort, apiBaseUrl, authToken }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        onShowSuccess(data.message || '接続テストに成功しました');
      } else {
        onShowError(data.error || 'テストに失敗しました');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'テスト実行エラー';
      setTestResult({ success: false, mode, error: errorMsg });
      onShowError(errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowError('プロファイル名を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const id = profile ? profile.id : `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      let savedProfile: EngineProfile;

      if (engineType === 'claude-code') {
        savedProfile = {
          id,
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
          engineType: 'claude-code',
          config: {
            ...claudeConfig,
            timeoutSeconds: Number(claudeConfig.timeoutSeconds) || 900,
            maxTurns: claudeConfig.maxTurns ? Number(claudeConfig.maxTurns) : undefined,
          },
          createdAt: profile?.createdAt ?? now,
          updatedAt: now,
        };
      } else if (engineType === 'antigravity') {
        savedProfile = {
          id,
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
          engineType: 'antigravity',
          config: {
            ...antigravityConfig,
            timeoutSeconds: Number(antigravityConfig.timeoutSeconds) || 900,
          },
          createdAt: profile?.createdAt ?? now,
          updatedAt: now,
        };
      } else {
        savedProfile = {
          id,
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
          engineType: 'mock',
          config: {
            delayMs: Number(mockConfig.delayMs) >= 0 ? Number(mockConfig.delayMs) : 500,
          },
          createdAt: profile?.createdAt ?? now,
          updatedAt: now,
        };
      }

      await onSave(savedProfile);
      onShowSuccess(`プロファイル「${savedProfile.name}」を保存しました`);
      onClose();
    } catch {
      onShowError('プロファイルの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">
              {isNew ? '新規エンジンプロファイルを追加' : 'エンジンプロファイルを編集'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#8b949e] block mb-1">
                プロファイル名 *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: Ollama (ornith-1.5:9b), Claude 3.7 Cloud, Fast Haiku"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#8b949e] block mb-1">
                説明 (任意)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: ローカル RTX 5080 で高速実行する Ollama 推論プロファイル"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* エンジン種別選択 (新規作成時) */}
            <div>
              <label className="text-xs font-semibold text-[#8b949e] block mb-1.5">
                エンジン種別
              </label>
              {isNew ? (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEngineType('claude-code')}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                      engineType === 'claude-code'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">Claude Code</div>
                      <div className="text-[10px] text-[#8b949e]">Ollama / Claude CLI</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEngineType('antigravity')}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                      engineType === 'antigravity'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">Antigravity</div>
                      <div className="text-[10px] text-[#8b949e]">Google agy CLI</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEngineType('mock')}
                    className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                      engineType === 'mock'
                        ? 'border-sky-500 bg-sky-950/40 text-white ring-1 ring-sky-500'
                        : 'border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    <Box className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">Mock</div>
                      <div className="text-[10px] text-[#8b949e]">テスト用ダミー</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-sky-400 font-mono">
                  {engineType === 'claude-code' && <Terminal className="w-3.5 h-3.5" />}
                  {engineType === 'antigravity' && <Cpu className="w-3.5 h-3.5" />}
                  {engineType === 'mock' && <Box className="w-3.5 h-3.5" />}
                  <span>{engineType}</span>
                </div>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c9d1d9]">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded bg-[#0d1117] border-[#30363d] text-sky-500 focus:ring-sky-500/30"
                />
                <span>システム既定のプロファイルとして使用する</span>
              </label>
            </div>
          </div>

          <div className="border-t border-[#30363d] pt-5">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>動作パラメータ設定</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTest('version')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded border border-[#30363d] transition-colors disabled:opacity-50"
                  title="CLIバイナリとバージョンの高速検証"
                >
                  {isTesting ? <RefreshCw className="w-3 h-3 animate-spin text-sky-400" /> : <FlaskConical className="w-3 h-3 text-sky-400" />}
                  <span>接続テスト</span>
                </button>
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTest('execution')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-emerald-400 rounded border border-[#30363d] transition-colors disabled:opacity-50"
                  title="テストプロンプトによる推論実行検証"
                >
                  <Play className="w-3 h-3" />
                  <span>推論テスト</span>
                </button>
              </div>
            </h4>

            {testResult && (
              <div
                className={`mb-4 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/30 border-red-800/50 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold">
                    {testResult.success ? 'テスト成功' : 'テスト失敗'}
                    {testResult.version && ` (${testResult.version})`}
                  </div>
                  <div>{testResult.message || testResult.error}</div>
                  {testResult.output && (
                    <pre className="font-mono text-[11px] bg-black/40 p-2 rounded mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {testResult.output}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {engineType === 'claude-code' && (
              <ClaudeCodeFields
                values={claudeConfig}
                onChange={(updates) => setClaudeConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}

            {engineType === 'antigravity' && (
              <AntigravityFields
                values={antigravityConfig}
                onChange={(updates) => setAntigravityConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}

            {engineType === 'mock' && (
              <MockFields
                values={mockConfig}
                onChange={(updates) => setMockConfig((prev) => ({ ...prev, ...updates }))}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '保存中...' : 'プロファイルを保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
