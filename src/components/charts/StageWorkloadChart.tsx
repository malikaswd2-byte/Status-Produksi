import React from 'react';
import { ProductionStageSummary } from '../../types/ppic';
import { AlertCircle, Wrench, RotateCcw } from 'lucide-react';

interface StageWorkloadChartProps {
  stages: ProductionStageSummary[];
  title?: string;
  subtitle?: string;
}

export const StageWorkloadChart: React.FC<StageWorkloadChartProps> = ({
  stages,
  title = 'Beban Kerja Tahapan Produksi (Pipeline & Bottleneck)',
  subtitle = 'Analisis volume pengerjaan per tahapan produksi dan identifikasi penumpukan (backlog)',
}) => {
  if (stages.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center min-h-[260px] text-center">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
        <p className="text-xs text-slate-500">Tidak ada data tahapan produksi untuk filter saat ini.</p>
      </div>
    );
  }

  const maxTarget = Math.max(...stages.map((s) => s.targetQty), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {stages.length} Tahapan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* 
        A. Production Stage Cards:
        Responsive grid with 4 cards on row 1 and 3 cards on row 2 on desktop (lg:grid-cols-4)
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
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
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 ${
                stage.isBottleneck
                  ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                  : 'border-slate-200 bg-slate-50/30 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Top: Stage Step & Name + Bottleneck Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Tahap {stage.stageIndex + 1} dari 7
                    </span>
                    <h4
                      className="text-sm font-bold text-slate-900 leading-snug break-words"
                      title={stage.stageName}
                    >
                      {stage.stageName}
                    </h4>
                  </div>
                  {stage.isBottleneck && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Bottleneck
                    </span>
                  )}
                </div>

                {/* Quantities arranged vertically with comfortable spacing */}
                <div className="space-y-2 py-2.5 my-2 border-y border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Target Produksi:</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {stage.targetQty.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-slate-400 font-sans">pcs</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Output Aktual:</span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {stage.actualQty.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-emerald-600/70 font-sans">pcs</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Sisa (Backlog):</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        backlog > 0 ? 'text-amber-700' : 'text-slate-400'
                      }`}
                    >
                      {backlog.toLocaleString()}{' '}
                      <span className="text-[11px] font-normal text-slate-400 font-sans">pcs</span>
                    </span>
                  </div>
                </div>

                {/* 
                  B. Dedicated Repair & Rework Information on Sewing
                  Does not disturb Target, Output, or Sisa; clearly formatted badges
                */}
                {stage.stageName === 'Sewing' && (
                  <div className="my-2.5 p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-amber-900 block">
                      Kondisi Pengerjaan Sewing:
                    </span>
                    {hasSewingIssues ? (
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        {(stage.repairCount || 0) > 0 && (
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-100/90 border border-amber-200 text-amber-900 font-medium text-xs">
                            <span className="flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-amber-700" />
                              Repair
                            </span>
                            <span className="font-mono font-bold tabular-nums">
                              {stage.repairCount} MO{' '}
                              {stage.repairQty ? `(${stage.repairQty.toLocaleString()} pcs)` : ''}
                            </span>
                          </div>
                        )}
                        {(stage.reworkCount || 0) > 0 && (
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-rose-100/90 border border-rose-200 text-rose-900 font-medium text-xs">
                            <span className="flex items-center gap-1">
                              <RotateCcw className="w-3 h-3 text-rose-700" />
                              Rework
                            </span>
                            <span className="font-mono font-bold tabular-nums">
                              {stage.reworkCount} MO{' '}
                              {stage.reworkQty ? `(${stage.reworkQty.toLocaleString()} pcs)` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-emerald-700 font-medium text-[11px] block">
                        Normal (Tidak ada repair/rework)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Bottom: Progress Bar, MO Count, & Percentage */}
              <div className="pt-2 mt-auto">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stage.completionRate >= 100
                        ? 'bg-emerald-600'
                        : stage.isBottleneck
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, stage.completionRate)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="font-mono text-slate-600">
                    {stage.moCount} MO <span className="text-slate-400">·</span> {stage.styleCount} Style
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      stage.completionRate >= 100 ? 'text-emerald-700' : 'text-slate-800'
                    }`}
                  >
                    {stage.completionRate}% selesai
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 
        C. Perbandingan Beban Relatif Antar-Tahap
        Placed below all 7 stage cards; horizontal bar chart using full available width
      */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Perbandingan Beban Relatif Antar-Tahap (Alur Produksi 1 s/d 7)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Urutan tahapan sesuai alur produksi manufaktur dari Cutting hingga QA
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
              Target Produksi
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
              Output Selesai
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
              Bottleneck
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {stages.map((stage) => {
            const widthTargetPercent = Math.max(5, (stage.targetQty / maxTarget) * 100);
            const widthActualPercent =
              stage.targetQty > 0
                ? Math.min(widthTargetPercent, (stage.actualQty / maxTarget) * 100)
                : 0;

            return (
              <div
                key={`bar-${stage.stageName}`}
                className="flex items-center gap-3 sm:gap-4 text-xs py-1 hover:bg-slate-50/60 rounded px-1 -mx-1 transition-colors"
              >
                {/* Stage Name on Left (wide enough, no text truncation!) */}
                <div className="w-44 sm:w-52 shrink-0 flex items-center justify-between pr-2">
                  <span
                    className="font-semibold text-slate-800 truncate"
                    title={stage.stageName}
                  >
                    {stage.stageIndex + 1}. {stage.stageName}
                  </span>
                  {stage.isBottleneck && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded ml-1 shrink-0">
                      Bottleneck
                    </span>
                  )}
                </div>

                {/* Horizontal Bar Visual in Middle (uses full available width) */}
                <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden relative">
                  {/* Target reference track */}
                  <div
                    className="h-full rounded-sm bg-slate-200/90 transition-all duration-500"
                    style={{ width: `${widthTargetPercent}%` }}
                  />
                  {/* Realized output progress */}
                  <div
                    className={`h-full rounded-sm transition-all duration-500 absolute left-0 top-0 ${
                      stage.completionRate >= 100
                        ? 'bg-emerald-600'
                        : stage.isBottleneck
                        ? 'bg-amber-500'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${widthActualPercent}%` }}
                  />
                </div>

                {/* Quantity & Percentage on Right */}
                <div className="w-44 sm:w-56 shrink-0 flex items-center justify-end gap-3 text-right font-mono tabular-nums text-xs">
                  <span className="text-slate-600">
                    <strong className="text-slate-900 font-semibold">
                      {stage.actualQty.toLocaleString()}
                    </strong>{' '}
                    / {stage.targetQty.toLocaleString()} pcs
                  </span>
                  <span
                    className={`w-12 text-right font-bold ${
                      stage.completionRate >= 100
                        ? 'text-emerald-700'
                        : stage.isBottleneck
                        ? 'text-amber-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {stage.completionRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
