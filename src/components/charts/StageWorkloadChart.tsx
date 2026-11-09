import React from 'react';
import { ProductionStageSummary } from '../../types/ppic';
import { AlertCircle } from 'lucide-react';

interface StageWorkloadChartProps {
  stages: ProductionStageSummary[];
  title?: string;
}

export const StageWorkloadChart: React.FC<StageWorkloadChartProps> = ({
  stages,
  title = 'Beban Kerja Tahapan Produksi (Pipeline & Bottleneck)',
}) => {
  if (stages.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-xs text-slate-500">Tidak ada data tahapan produksi.</p>
      </div>
    );
  }

  const maxTarget = Math.max(...stages.map((s) => s.targetQty), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis volume pekerjaan per tahapan dan identifikasi potensi penumpukan (backlog)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
        {stages.map((stage) => {
          const backlog = Math.max(0, stage.targetQty - stage.actualQty);
          const hasSewingIssues =
            stage.stageName === 'Sewing' &&
            ((stage.repairCount && stage.repairCount > 0) ||
              (stage.reworkCount && stage.reworkCount > 0) ||
              (stage.repairQty && stage.repairQty > 0) ||
              (stage.reworkQty && stage.reworkQty > 0));

          return (
            <div
              key={stage.stageName}
              className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                stage.isBottleneck
                  ? 'border-amber-300 bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="font-bold text-xs text-slate-900 truncate" title={stage.stageName}>
                    {stage.stageName}
                  </span>
                  {stage.isBottleneck && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 px-1 py-0.5 rounded shrink-0">
                      <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      Bottleneck
                    </span>
                  )}
                </div>

                <div className="space-y-1 mb-2.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-500 font-mono">
                    <span>Target:</span>
                    <span className="font-medium text-slate-800">{stage.targetQty.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 font-mono">
                    <span>Output:</span>
                    <span className="font-medium text-emerald-700">{stage.actualQty.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 font-mono">
                    <span>Sisa:</span>
                    <span className={`font-semibold ${backlog > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {backlog.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      stage.completionRate >= 100
                        ? 'bg-emerald-600'
                        : stage.isBottleneck
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, stage.completionRate)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-500 font-mono">
                  <span>{stage.moCount} MO</span>
                  <span className="font-semibold text-slate-700">{stage.completionRate}%</span>
                </div>
              </div>

              {/* Sewing Repair / Rework Breakdown (Section 3: Repair/Rework only on Sewing) */}
              {hasSewingIssues && (
                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] font-mono space-y-1">
                  <span className="text-[10px] font-semibold text-slate-600 block">Kondisi Sewing:</span>
                  <div className="flex flex-col gap-1">
                    {(stage.repairCount || 0) > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold truncate">
                        Repair: {stage.repairCount} MO {stage.repairQty ? `(${stage.repairQty} pcs)` : ''}
                      </span>
                    )}
                    {(stage.reworkCount || 0) > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold truncate">
                        Rework: {stage.reworkCount} MO {stage.reworkQty ? `(${stage.reworkQty} pcs)` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overview Bar comparison */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-700 block">
          Perbandingan Beban Relatif Antar-Tahap
        </span>
        {stages.map((stage) => {
          const widthPercent = Math.max(5, (stage.targetQty / maxTarget) * 100);
          return (
            <div key={`bar-${stage.stageName}`} className="flex items-center gap-3 text-xs">
              <span className="w-32 shrink-0 text-slate-600 truncate font-medium">{stage.stageName}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded ${stage.isBottleneck ? 'bg-amber-500' : 'bg-slate-700'}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="w-20 text-right font-mono tabular-nums text-slate-600 text-[11px]">
                {stage.targetQty.toLocaleString()} pcs
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
