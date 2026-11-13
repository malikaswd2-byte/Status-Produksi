import React from 'react';
import { usePPIC } from '../context/PPICContext';
import { Search, RotateCcw, Filter, Calendar } from 'lucide-react';

export const FilterBar: React.FC = () => {
  const { orders, filteredOrders, filters, updateFilter, resetFilters } = usePPIC();

  // Extract unique options from current active batch orders
  const workCenters = Array.from(
    new Set(orders.map((o) => o.workCenter?.trim()).filter((wc): wc is string => Boolean(wc) && wc !== '-'))
  ).sort();
  const styles = Array.from(new Set(orders.map((o) => o.style).filter(Boolean))).sort();
  const stages = Array.from(
    new Set(orders.map((o) => o.productionStage).filter((s) => Boolean(s) && s !== '-'))
  ).sort();
  const qaStatuses = Array.from(new Set(orders.map((o) => o.qaStatus).filter(Boolean))).sort();

  const isAnyFilterActive =
    filters.search !== '' ||
    filters.workCenter !== '' ||
    filters.style !== '' ||
    filters.mo !== '' ||
    filters.stage !== '' ||
    filters.qaStatus !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs mb-5">
      {/* Primary Row: Direct Text Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 pb-3 border-b border-slate-100">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Ketik pencarian langsung (Nomor MO, Style, Work Center, Tahap, Buyer)..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1"
              aria-label="Hapus kata kunci pencarian"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Menampilkan <strong className="text-slate-800">{filteredOrders.length}</strong> dari{' '}
            <strong className="text-slate-800">{orders.length}</strong> data
          </span>

          {isAnyFilterActive && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Secondary Row: Integrated Filter Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3">
        {/* Work Center */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Work Center</label>
          <select
            value={filters.workCenter}
            onChange={(e) => updateFilter('workCenter', e.target.value)}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="">Semua Work Center</option>
            {workCenters.map((wc) => (
              <option key={wc} value={wc}>
                {wc}
              </option>
            ))}
          </select>
        </div>

        {/* Style */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Style</label>
          <select
            value={filters.style}
            onChange={(e) => updateFilter('style', e.target.value)}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:border-blue-500 truncate"
          >
            <option value="">Semua Style</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Stage */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Tahap Produksi</label>
          <select
            value={filters.stage}
            onChange={(e) => updateFilter('stage', e.target.value)}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="">Semua Tahap</option>
            {stages.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* QA Status */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Status QA</label>
          <select
            value={filters.qaStatus}
            onChange={(e) => updateFilter('qaStatus', e.target.value)}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:border-blue-500"
          >
            <option value="">Semua Status QA</option>
            {qaStatuses.map((qa) => (
              <option key={qa} value={qa}>
                {qa}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Dari Tanggal</label>
          <div className="relative">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="w-full py-1 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Date To */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Sampai Tanggal</label>
          <div className="relative">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="w-full py-1 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
