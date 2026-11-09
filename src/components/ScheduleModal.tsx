import React, { useState, useEffect } from 'react';
import { usePPIC } from '../context/PPICContext';
import { ManufacturingOrder, ProductionSchedule } from '../types/ppic';
import { Calendar, X, AlertTriangle } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetOrder?: ManufacturingOrder | null;
  existingSchedule?: ProductionSchedule | null;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  targetOrder,
  existingSchedule,
}) => {
  const { orders, saveProductionSchedule, deleteProductionSchedule } = usePPIC();

  const [moNumber, setMoNumber] = useState('');
  const [style, setStyle] = useState('');
  const [workCenter, setWorkCenter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetQty, setTargetQty] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ProductionSchedule['status']>('Scheduled');
  const [error, setError] = useState('');

  // Extract unique work centers from orders
  const workCenters = Array.from(new Set(orders.map((o) => o.workCenter).filter(Boolean)));

  useEffect(() => {
    if (existingSchedule) {
      setMoNumber(existingSchedule.moNumber);
      setStyle(existingSchedule.style);
      setWorkCenter(existingSchedule.workCenter);
      setStartDate(existingSchedule.startDate);
      setEndDate(existingSchedule.endDate);
      setTargetQty(existingSchedule.targetQty);
      setNotes(existingSchedule.notes || '');
      setStatus(existingSchedule.status);
    } else if (targetOrder) {
      setMoNumber(targetOrder.moNumber);
      setStyle(targetOrder.style);
      setWorkCenter(targetOrder.workCenter);
      setStartDate(targetOrder.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(targetOrder.endDate || new Date().toISOString().split('T')[0]);
      setTargetQty(targetOrder.targetQty);
      setNotes(targetOrder.notes || '');
      setStatus('Scheduled');
    } else {
      setMoNumber('');
      setStyle('');
      setWorkCenter(workCenters[0] || 'Sewing Line 01');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setTargetQty(100);
      setNotes('');
      setStatus('Scheduled');
    }
    setError('');
  }, [existingSchedule, targetOrder, isOpen]);

  // Handle selecting an existing MO from dropdown
  const handleMOChange = (selectedMo: string) => {
    setMoNumber(selectedMo);
    const matched = orders.find((o) => o.moNumber === selectedMo);
    if (matched) {
      setStyle(matched.style);
      if (matched.workCenter) setWorkCenter(matched.workCenter);
      if (matched.targetQty) setTargetQty(matched.targetQty);
      if (matched.startDate) setStartDate(matched.startDate);
      if (matched.endDate) setEndDate(matched.endDate);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moNumber.trim()) {
      setError('Nomor MO wajib diisi.');
      return;
    }
    if (!style.trim()) {
      setError('Nama Style wajib diisi.');
      return;
    }
    if (!workCenter.trim()) {
      setError('Work Center wajib dipilih.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Tanggal mulai dan selesai wajib ditentukan.');
      return;
    }
    if (endDate < startDate) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    if (targetQty <= 0) {
      setError('Target kuantitas harus lebih dari 0.');
      return;
    }

    const scheduleToSave: ProductionSchedule = {
      id: existingSchedule?.id || `sched-${Date.now()}`,
      moNumber: moNumber.trim(),
      style: style.trim(),
      workCenter: workCenter.trim(),
      startDate,
      endDate,
      targetQty: Number(targetQty),
      notes: notes.trim(),
      status,
      createdAt: existingSchedule?.createdAt || new Date().toISOString(),
    };

    saveProductionSchedule(scheduleToSave);
    onClose();
  };

  const handleDelete = () => {
    if (!existingSchedule) return;
    if (window.confirm(`Yakin ingin menghapus jadwal produksi untuk MO ${existingSchedule.moNumber}?`)) {
      deleteProductionSchedule(existingSchedule.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  const uniqueMOs = Array.from(new Set(orders.map((o) => o.moNumber)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              {existingSchedule ? 'Edit Jadwal Produksi' : 'Tambah Jadwal Produksi Manual'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* MO Selection / Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nomor MO (Manufacturing Order) *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={moNumber}
                onChange={(e) => setMoNumber(e.target.value)}
                placeholder="Contoh: MO-2026-101"
                className="flex-1 py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
                required
              />
              {uniqueMOs.length > 0 && (
                <select
                  onChange={(e) => e.target.value && handleMOChange(e.target.value)}
                  className="w-40 py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-hidden"
                >
                  <option value="">Pilih dari MO Aktif...</option>
                  {uniqueMOs.map((mo) => (
                    <option key={mo} value={mo}>
                      {mo}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Style / Produk *</label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Contoh: Mens Pique Polo Shirt"
              className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Work Center */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Work Center / Line Produksi *
            </label>
            <input
              type="text"
              list="wc-list"
              value={workCenter}
              onChange={(e) => setWorkCenter(e.target.value)}
              placeholder="Pilih atau ketik Work Center"
              className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
              required
            />
            <datalist id="wc-list">
              {workCenters.map((wc) => (
                <option key={wc} value={wc} />
              ))}
            </datalist>
          </div>

          {/* Dates: Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Mulai *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Selesai *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Target Quantity & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Produksi (pcs) *
              </label>
              <input
                type="number"
                min="1"
                value={targetQty || ''}
                onChange={(e) => setTargetQty(Number(e.target.value))}
                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status Penjadwalan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductionSchedule['status'])}
                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Scheduled">Scheduled (Terjadwal)</option>
                <option value="In Production">In Production (Sedang Jalan)</option>
                <option value="Completed">Completed (Selesai)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Catatan PPIC</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan kapasitas, kesiapan bahan, atau instruksi kerja..."
              className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {existingSchedule ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
              >
                Hapus Jadwal
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
              >
                {existingSchedule ? 'Simpan Perubahan' : 'Buat Jadwal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
