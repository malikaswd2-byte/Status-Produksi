import React from 'react';
import { usePPIC } from '../context/PPICContext';
import {
  calculateKPIs,
  aggregateWorkCenters,
  aggregateStyles,
  aggregateProductionStages,
  aggregateQAStatus,
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
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { filteredOrders, productionSchedules, deliverySchedules, setSelectedMO, setActiveTab } =
    usePPIC();

  // Dynamic calculations based strictly on filtered active data
  const kpis = calculateKPIs(filteredOrders, productionSchedules, deliverySchedules);
  const workCentersData = aggregateWorkCenters(filteredOrders);
  const stylesData = aggregateStyles(filteredOrders);
  const stagesData = aggregateProductionStages(filteredOrders);
  const qaData = aggregateQAStatus(filteredOrders);

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
          <p className="text-[11px] text-slate-500 mt-1">Rencana akumulasi</p>
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
            Realisasi lapangan
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
              style={{ width: `${kpis.progressPercent}%` }}
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
        <QAStatusDonut data={qaData} />
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

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500">
              Tidak ada Manufacturing Order yang cocok dengan filter aktif. Silakan reset filter atau masukkan kata kunci lain.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Nomor MO</th>
                  <th className="py-2.5 px-4 font-semibold">Style</th>
                  <th className="py-2.5 px-4 font-semibold">Work Center</th>
                  <th className="py-2.5 px-4 font-semibold">Tahap</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Target (pcs)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Output (pcs)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Progres</th>
                  <th className="py-2.5 px-4 font-semibold">Status QA</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.slice(0, 10).map((order) => {
                  const progress =
                    order.targetQty > 0
                      ? Math.min(100, Math.round((order.actualQty / order.targetQty) * 100))
                      : 0;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedMO(order)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-semibold text-blue-600">
                        {order.moNumber}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{order.style}</td>
                      <td className="py-2.5 px-4 text-slate-600">{order.workCenter}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <span>{order.productionStage}</span>
                        {order.productionStage === 'Sewing' && order.sewingCondition && order.sewingCondition !== 'Normal' && (
                          <span
                            className={`ml-1 text-[10px] font-semibold px-1 py-0.2 rounded ${
                              order.sewingCondition === 'Rework'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.sewingCondition}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right text-slate-700">
                        {order.targetQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right text-emerald-700 font-semibold">
                        {order.actualQty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        <span
                          className={`font-semibold ${
                            progress >= 100 ? 'text-emerald-700' : 'text-slate-800'
                          }`}
                        >
                          {progress}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {order.qaStatus ? (
                          <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {order.qaStatus}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMO(order);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Detail →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredOrders.length > 10 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                Menampilkan 10 dari {filteredOrders.length} MO. Gunakan tab Production Monitoring untuk melihat seluruh tabel dengan pagination lengkap.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
