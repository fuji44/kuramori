import React from 'react';
import { ArrowDown, AlertCircle, Sparkles, RefreshCw, CircleDot } from 'lucide-react';
import type { CallFlow, CallFlowStep } from '@kuramori/core';

interface ReviewStepFlowProps {
  callFlow?: CallFlow;
  onSelectComment?: (commentId: string) => void;
}

export const ReviewStepFlow: React.FC<ReviewStepFlowProps> = ({
  callFlow,
  onSelectComment,
}) => {
  if (!callFlow || !callFlow.steps || callFlow.steps.length === 0) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center text-gray-400 text-sm">
        処理シーケンス / ステップフロー情報はありません。
      </div>
    );
  }

  const getStatusStyle = (status: CallFlowStep['status']) => {
    switch (status) {
      case 'modified':
        return {
          icon: <RefreshCw className="w-4 h-4 text-amber-400" />,
          badge: 'MODIFIED',
          badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          borderClass: 'border-amber-500/40',
        };
      case 'added':
        return {
          icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
          badge: 'ADDED',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          borderClass: 'border-emerald-500/40',
        };
      case 'affected':
        return {
          icon: <AlertCircle className="w-4 h-4 text-indigo-400" />,
          badge: 'AFFECTED',
          badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          borderClass: 'border-indigo-500/40',
        };
      case 'unchanged':
      default:
        return {
          icon: <CircleDot className="w-4 h-4 text-gray-500" />,
          badge: 'UNCHANGED',
          badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
          borderClass: 'border-gray-700/50',
        };
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#30363d]">
        <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <ArrowDown className="w-5 h-5 text-indigo-400" />
          処理シーケンス / ステップフロー ({callFlow.steps.length} ステップ)
        </h3>
        <span className="text-xs text-gray-400">変更点と影響箇所を上から順に可視化</span>
      </div>

      <div className="relative border-l-2 border-[#30363d] ml-4 pl-6 space-y-6">
        {callFlow.steps.map((step, idx) => {
          const style = getStatusStyle(step.status);
          return (
            <div key={idx} className="relative group">
              {/* ステップアイコンノード */}
              <div className="absolute -left-[35px] top-1 w-8 h-8 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center shadow">
                {style.icon}
              </div>

              {/* カード本体 */}
              <div className={`bg-[#0d1117] border ${style.borderClass} rounded-xl p-4 shadow-sm transition-all hover:border-gray-500`}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-400">
                      Step {step.step}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-200">{step.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${style.badgeClass}`}>
                      {style.badge}
                    </span>

                    {step.commentId && (
                      <button
                        type="button"
                        onClick={() => onSelectComment?.(step.commentId!)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded hover:bg-indigo-500/20 transition-colors"
                      >
                        指摘 {step.commentId} を表示
                      </button>
                    )}
                  </div>
                </div>

                {step.description && (
                  <p className="text-xs text-gray-300 leading-relaxed mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
