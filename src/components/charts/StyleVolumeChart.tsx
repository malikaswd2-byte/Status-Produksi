import React from 'react';
import { StyleSummary } from '../../types/ppic';

interface StyleVolumeChartProps {
  styles: StyleSummary[];
  title?: string;
}

export const StyleVolumeChart: React.FC<StyleVolumeChartProps> = ({
  styles,
  title = 'Distribusi Produksi per Style (Top Volume)',
}) => {
  const topStyles = styles.slice(0, 6);

  if (topStyles.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-xs text-slate-500">Tidak ada data Style yang sesuai.</p>
      </div>
    );
  }

  const maxVal = Math.max(...topStyles.map((s) => s.totalTargetQty), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Top style berdasarkan kuantitas target dan pemenuhan</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {topStyles.map((style) => {
          const widthPercent = Math.max(4, (style.totalTargetQty / maxVal) * 100);

          return (
            <div key={style.style} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate max-w-[65%]">
                  <span className="font-semibold text-slate-800 truncate">{style.style}</span>
                  <span className="text-[11px] text-slate-400 font-mono">({style.moCount} MO)</span>
                </div>
                <div className="flex items-center gap-2.5 font-mono tabular-nums text-xs">
                  <span className="text-slate-500">
                    {style.totalActualQty.toLocaleString()} / {style.totalTargetQty.toLocaleString()} pcs
                  </span>
                  <span className="font-semibold text-slate-900 w-10 text-right">
                    {style.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    style.progressPercent >= 100
                      ? 'bg-emerald-600'
                      : style.progressPercent >= 50
                      ? 'bg-blue-600'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
