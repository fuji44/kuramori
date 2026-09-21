import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronRight, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import type { ReviewTransparency } from '@review-base/core';

interface ReviewTransparencyCardProps {
  transparency?: ReviewTransparency;
}

export const ReviewTransparencyCard: React.FC<ReviewTransparencyCardProps> = ({
  transparency,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  if (!transparency) return null;

  const hasSpecs =
    (transparency.referencedSpecs && transparency.referencedSpecs.length > 0) ||
    (transparency.unreferencedSpecs && transparency.unreferencedSpecs.length > 0);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 shadow-sm space-y-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-200">
            相互検証の透明性 (Transparency)
          </h3>
          {transparency.rawFindingCount !== undefined && transparency.aggregatedCount !== undefined && (
            <span className="text-xs text-gray-400 font-mono">
              (一次指摘: {transparency.rawFindingCount}件 → 集約後: {transparency.aggregatedCount}件)
            </span>
          )}
        </div>
        <div className="text-gray-400">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {!collapsed && (
        <div className="space-y-3 pt-2 border-t border-[#30363d]/60 text-xs">
          {/* 参照した仕様ソース */}
          {transparency.referencedSpecs && transparency.referencedSpecs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                参照した仕様ソース
              </h4>
              <div className="space-y-1">
                {transparency.referencedSpecs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0d1117] p-2 rounded border border-[#30363d]/60 flex items-center justify-between"
                  >
                    <span className="text-gray-200">{spec.name}</span>
                    <div className="flex items-center gap-2">
                      {spec.via && <span className="text-gray-500 font-mono">via {spec.via}</span>}
                      {spec.url && (
                        <a
                          href={spec.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          開く <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 参照できなかった仕様ソース */}
          {transparency.unreferencedSpecs && transparency.unreferencedSpecs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                参照できなかった仕様ソース
              </h4>
              <div className="space-y-1">
                {transparency.unreferencedSpecs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0d1117] p-2 rounded border border-[#30363d]/60 flex items-center justify-between"
                  >
                    <span className="text-gray-300">{spec.name}</span>
                    <span className="text-gray-500">{spec.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
