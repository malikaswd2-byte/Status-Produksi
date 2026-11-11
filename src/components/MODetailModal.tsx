import React, { useState } from 'react';
import { usePPIC } from '../context/PPICContext';
import { calculateDeliverySummary } from '../utils/ppicCalculations';
import {
  X,
  Calendar,
  Truck,
  Plus,
  Layers,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ScheduleModal } from './ScheduleModal';
import { DeliveryModal } from './DeliveryModal';
import { DeliverySchedule, ProductionSchedule } from '../types/ppic';

export const MODetailModal: React.FC = () => {
  const {
    selectedMO,
    setSelectedMO,
    batches,
    productionSchedules,
    deliverySchedules,
  } = usePPIC();

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliverySchedule | null>(null);

  if (!selectedMO) return null;

  // Find provenance batch
  const originBatch = batches.find((b) => b.id === selectedMO.batchId);

  // Find production schedule
  const currentSchedule = productionSchedules.find((s) => s.moNumber === selectedMO.moNumber);

  // Calculate delivery summary
  const deliverySummary = calculateDeliverySummary(
    selectedMO.moNumber,
    selectedMO.targetQty,
    deliverySchedules
  );

  const balance = Math.max(0, selectedMO.targetQty - selectedMO.actualQty);
  const progressPercent =
    selectedMO.targetQty > 0
      ? Math.min(100, Math.round((selectedMO.actualQty / selectedMO.targetQty) * 100))
      : 0;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-mono tracking-tight">
                    {selectedMO.moNumber}
                  </h3>
                  {selectedMO.sewingCondition && selectedMO.sewingCondition !== 'Normal' && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        selectedMO.sewingCondition === 'Rework'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      Sewing: {selectedMO.sewingCondition}
                      {selectedMO.repairQty ? ` (${selectedMO.repairQty} pcs)` : ''}
                      {selectedMO.reworkQty ? ` (${selectedMO.reworkQty} pcs)` : ''}
                    </span>
                  )}
                  {selectedMO.qaStatus && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      QA: {selectedMO.qaStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedMO.style} {selectedMO.buyer ? `· Buyer: ${selectedMO.buyer}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedMO(null)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/50 transition-colors"
              aria-label="Tutup Detail MO"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Target Produksi
                </span>
                <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                  {selectedMO.targetQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">pcs</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Output Aktual
                </span>
                <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                  {selectedMO.actualQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">pcs</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Sisa (Balance)
                </span>
                <span className="text-base font-bold font-mono text-slate-800 tabular-nums">
                  {balance.toLocaleString()} <span className="text-xs font-normal text-slate-500">pcs</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Progres Output
                </span>
                <span className="text-base font-bold font-mono text-blue-700 tabular-nums">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* General Specs & Provenance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Production Attributes */}
              <div className="p-4 rounded-lg border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Spesifikasi Operasional
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Work Center / Line:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedMO.workCenter}
                      {selectedMO.line && selectedMO.line !== selectedMO.workCenter ? ` (${selectedMO.line})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tahap Produksi:</span>
                    <span className="font-semibold text-slate-800">{selectedMO.productionStage}</span>
                  </div>
                  {selectedMO.routing && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Routing:</span>
                      <span className="font-mono text-slate-800">{selectedMO.routing}</span>
                    </div>
                  )}
                  {selectedMO.originalQty !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Original Qty (Plan):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedMO.originalQty.toLocaleString()} pcs
                      </span>
                    </div>
                  )}
                  {selectedMO.remainingQty !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Qty Sisa (Backlog):</span>
                      <span className="font-mono font-bold text-amber-700">
                        {selectedMO.remainingQty.toLocaleString()} pcs
                      </span>
                    </div>
                  )}
                  {selectedMO.productionStage === 'Sewing' && (selectedMO.sewingCondition || selectedMO.repairQty || selectedMO.reworkQty) && (
                    <div className="flex justify-between bg-amber-50/70 p-2 rounded border border-amber-200/60">
                      <span className="text-amber-800 font-medium">Kondisi Sewing:</span>
                      <span className="font-semibold text-amber-900">
                        {selectedMO.sewingCondition || 'Normal'}
                        {selectedMO.repairQty ? ` (Repair: ${selectedMO.repairQty} pcs)` : ''}
                        {selectedMO.reworkQty ? ` (Rework: ${selectedMO.reworkQty} pcs)` : ''}
                      </span>
                    </div>
                  )}
                  {selectedMO.qaStatus && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hasil QA:</span>
                      <span className="font-medium text-emerald-800">{selectedMO.qaStatus}</span>
                    </div>
                  )}
                  {selectedMO.buyer && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buyer / Customer:</span>
                      <span className="font-medium text-slate-800">{selectedMO.buyer}</span>
                    </div>
                  )}
                  {selectedMO.notes && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Catatan:</span>
                      <span className="font-medium text-slate-700">{selectedMO.notes}</span>
                    </div>
                  )}
                </div>
              </div>


              {/* Provenance Origin Batch */}
              <div className="p-4 rounded-lg border border-slate-200 space-y-2.5 bg-slate-50/40">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Asal Data (Batch Upload Audit)
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Batch ID:</span>
                    <span className="font-mono text-slate-700">{originBatch?.batchNumber || selectedMO.batchId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama File:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[200px]" title={originBatch?.fileName}>
                      {originBatch?.fileName || 'Sistem Bawaan'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Ingesti:</span>
                    <span className="font-mono text-slate-700">
                      {originBatch ? new Date(originBatch.uploadDate).toLocaleString('id-ID') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Production Schedule Section */}
            <div className="p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Jadwal Produksi (Gantt Timeline)
                </h4>
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  {currentSchedule ? 'Edit Jadwal' : '+ Atur Jadwal Produksi'}
                </button>
              </div>

              {currentSchedule ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Jadwal Mulai - Selesai:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {currentSchedule.startDate} s/d {currentSchedule.endDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Line / Work Center:</span>
                    <span className="font-semibold text-slate-800">{currentSchedule.workCenter}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status Timeline:</span>
                    <span className="font-medium text-blue-700">{currentSchedule.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  MO ini belum memiliki jadwal produksi pada kalender Gantt. Klik tombol di atas untuk menjadwalkan.
                </p>
              )}
            </div>

            {/* Multiple Delivery Scheduling Section */}
            <div className="p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    Jadwal Pengiriman (Multiple Delivery Schedule)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Satu MO dapat memiliki beberapa termin pengiriman bertahap (multiple delivery).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDelivery(null);
                    setIsDeliveryModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Delivery
                </button>
              </div>

              {/* Delivery Balance Summary */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono p-2.5 bg-slate-50 rounded-md border border-slate-100">
                <div>
                  <span className="text-slate-500">Total Order: </span>
                  <strong className="text-slate-800">{selectedMO.targetQty.toLocaleString()} pcs</strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-slate-500">Telah Dijadwalkan Kirim: </span>
                  <strong className="text-emerald-700">
                    {deliverySummary.totalScheduledDeliveryQty.toLocaleString()} pcs
                  </strong>
                </div>
                <span className="text-slate-300">|</span>
                <div>
                  <span className="text-slate-500">Sisa Belum Dijadwalkan: </span>
                  <strong
                    className={
                      deliverySummary.remainingQty > 0 ? 'text-amber-700' : 'text-slate-500'
                    }
                  >
                    {deliverySummary.remainingQty.toLocaleString()} pcs
                  </strong>
                </div>
              </div>

              {/* Delivery Table */}
              {deliverySummary.deliveries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-md">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Termin Delivery</th>
                        <th className="py-2 px-3 font-semibold">Tgl Pengiriman</th>
                        <th className="py-2 px-3 font-semibold text-right">Kuantitas</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Catatan</th>
                        <th className="py-2 px-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliverySummary.deliveries.map((del, idx) => (
                        <tr key={del.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-medium text-slate-800">
                            Pengiriman #{idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">{del.deliveryDate}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-right text-slate-900">
                            {del.quantity.toLocaleString()} pcs
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                                del.status === 'Shipped'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : del.status === 'Delayed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {del.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                            {del.notes || '-'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => {
                                setEditingDelivery(del);
                                setIsDeliveryModalOpen(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  Belum ada jadwal delivery yang dicatat untuk MO ini. Klik tombol di atas untuk menambahkan delivery pertama.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 flex justify-end bg-slate-50">
            <button
              onClick={() => setSelectedMO(null)}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Linked Modals */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        targetOrder={selectedMO}
        existingSchedule={currentSchedule}
      />

      <DeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => {
          setIsDeliveryModalOpen(false);
          setEditingDelivery(null);
        }}
        targetOrder={selectedMO}
        existingDelivery={editingDelivery}
      />
    </>
  );
};
