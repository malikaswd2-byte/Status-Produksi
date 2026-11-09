import React, { useState, useMemo } from 'react';
import { usePPIC } from '../context/PPICContext';
import {
  aggregateStyles,
  aggregateProductionStages,
  aggregateQAStatus,
} from '../utils/ppicCalculations';
import { FilterBar } from '../components/FilterBar';
import { QAStatusDonut } from '../components/charts/QAStatusDonut';
import {
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  Factory,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { StyleSummary } from '../types/ppic';

type SortField = 'style' | 'moCount' | 'totalTargetQty' | 'totalActualQty' | 'progressPercent';

export const ProductionMonitoringView: React.FC = () => {
  const { filteredOrders, setSelectedMO } = usePPIC();

  const [sortField, setSortField] = useState<SortField>('totalTargetQty');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const stylesData = useMemo(() => {
    return aggregateStyles(filteredOrders);
  }, [filteredOrders]);

  const stagesData = useMemo(() => {
    return aggregateProductionStages(filteredOrders);
  }, [filteredOrders]);

  const qaData = useMemo(() => {
    return aggregateQAStatus(filteredOrders);
  }, [filteredOrders]);

  // Sort styles
  const sortedStyles = useMemo(() => {
    return [...stylesData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [stylesData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedStyles.length / itemsPerPage) || 1;
  const paginatedStyles = sortedStyles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleExpand = (styleName: string) => {
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Production Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pemantauan terperinci tahapan produksi, kualitas QA per lini, dan progres per Style
        </p>
      </div>

      {/* Filter Bar with Direct Search */}
      <FilterBar />

      {/* Top Grid: QA Monitoring & Production Stage Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QA Monitoring (Section 5.A) */}
        <div>
          <QAStatusDonut data={qaData} title="QA Quality Assurance Status" />
        </div>

        {/* Production Stage Pipeline & Bottlenecks (Section 5.B) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Alur Tahapan Produksi (Production Stages)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelompokan volume target, output, dan work center terkait di setiap tahapan
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {stagesData.length} Tahapan Aktif
            </span>
          </div>

          <div className="space-y-3">
            {stagesData.map((stage) => {
              const backlog = Math.max(0, stage.targetQty - stage.actualQty);

              return (
                <div
                  key={stage.stageName}
                  className={`p-3.5 rounded-lg border transition-colors ${
                    stage.isBottleneck
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{stage.stageName}</span>
                      {stage.isBottleneck && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          Volume Terberat (Bottleneck)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-600">
                      <span>Target: <strong className="text-slate-900">{stage.targetQty.toLocaleString()}</strong> pcs</span>
                      <span>Output: <strong className="text-emerald-700">{stage.actualQty.toLocaleString()}</strong> pcs</span>
                      <span>Backlog: <strong className="text-amber-700">{backlog.toLocaleString()}</strong> pcs</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stage.completionRate >= 100
                          ? 'bg-emerald-600'
                          : stage.isBottleneck
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${stage.completionRate}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Factory className="w-3 h-3 text-slate-400" />
                      <span>Work Centers: {stage.workCenters.join(', ') || 'Unassigned'}</span>
                    </div>
                    <div className="font-mono">
                      <span>{stage.moCount} MO · {stage.styleCount} Style · <strong>{stage.completionRate}%</strong> selesai</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Style Monitoring Table (Section 5.C) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tabel Monitoring Style Produksi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik tanda panah pada setiap Style untuk melihat rincian MO yang terhubung
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Total: {stylesData.length} Style terdaftar
          </span>
        </div>

        {paginatedStyles.length === 0 ? (
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
                    onClick={() => handleSort('style')}
                    className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>Style</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('moCount')}
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
                    onClick={() => handleSort('totalTargetQty')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Target (pcs)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalActualQty')}
                    className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Output (pcs)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('progressPercent')}
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
                        onClick={() => toggleExpand(item.style)}
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
                        <td className="py-3 px-3 text-slate-600 max-w-[160px] truncate" title={item.workCenters.join(', ')}>
                          {item.workCenters.join(', ') || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-[160px] truncate" title={item.stages.join(', ')}>
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
                                <span>Daftar Manufacturing Order (MO) untuk Style: {item.style}</span>
                                <span className="font-mono text-slate-500">{item.orders.length} entri</span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px]">
                                  <tr>
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
                                      <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                                        {ord.moNumber}
                                      </td>
                                      <td className="py-2 px-3 text-slate-700">{ord.workCenter}</td>
                                      <td className="py-2 px-3 text-slate-700">{ord.productionStage}</td>
                                      <td className="py-2 px-3 font-mono text-right text-slate-700">
                                        {ord.targetQty.toLocaleString()}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-right text-emerald-700 font-semibold">
                                        {ord.actualQty.toLocaleString()}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-right text-slate-500">
                                        {Math.max(0, ord.targetQty - ord.actualQty).toLocaleString()}
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

            {/* Pagination Controls */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono">
                Halaman {currentPage} dari {totalPages} ({sortedStyles.length} total style)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
