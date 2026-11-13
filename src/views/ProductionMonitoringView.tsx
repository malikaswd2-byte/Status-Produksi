import React, { useState, useMemo } from 'react';
import { usePPIC } from '../context/PPICContext';
import {
  groupOrdersByMO,
  aggregateStyles,
  aggregateProductionStages,
  aggregateQAStatus,
} from '../utils/ppicCalculations';
import { FilterBar } from '../components/FilterBar';
import { QAStatusDonut } from '../components/charts/QAStatusDonut';
import { StageWorkloadChart } from '../components/charts/StageWorkloadChart';
import {
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Eye,
  Building2,
  Boxes,
  Table2,
  Layers,
} from 'lucide-react';
import { StyleSummary, MOGroup } from '../types/ppic';

type MOSortField = 'customer' | 'moNumber' | 'style' | 'stageCount' | 'totalTargetQty' | 'totalActualQty' | 'progressPercent';
type StyleSortField = 'style' | 'moCount' | 'totalTargetQty' | 'totalActualQty' | 'progressPercent';

export const ProductionMonitoringView: React.FC = () => {
  const { filteredOrders, setSelectedMO } = usePPIC();

  // View mode: Grouped by Customer & MO (Default) vs Style Overview
  const [viewMode, setViewMode] = useState<'groupedMO' | 'styleOverview'>('groupedMO');

  // MO Group Table State
  const [moSortField, setMoSortField] = useState<MOSortField>('moNumber');
  const [moSortDirection, setMoSortDirection] = useState<'asc' | 'desc'>('asc');
  const [moPage, setMoPage] = useState(1);
  const moItemsPerPage = 5; // 5 MO groups per page (guarantees no stages split)

  // Style Table State
  const [styleSortField, setStyleSortField] = useState<StyleSortField>('totalTargetQty');
  const [styleSortDirection, setStyleSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());
  const [stylePage, setStylePage] = useState(1);
  const styleItemsPerPage = 8;

  // Aggregate Data
  const moGroups = useMemo(() => {
    return groupOrdersByMO(filteredOrders);
  }, [filteredOrders]);

  const stylesData = useMemo(() => {
    return aggregateStyles(filteredOrders);
  }, [filteredOrders]);

  const stagesData = useMemo(() => {
    return aggregateProductionStages(filteredOrders);
  }, [filteredOrders]);

  const qaData = useMemo(() => {
    return aggregateQAStatus(filteredOrders);
  }, [filteredOrders]);

  const qaStage = useMemo(() => {
    return stagesData.find((s) => s.stageName === 'QA');
  }, [stagesData]);

  // Sort MO Groups
  const sortedMOGroups = useMemo(() => {
    return [...moGroups].sort((a, b) => {
      let valA: any = a[moSortField];
      let valB: any = b[moSortField];

      if (typeof valA === 'string') {
        return moSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return moSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [moGroups, moSortField, moSortDirection]);

  // Pagination for MO Groups (Guarantees every stage belonging to an MO stays on the same page)
  const totalMOPages = Math.ceil(sortedMOGroups.length / moItemsPerPage) || 1;
  const paginatedMOGroups = sortedMOGroups.slice(
    (moPage - 1) * moItemsPerPage,
    moPage * moItemsPerPage
  );

  // Total stage rows in currently visible MO groups
  const totalVisibleStages = useMemo(() => {
    return paginatedMOGroups.reduce((sum, g) => sum + g.stages.length, 0);
  }, [paginatedMOGroups]);

  // Sort Styles
  const sortedStyles = useMemo(() => {
    return [...stylesData].sort((a, b) => {
      let valA: any = a[styleSortField];
      let valB: any = b[styleSortField];

      if (typeof valA === 'string') {
        return styleSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return styleSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [stylesData, styleSortField, styleSortDirection]);

  // Pagination for Styles
  const totalStylePages = Math.ceil(sortedStyles.length / styleItemsPerPage) || 1;
  const paginatedStyles = sortedStyles.slice(
    (stylePage - 1) * styleItemsPerPage,
    stylePage * styleItemsPerPage
  );

  const handleMOSort = (field: MOSortField) => {
    if (moSortField === field) {
      setMoSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setMoSortField(field);
      setMoSortDirection('asc');
    }
  };

  const handleStyleSort = (field: StyleSortField) => {
    if (styleSortField === field) {
      setStyleSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setStyleSortField(field);
      setStyleSortDirection('desc');
    }
  };

  const toggleExpandStyle = (styleName: string) => {
    setExpandedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(styleName)) {
        next.delete(styleName);
      } else {
        next.add(styleName);
      }
      return next;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Production Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pemantauan terperinci tahapan produksi, kualitas QA per lini, dan alur pengerjaan Manufacturing Order
        </p>
      </div>

      {/* Filter Bar with Direct Search */}
      <FilterBar />

      {/* Section 1: Alur & Beban Kerja Tahapan Produksi (Full Width) */}
      <div className="w-full">
        <StageWorkloadChart
          stages={stagesData}
          title="Alur & Beban Kerja Tahapan Produksi (Pipeline & Bottleneck)"
          subtitle="Pengelompokan volume target, output, dan work center terkait di setiap tahapan"
        />
      </div>

      {/* Section 2: Dedicated QA Quality Assurance Status (Full Width) */}
      <div className="w-full">
        <QAStatusDonut
          data={qaData}
          qaStage={qaStage}
          title="Distribusi Status QA (Quality Assurance)"
          subtitle="Rekapitulasi proporsi hasil audit dan status inspeksi kualitas berdasarkan data aktual"
        />
      </div>

      {/* Section 3: Primary Production Monitoring Table with View Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        {/* Table Header and View Tabs */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {viewMode === 'groupedMO'
                  ? 'Tabel Monitoring Produksi (Grouped Customer & MO)'
                  : 'Tabel Monitoring Style Produksi'}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {viewMode === 'groupedMO'
                  ? `${moGroups.length} Kelompok MO · ${filteredOrders.length} Tahap`
                  : `${stylesData.length} Style terdaftar`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === 'groupedMO'
                ? 'Customer dan MO ditampilkan sekali per kelompok (merged cells) dengan rincian seluruh tahapan produksi (1. Cutting s/d 7. QA)'
                : 'Ringkasan performa dan pemenuhan per Style model manufaktur'}
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => setViewMode('groupedMO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'groupedMO'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Grouped Customer & MO
            </button>
            <button
              onClick={() => setViewMode('styleOverview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'styleOverview'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Ringkasan per Style
            </button>
          </div>
        </div>

        {/* VIEW 1: GROUPED CUSTOMER & MO (PRIMARY VIEW) */}
        {viewMode === 'groupedMO' ? (
          paginatedMOGroups.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Tidak ada Manufacturing Order yang memenuhi kriteria pencarian dan filter saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    {/* Customer */}
                    <th
                      onClick={() => handleMOSort('customer')}
                      className="py-3 px-2.5 font-semibold cursor-pointer hover:text-slate-900 border-r border-slate-200 min-w-[125px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Customer / Buyer</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>

                    {/* MO Display Name */}
                    <th
                      onClick={() => handleMOSort('moNumber')}
                      className="py-3 px-2.5 font-semibold cursor-pointer hover:text-slate-900 border-r border-slate-200 min-w-[115px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nomor MO</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>

                    {/* Style */}
                    <th
                      onClick={() => handleMOSort('style')}
                      className="py-3 px-2.5 font-semibold cursor-pointer hover:text-slate-900 border-r border-slate-200 min-w-[115px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Style</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>

                    {/* Stage Specific Columns */}
                    <th className="py-3 px-2.5 font-semibold min-w-[130px]">Tahap Produksi</th>
                    <th className="py-3 px-2.5 font-semibold min-w-[110px]">Work Center</th>
                    <th
                      onClick={() => handleMOSort('totalTargetQty')}
                      className="py-3 px-2 font-semibold text-right cursor-pointer hover:text-slate-900 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Target</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleMOSort('totalActualQty')}
                      className="py-3 px-2 font-semibold text-right cursor-pointer hover:text-slate-900 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Output</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    <th className="py-3 px-2 font-semibold text-right whitespace-nowrap">Sisa</th>
                    <th
                      onClick={() => handleMOSort('progressPercent')}
                      className="py-3 px-2 font-semibold text-right cursor-pointer hover:text-slate-900 whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Progres</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </div>
                    </th>
                    <th className="py-3 px-2 font-semibold min-w-[95px]">Kondisi / QA</th>
                    <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMOGroups.map((group, groupIdx) => {
                    const stageCount = group.stages.length;

                    return (
                      <React.Fragment key={group.moNumber}>
                        {group.stages.map((stageOrder, stageIdx) => {
                          const isFirstRow = stageIdx === 0;
                          const isLastRow = stageIdx === stageCount - 1;

                          const progress =
                            stageOrder.targetQty > 0
                              ? Math.round((stageOrder.actualQty / stageOrder.targetQty) * 100)
                              : 0;

                          const remaining =
                            stageOrder.remainingQty !== undefined
                              ? stageOrder.remainingQty
                              : Math.max(0, stageOrder.targetQty - stageOrder.actualQty);

                          return (
                            <tr
                              key={stageOrder.id}
                              className={`hover:bg-blue-50/40 transition-colors ${
                                isFirstRow ? 'border-t-2 border-slate-300' : 'border-t border-slate-100'
                              } ${isLastRow ? 'border-b-2 border-slate-300' : ''}`}
                            >
                              {/* 1. Customer Cell — Displayed ONCE per MO group via rowSpan */}
                              {isFirstRow && (
                                <td
                                  rowSpan={stageCount}
                                  className="py-3 px-2.5 align-middle bg-slate-50/80 border-r border-slate-200 text-slate-800 max-w-[160px]"
                                >
                                  <div className="flex items-start gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5 min-w-0">
                                      <span className="font-semibold text-slate-900 block leading-tight text-xs break-words">
                                        {group.customer}
                                      </span>
                                      {group.routing && group.routing !== '-' && (
                                        <span className="text-[10px] text-slate-500 font-mono block truncate" title={group.routing}>
                                          Routing: {group.routing}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}

                              {/* 2. MO Number Cell — Displayed ONCE per MO group via rowSpan */}
                              {isFirstRow && (
                                <td
                                  rowSpan={stageCount}
                                  className="py-3 px-2.5 align-middle bg-slate-50/80 border-r border-slate-200"
                                >
                                  <div className="space-y-1">
                                    <button
                                      onClick={() => setSelectedMO(stageOrder)}
                                      className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline block text-xs tracking-tight text-left whitespace-nowrap"
                                      title="Klik untuk membuka rincian MO"
                                    >
                                      {group.moNumber}
                                    </button>
                                    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                      {stageCount} Tahap
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* 3. Style Cell — Displayed ONCE per MO group via rowSpan */}
                              {isFirstRow && (
                                <td
                                  rowSpan={stageCount}
                                  className="py-3 px-2.5 align-middle bg-slate-50/50 border-r border-slate-200 text-slate-800 max-w-[140px]"
                                >
                                  <div className="space-y-0.5">
                                    <span
                                      className="font-semibold text-slate-900 block leading-tight text-xs break-words"
                                      title={group.style}
                                    >
                                      {group.style}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono block whitespace-nowrap">
                                      Order: {group.totalTargetQty.toLocaleString()} pcs
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* 4. Production Stage (Specific to this row) */}
                              <td className="py-2.5 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {stageIdx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800 text-xs">
                                    {stageOrder.productionStage}
                                  </span>
                                </span>
                              </td>

                              {/* 5. Work Center (Specific to this row) */}
                              <td
                                className="py-2.5 px-2.5 text-slate-700 max-w-[130px] truncate text-xs"
                                title={stageOrder.workCenter || '-'}
                              >
                                {stageOrder.workCenter || '-'}
                              </td>

                              {/* 6. Target Qty */}
                              <td className="py-2.5 px-2 font-mono text-right text-slate-700 text-xs whitespace-nowrap">
                                {stageOrder.targetQty.toLocaleString()}
                              </td>

                              {/* 7. Output Qty */}
                              <td className="py-2.5 px-2 font-mono text-right font-semibold text-emerald-700 text-xs whitespace-nowrap">
                                {stageOrder.actualQty.toLocaleString()}
                              </td>

                              {/* 8. Sisa / Backlog Qty */}
                              <td className="py-2.5 px-2 font-mono text-right text-slate-600 text-xs whitespace-nowrap">
                                {remaining.toLocaleString()}
                              </td>

                              {/* 9. Progress */}
                              <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="w-9 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className={`h-full ${
                                        progress >= 100
                                          ? 'bg-emerald-600'
                                          : progress < 40
                                          ? 'bg-amber-500'
                                          : 'bg-blue-600'
                                      }`}
                                      style={{ width: `${Math.min(100, progress)}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-[11px] font-semibold text-slate-700 w-8 text-right">
                                    {progress}%
                                  </span>
                                </div>
                              </td>

                              {/* 10. Kondisi Sewing / Status QA */}
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                {stageOrder.productionStage === 'Sewing' &&
                                stageOrder.sewingCondition &&
                                stageOrder.sewingCondition !== 'Normal' ? (
                                  <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      stageOrder.sewingCondition === 'Rework'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {stageOrder.sewingCondition} (
                                    {stageOrder.sewingCondition === 'Repair'
                                      ? stageOrder.repairQty || 0
                                      : stageOrder.reworkQty || 0}{' '}
                                    pcs)
                                  </span>
                                ) : stageOrder.productionStage === 'QA' && stageOrder.qaStatus ? (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {stageOrder.qaStatus}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-mono">-</span>
                                )}
                              </td>

                              {/* 11. Action Button */}
                              <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedMO(stageOrder)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:underline"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Buka
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls for MO Groups */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                <span className="font-mono">
                  Halaman {moPage} dari {totalMOPages} ({sortedMOGroups.length} Kelompok MO · {totalVisibleStages} Tahap pada halaman ini · {filteredOrders.length} Total Tahap)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={moPage === 1}
                    onClick={() => setMoPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={moPage === totalMOPages}
                    onClick={() => setMoPage((p) => Math.min(totalMOPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* VIEW 2: STYLE OVERVIEW ACCORDION TABLE */
          paginatedStyles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Tidak ada Style yang memenuhi kriteria pencarian dan filter saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="w-8 py-3 px-3"></th>
                    <th
                      onClick={() => handleStyleSort('style')}
                      className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Style</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleStyleSort('moCount')}
                      className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 text-center"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Total MO</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 font-semibold">Work Center</th>
                    <th className="py-3 px-3 font-semibold">Tahap Produksi</th>
                    <th
                      onClick={() => handleStyleSort('totalTargetQty')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Target (pcs)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleStyleSort('totalActualQty')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Output (pcs)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleStyleSort('progressPercent')}
                      className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Progres</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 font-semibold">Status Monitoring</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStyles.map((item) => {
                    const isExpanded = expandedStyles.has(item.style);

                    return (
                      <React.Fragment key={item.style}>
                        <tr
                          onClick={() => toggleExpandStyle(item.style)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{item.style}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700">
                            {item.moCount}
                          </td>
                          <td
                            className="py-3 px-3 text-slate-600 max-w-[160px] truncate"
                            title={item.workCenters.join(', ')}
                          >
                            {item.workCenters.join(', ') || '-'}
                          </td>
                          <td
                            className="py-3 px-3 text-slate-600 max-w-[160px] truncate"
                            title={item.stages.join(', ')}
                          >
                            {item.stages.join(', ') || '-'}
                          </td>
                          <td className="py-3 px-3 font-mono text-right text-slate-700">
                            {item.totalTargetQty.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono text-right font-semibold text-emerald-700">
                            {item.totalActualQty.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono text-right">
                            <span
                              className={`font-semibold ${
                                item.progressPercent >= 100
                                  ? 'text-emerald-700'
                                  : item.progressPercent < 40
                                  ? 'text-amber-700'
                                  : 'text-blue-700'
                              }`}
                            >
                              {item.progressPercent}%
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                                item.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'Behind'
                                  ? 'bg-rose-100 text-rose-800'
                                  : item.status === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>

                        {/* Expandable associated MOs drill-down */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={9} className="p-3 pl-11">
                              <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-2xs">
                                <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                                  <span>
                                    Daftar Manufacturing Order (MO) untuk Style: {item.style}
                                  </span>
                                  <span className="font-mono text-slate-500">
                                    {item.orders.length} entri
                                  </span>
                                </div>
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px]">
                                    <tr>
                                      <th className="py-2 px-3 font-semibold">Customer</th>
                                      <th className="py-2 px-3 font-semibold">Nomor MO</th>
                                      <th className="py-2 px-3 font-semibold">Work Center</th>
                                      <th className="py-2 px-3 font-semibold">Tahap</th>
                                      <th className="py-2 px-3 font-semibold text-right">Target</th>
                                      <th className="py-2 px-3 font-semibold text-right">Output</th>
                                      <th className="py-2 px-3 font-semibold text-right">Sisa</th>
                                      <th className="py-2 px-3 font-semibold">QA Status</th>
                                      <th className="py-2 px-3 font-semibold text-right">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {item.orders.map((ord) => (
                                      <tr key={ord.id} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-3 text-slate-700 font-medium">
                                          {ord.buyer || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                                          {ord.moNumber}
                                        </td>
                                        <td className="py-2 px-3 text-slate-700">{ord.workCenter || '-'}</td>
                                        <td className="py-2 px-3 text-slate-700">
                                          <span>{ord.productionStage}</span>
                                          {ord.productionStage === 'Sewing' &&
                                            ord.sewingCondition &&
                                            ord.sewingCondition !== 'Normal' && (
                                              <span
                                                className={`ml-1 text-[10px] font-semibold px-1 rounded ${
                                                  ord.sewingCondition === 'Rework'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-amber-100 text-amber-800'
                                                }`}
                                              >
                                                {ord.sewingCondition}
                                              </span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-right text-slate-700">
                                          {ord.targetQty.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-right text-emerald-700 font-semibold">
                                          {ord.actualQty.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-right text-slate-500">
                                          {(ord.remainingQty !== undefined
                                            ? ord.remainingQty
                                            : Math.max(0, ord.targetQty - ord.actualQty)
                                          ).toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="text-[11px] font-medium text-slate-700">
                                            {ord.qaStatus || '-'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <button
                                            onClick={() => setSelectedMO(ord)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                                          >
                                            <Eye className="w-3 h-3" />
                                            Buka MO
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls for Styles */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span className="font-mono">
                  Halaman {stylePage} dari {totalStylePages} ({sortedStyles.length} total style)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={stylePage === 1}
                    onClick={() => setStylePage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={stylePage === totalStylePages}
                    onClick={() => setStylePage((p) => Math.min(totalStylePages, p + 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
