import React, { useState } from 'react';
import { QARecord } from '../../types/ppic';

interface QAStatusDonutProps {
  data: QARecord[];
  title?: string;
}

export const QAStatusDonut: React.FC<QAStatusDonutProps> = ({
  data,
  title = 'Distribusi Status QA (Quality Assurance)',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Data QA belum tersedia pada kumpulan data yang aktif atau filter saat ini.
        </p>
      </div>
    );
  }

  // Calculate SVG arc paths
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Berdasarkan data aktual pemeriksaan QA</p>
        </div>
        <span className="text-xs font-mono text-slate-500 tabular-nums">
          Total: <strong className="text-slate-800 font-semibold">{total}</strong> data
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {data.map((item, index) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;
              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={item.statusName}
                  cx="90"
                  cy="90"
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

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {hoveredIndex !== null ? (
              <>
                <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                  {data[hoveredIndex].percentage}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium max-w-[80px] truncate">
                  {data[hoveredIndex].statusName}
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                  {data[0]?.percentage || 0}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium max-w-[80px] truncate">
                  {data[0]?.statusName || 'QA'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {data.map((item, idx) => (
            <div
              key={item.statusName}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded transition-colors cursor-pointer ${
                hoveredIndex === idx ? 'bg-slate-50' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-700 font-medium truncate">{item.statusName}</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-slate-600 shrink-0">
                <span>{item.count} items</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
