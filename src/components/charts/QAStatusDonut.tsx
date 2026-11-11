import React, { useState } from 'react';
import { QARecord } from '../../types/ppic';
import { ShieldCheck, Info } from 'lucide-react';

interface QAStatusDonutProps {
  data: QARecord[];
  title?: string;
  subtitle?: string;
}

export const QAStatusDonut: React.FC<QAStatusDonutProps> = ({
  data,
  title = 'Distribusi Status QA (Quality Assurance)',
  subtitle = 'Rekapitulasi proporsi hasil audit dan status inspeksi kualitas berdasarkan data aktual Excel',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center min-h-[220px] text-center shadow-2xs">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <Info className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Data status QA belum tersedia pada kumpulan data yang aktif atau filter pencarian saat ini.
        </p>
      </div>
    );
  }

  // SVG Donut geometry
  const radius = 62;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : data[0];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
      {/* Header with Title, Description, and Total Summary Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
            Total Data QA: <strong className="text-slate-900 font-semibold">{total}</strong> entri
          </span>
        </div>
      </div>

      {/* Main Body: Donut and Spacious Legend side-by-side on desktop */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-start gap-8 lg:gap-14 pt-6">
        {/* Proportional Donut Chart Container */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background track circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {data.map((item, index) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;
              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={item.statusName}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Central Label in Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-3">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {activeItem?.percentage || 0}%
            </span>
            <span
              className="text-[11px] font-semibold text-slate-500 max-w-[100px] truncate"
              title={activeItem?.statusName}
            >
              {activeItem?.statusName || 'QA'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              {activeItem?.count || 0} entri
            </span>
          </div>
        </div>

        {/* Legend & Category List: Full Category Names, Items Count & Proportion Bars */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
            <span>Kategori Status Inspeksi QA</span>
            <span>Jumlah & Proporsi</span>
          </div>

          <div className="space-y-2.5">
            {data.map((item, idx) => {
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={item.statusName}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isHovered
                      ? 'border-slate-300 bg-slate-50/80 shadow-2xs'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Category Label with Color Indicator (never truncated!) */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-semibold text-slate-800 break-words leading-tight">
                        {item.statusName}
                      </span>
                    </div>

                    {/* Quantity & Percentage */}
                    <div className="flex items-center gap-3 font-mono tabular-nums text-xs text-slate-600 shrink-0 self-end sm:self-auto">
                      <span>
                        <strong className="text-slate-900 font-semibold">{item.count}</strong> order
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-slate-900 min-w-[42px] text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal mini bar for immediate visual proportion */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
