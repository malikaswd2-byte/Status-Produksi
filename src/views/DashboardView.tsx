import React from 'react';
import { usePPIC } from '../context/PPICContext';
import {
  calculateKPIs,
  aggregateWorkCenters,
  aggregateStyles,
  aggregateProductionStages,
  aggregateQAStatus,
  groupOrdersByMO,
} from '../utils/ppicCalculations';
import { FilterBar } from '../components/FilterBar';
import { WorkCenterChart } from '../components/charts/WorkCenterChart';
import { StyleVolumeChart } from '../components/charts/StyleVolumeChart';
import { QAStatusDonut } from '../components/charts/QAStatusDonut';
import { StageWorkloadChart } from '../components/charts/StageWorkloadChart';
import {
  Boxes,
  Layers,
  Factory,
  Target,
  CheckCircle2,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  Building2,
  UploadCloud,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { orders, filteredOrders, productionSchedules, deliverySchedules, setSelectedMO, setActiveTab } =
    usePPIC();

  // Dynamic calculations based strictly on filtered active data
  const kpis = calculateKPIs(filteredOrders, productionSchedules, deliverySchedules);
  const workCentersData = aggregateWorkCenters(filteredOrders);
  const stylesData = aggregateStyles(filteredOrders);
  const stagesData = aggregateProductionStages(filteredOrders);
  const qaData = aggregateQAStatus(filteredOrders);
  const qaStage = stagesData.find((s) => s.stageName === 'QA');
  const moGroups = React.useMemo(() => groupOrdersByMO(filteredOrders), [filteredOrders]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Production Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan status operasional, kapasitas lini, dan target manufaktur aktif
          </p>
        </div>
      </div>

      {/* Integrated Filter Bar */}
      <FilterBar />

      {orders.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Belum Ada Dataset Produksi Aktif</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Seluruh metrik Dashboard hanya dihitung dari file Excel aktual yang di-upload. Silakan upload file Excel produksi untuk mulai memantau progres MO dan tahapan produksi.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('upload')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
          >
            <UploadCloud className="w-4 h-4" />
            Upload File Excel
          </button>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total MO */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total MO</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.totalMO}
            </span>
            <span className="text-xs text-slate-400 font-medium">orders</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            {kpis.scheduledCount} terjadwal di Gantt
          </p>
        </div>

        {/* Total Style */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Style</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.totalStyle}
            </span>
            <span className="text-xs text-slate-400 font-medium">model</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Item produk manufaktur</p>
        </div>

        {/* Total Work Center */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Work Center</span>
            <Factory className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.totalWorkCenters}
            </span>
            <span className="text-xs text-slate-400 font-medium">lini</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Lini & stasiun produksi</p>
        </div>

        {/* Target Qty */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Target Produksi</span>
            <Target className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {kpis.totalTargetQty.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">pcs</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Target unik per Work Order</p>
        </div>

        {/* Output Aktual */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Output Aktual</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
              {kpis.totalActualQty.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">pcs</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            Output tahap akhir MO
          </p>
        </div>

        {/* Progress % */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pencapaian</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-blue-700 tabular-nums">
              {kpis.progressPercent}%
            </span>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${Math.min(100, kpis.progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section 1: Full-width Beban Kerja Tahapan Produksi (Pipeline & Bottleneck) */}
      <div className="w-full">
        <StageWorkloadChart stages={stagesData} />
      </div>

      {/* Section 2: Work Center Distribution & Top Style Fulfillment (Balanced 2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkCenterChart data={workCentersData} />
        <StyleVolumeChart styles={stylesData} />
      </div>

      {/* Section 3: Dedicated QA Monitoring Section with Ample Width */}
      <div className="w-full">
        <QAStatusDonut data={qaData} qaStage={qaStage} />
      </div>

      {/* Active Manufacturing Orders Table Preview */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Daftar Manufacturing Order (MO)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik nomor MO untuk membuka rincian spesifikasi, jadwal Gantt, dan jadwal pengiriman
            </p>
          </div>
          <button
            onClick={() => setActiveTab('monitoring')}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Buka Production Monitoring Penuh
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {moGroups.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">
              Tidak ada Manufacturing Order yang cocok dengan filter aktif. Silakan reset filter atau masukkan kata kunci lain.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold border-r border-slate-200 min-w-[160px]">
                    Customer / Buyer
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold border-r border-slate-200 min-w-[140px]">
                    Nomor MO
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold border-r border-slate-200 min-w-[150px]">
                    Style
                  </th>
                  <th className="py-2.5 px-3 font-semibold min-w-[130px]">Tahap</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[140px]">Work Center</th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[85px]">Target</th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[85px]">Output</th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[80px]">Progres</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[130px]">Kondisi / QA</th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[80px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {moGroups.slice(0, 3).map((group) => {
                  const stageCount = group.stages.length;

                  return (
                    <React.Fragment key={group.moNumber}>
                      {group.stages.map((order, stageIdx) => {
                        const isFirstRow = stageIdx === 0;
                        const isLastRow = stageIdx === stageCount - 1;

                        const progress =
                          order.targetQty > 0
                            ? Math.round((order.actualQty / order.targetQty) * 100)
                            : 0;

                        return (
                          <tr
                            key={order.id}
                            className={`hover:bg-blue-50/40 transition-colors ${
                              isFirstRow ? 'border-t-2 border-slate-300' : 'border-t border-slate-100'
                            } ${isLastRow ? 'border-b-2 border-slate-300' : ''}`}
                          >
                            {/* Customer — Merged across all stages of this MO */}
                            {isFirstRow && (
                              <td
                                rowSpan={stageCount}
                                className="py-3 px-3.5 align-middle bg-slate-50/80 border-r border-slate-200 text-slate-800"
                              >
                                <div className="flex items-start gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="font-semibold text-slate-900 block leading-tight text-xs">
                                    {group.customer}
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Nomor MO — Merged across all stages of this MO */}
                            {isFirstRow && (
                              <td
                                rowSpan={stageCount}
                                className="py-3 px-3.5 align-middle bg-slate-50/80 border-r border-slate-200"
                              >
                                <div className="space-y-1">
                                  <span className="font-mono font-bold text-blue-600 block text-xs">
                                    {group.moNumber}
                                  </span>
                                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                    {stageCount} Tahap
                                  </span>
                                </div>
                              </td>
                            )}

                            {/* Style — Merged across all stages of this MO */}
                            {isFirstRow && (
                              <td
                                rowSpan={stageCount}
                                className="py-3 px-3.5 align-middle bg-slate-50/50 border-r border-slate-200 text-slate-800"
                              >
                                <span className="font-semibold text-slate-900 block text-xs" title={group.style}>
                                  {group.style}
                                </span>
                              </td>
                            )}

                            {/* Tahap */}
                            <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                                  {stageIdx + 1}
                                </span>
                                <span>{order.productionStage}</span>
                              </span>
                            </td>

                            {/* Work Center */}
                            <td className="py-2.5 px-3 text-slate-700 max-w-[140px] truncate" title={order.workCenter || '-'}>
                              {order.workCenter || '-'}
                            </td>

                            {/* Target */}
                            <td className="py-2.5 px-3 font-mono text-right text-slate-700">
                              {order.targetQty.toLocaleString()}
                            </td>

                            {/* Output */}
                            <td className="py-2.5 px-3 font-mono text-right font-semibold text-emerald-700">
                              {order.actualQty.toLocaleString()}
                            </td>

                            {/* Progres */}
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`font-mono font-semibold text-xs ${
                                  progress >= 100 ? 'text-emerald-700' : 'text-slate-800'
                                }`}
                              >
                                {progress}%
                              </span>
                            </td>

                            {/* Kondisi / QA */}
                            <td className="py-2.5 px-3">
                              {order.productionStage === 'Sewing' && order.sewingCondition && order.sewingCondition !== 'Normal' ? (
                                <span
                                  className={`text-[10px] font-semibold px-1 py-0.2 rounded ${
                                    order.sewingCondition === 'Rework'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {order.sewingCondition}
                                </span>
                              ) : order.productionStage === 'QA' && order.qaStatus ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {order.qaStatus}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">-</span>
                              )}
                            </td>

                            {/* Aksi */}
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMO(order);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                              >
                                Detail →
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
            {moGroups.length > 3 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                Menampilkan 3 Kelompok MO pertama. Buka tab Production Monitoring untuk melihat seluruh kelompok MO dengan pagination lengkap.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
