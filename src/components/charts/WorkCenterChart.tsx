import React from 'react';
import { WorkCenterSummary } from '../../types/ppic';

interface WorkCenterChartProps {
  data: WorkCenterSummary[];
  title?: string;
}

export const WorkCenterChart: React.FC<WorkCenterChartProps> = ({
  data,
  title = 'Distribusi Produksi per Work Center',
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center min-h-[320px]">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-xs text-slate-500">Tidak ada data Work Center yang sesuai dengan filter.</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.totalTargetQty, d.totalActualQty)), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Perbandingan Target Produksi vs Output Aktual (pcs)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-300 rounded-sm" />
            <span className="text-slate-600 font-medium">Target Qty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
            <span className="text-slate-600 font-medium">Actual Output</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const targetWidth = Math.max(2, (item.totalTargetQty / maxVal) * 100);
          const actualWidth = Math.max(2, (item.totalActualQty / maxVal) * 100);

          return (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({item.moCount} MO · {item.styleCount} Style)
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                  <span className="text-slate-500">{item.totalActualQty.toLocaleString()} / {item.totalTargetQty.toLocaleString()} pcs</span>
                  <span className={`font-semibold ${item.progressPercent >= 100 ? 'text-emerald-700' : item.progressPercent < 50 ? 'text-amber-700' : 'text-blue-700'}`}>
                    {item.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Dual Bar (Target Track & Actual Output) */}
              <div className="space-y-1">
                {/* Target bar */}
                <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-slate-300 transition-all duration-300 rounded"
                    style={{ width: `${targetWidth}%` }}
                    title={`Target: ${item.totalTargetQty} pcs`}
                  />
                </div>
                {/* Actual bar */}
                <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded ${
                      item.progressPercent >= 100
                        ? 'bg-emerald-600'
                        : item.progressPercent >= 60
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${actualWidth}%` }}
                    title={`Actual: ${item.totalActualQty} pcs`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
