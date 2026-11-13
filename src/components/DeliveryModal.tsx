import React, { useState, useEffect } from 'react';
import { usePPIC } from '../context/PPICContext';
import { ManufacturingOrder, DeliverySchedule } from '../types/ppic';
import { Truck, X, AlertTriangle } from 'lucide-react';
import { calculateDeliverySummary } from '../utils/ppicCalculations';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetOrder?: ManufacturingOrder | null;
  existingDelivery?: DeliverySchedule | null;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  targetOrder,
  existingDelivery,
}) => {
  const { orders, deliverySchedules, saveDeliverySchedule, deleteDeliverySchedule } = usePPIC();

  const [moNumber, setMoNumber] = useState('');
  const [style, setStyle] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DeliverySchedule['status']>('Planned');
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingDelivery) {
      setMoNumber(existingDelivery.moNumber);
      setStyle(existingDelivery.style);
      setDeliveryDate(existingDelivery.deliveryDate);
      setQuantity(existingDelivery.quantity);
      setNotes(existingDelivery.notes || '');
      setStatus(existingDelivery.status);
    } else if (targetOrder) {
      setMoNumber(targetOrder.moNumber);
      setStyle(targetOrder.style);
      setDeliveryDate(targetOrder.deliveryDate || '');

      // Calculate remaining balance to recommend quantity
      const orderQty = targetOrder.originalQty ?? targetOrder.targetQty;
      const summary = calculateDeliverySummary(
        targetOrder.moNumber,
        orderQty,
        deliverySchedules
      );
      setQuantity(summary.remainingQty > 0 ? summary.remainingQty : orderQty);
      setNotes('');
      setStatus('Planned');
    } else {
      setMoNumber('');
      setStyle('');
      setDeliveryDate('');
      setQuantity(0);
      setNotes('');
      setStatus('Planned');
    }
    setError('');
  }, [existingDelivery, targetOrder, deliverySchedules, isOpen]);

  const handleMOChange = (selectedMo: string) => {
    setMoNumber(selectedMo);
    const matched = orders.find((o) => o.moNumber === selectedMo);
    if (matched) {
      setStyle(matched.style);
      const summary = calculateDeliverySummary(
        matched.moNumber,
        matched.targetQty,
        deliverySchedules
      );
      setQuantity(summary.remainingQty > 0 ? summary.remainingQty : matched.targetQty);
      if (matched.deliveryDate) setDeliveryDate(matched.deliveryDate);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moNumber.trim()) {
      setError('Nomor MO wajib dipilih atau diisi.');
      return;
    }
    if (!deliveryDate) {
      setError('Tanggal pengiriman wajib diisi.');
      return;
    }
    if (quantity <= 0) {
      setError('Jumlah kuantitas kirim harus lebih besar dari 0.');
      return;
    }

    const itemToSave: DeliverySchedule = {
      id: existingDelivery?.id || `del-${Date.now()}`,
      moNumber: moNumber.trim(),
      style: style.trim(),
      deliveryDate,
      quantity: Number(quantity),
      notes: notes.trim(),
      status,
      createdAt: existingDelivery?.createdAt || new Date().toISOString(),
    };

    saveDeliverySchedule(itemToSave);
    onClose();
  };

  const handleDelete = () => {
    if (!existingDelivery) return;
    if (window.confirm(`Hapus jadwal pengiriman ini (${existingDelivery.quantity} pcs)?`)) {
      deleteDeliverySchedule(existingDelivery.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  const uniqueMOs = Array.from(new Set(orders.map((o) => o.moNumber)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              {existingDelivery ? 'Edit Jadwal Pengiriman' : 'Tambah Jadwal Pengiriman (Delivery)'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* MO Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nomor MO (Manufacturing Order) *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={moNumber}
                onChange={(e) => setMoNumber(e.target.value)}
                placeholder="Pilih atau ketik MO..."
                className="flex-1 py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
                required
              />
              {uniqueMOs.length > 0 && (
                <select
                  onChange={(e) => e.target.value && handleMOChange(e.target.value)}
                  className="w-36 py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-hidden"
                >
                  <option value="">Pilih MO...</option>
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Style</label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Contoh: Mens Pique Polo Shirt"
              className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Delivery Date & Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Kirim *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Qty Kirim (pcs) *</label>
              <input
                type="number"
                min="1"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden font-mono"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status Pengiriman</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DeliverySchedule['status'])}
              className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
            >
              <option value="Planned">Planned (Telah Direncanakan)</option>
              <option value="Shipped">Shipped (Telah Terkirim / Selesai)</option>
              <option value="Delayed">Delayed (Mengalami Penundaan)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Catatan Delivery (Batch/Ekspedisi/Tujuan)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Batch 1 - Pengiriman Jalur Udara Tokyo DC"
              className="w-full py-1.5 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {existingDelivery ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
              >
                Hapus
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
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs"
              >
                {existingDelivery ? 'Simpan Perubahan' : 'Tambah Delivery'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
