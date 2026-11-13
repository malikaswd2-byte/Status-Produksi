import React, { useState, useMemo } from 'react';
import { usePPIC } from '../context/PPICContext';
import { FilterBar } from '../components/FilterBar';
import { ScheduleModal } from '../components/ScheduleModal';
import { DeliveryModal } from '../components/DeliveryModal';
import { ProductionSchedule, DeliverySchedule, ManufacturingOrder } from '../types/ppic';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Truck,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  FileText,
  Search,
} from 'lucide-react';
import { calculateDeliverySummary } from '../utils/ppicCalculations';

export const GanttCalendarView: React.FC = () => {
  const {
    orders,
    filteredOrders,
    productionSchedules,
    deliverySchedules,
    setSelectedMO,
    deleteProductionSchedule,
    deleteDeliverySchedule,
  } = usePPIC();

  // Calendar timeline view state defaults to current real month
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [activeSubTab, setActiveSubTab] = useState<'gantt' | 'deliveries'>('gantt');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProductionSchedule | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliverySchedule | null>(null);
  const [targetOrderForModal, setTargetOrderForModal] = useState<ManufacturingOrder | null>(null);

  // Search filter for deliveries
  const [deliverySearch, setDeliverySearch] = useState('');

  // Number of days in current selected month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const monthName = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentYear, currentMonth]);

  // Navigate month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Distinct Work Centers from both orders and schedules (excluding '-')
  const workCenters = useMemo(() => {
    const set = new Set<string>();
    filteredOrders.forEach((o) => {
      const wc = o.workCenter?.trim();
      if (wc && wc !== '-') set.add(wc);
    });
    productionSchedules.forEach((s) => {
      const wc = s.workCenter?.trim();
      if (wc && wc !== '-') set.add(wc);
    });
    return Array.from(set).sort();
  }, [filteredOrders, productionSchedules]);

  // Unscheduled MOs: orders that are in filteredOrders without manual schedule or Excel startDate/endDate
  const unscheduledOrders = useMemo(() => {
    const scheduledMONumbers = new Set(productionSchedules.map((s) => s.moNumber));
    return filteredOrders.filter(
      (o) => !scheduledMONumbers.has(o.moNumber) && !(o.startDate && o.endDate)
    );
  }, [filteredOrders, productionSchedules]);

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    if (!deliverySearch.trim()) return deliverySchedules;
    const q = deliverySearch.toLowerCase();
    return deliverySchedules.filter(
      (d) =>
        d.moNumber.toLowerCase().includes(q) ||
        d.style.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q)
    );
  }, [deliverySchedules, deliverySearch]);

  // Group deliveries by MO for multiple delivery overview
  const deliveriesByMO = useMemo(() => {
    const map = new Map<string, DeliverySchedule[]>();
    for (const d of filteredDeliveries) {
      if (!map.has(d.moNumber)) {
        map.set(d.moNumber, []);
      }
      map.get(d.moNumber)!.push(d);
    }
    return map;
  }, [filteredDeliveries]);

  // Open schedule modal for new order
  const handleOpenNewSchedule = (order?: ManufacturingOrder) => {
    setEditingSchedule(null);
    setTargetOrderForModal(order || null);
    setIsScheduleModalOpen(true);
  };

  // Open delivery modal
  const handleOpenNewDelivery = (order?: ManufacturingOrder) => {
    setEditingDelivery(null);
    setTargetOrderForModal(order || null);
    setIsDeliveryModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Gantt Calendar & Jadwal Pengiriman
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Perencanaan lini produksi manufaktur dan pengelolaan pengiriman bertahap (multiple delivery)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNewDelivery()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            + Tambah Delivery
          </button>
          <button
            onClick={() => handleOpenNewSchedule()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            + Buat Jadwal Produksi
          </button>
        </div>
      </div>

      {/* Sub Tabs: Gantt vs Deliveries */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab('gantt')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'gantt'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
          Timeline Gantt Lini Produksi
        </button>
        <button
          onClick={() => setActiveSubTab('deliveries')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'deliveries'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-emerald-600" />
          Jadwal Pengiriman (Multiple Deliveries)
          <span className="ml-1 text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
            {deliverySchedules.length}
          </span>
        </button>
      </div>

      {/* View 1: Timeline Gantt */}
      {activeSubTab === 'gantt' && (
        <>
          {/* Filter Bar */}
          <FilterBar />

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            {/* Calendar Month Navigation Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1 rounded hover:bg-slate-200/80 text-slate-600 transition-colors"
                    aria-label="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-sm text-slate-900 min-w-[140px] text-center font-mono">
                    {monthName}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1 rounded hover:bg-slate-200/80 text-slate-600 transition-colors"
                    aria-label="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleCurrentMonth}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                  Bulan Ini
                </button>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                  <span>In Production</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3 h-3 text-emerald-600" />
                  <span>Milestone Delivery</span>
                </div>
              </div>
            </div>

            {/* Gantt Matrix Grid */}
            <div className="overflow-x-auto relative">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-mono text-slate-600 border-b border-slate-200">
                    {/* Fixed Left Column for Work Center */}
                    <th className="sticky left-0 z-20 bg-slate-100 py-2 px-3 text-left w-52 min-w-[200px] border-r border-slate-200 font-semibold text-slate-800 shadow-xs">
                      Work Center / Lini
                    </th>
                    {/* Days of Month Header */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
                        day
                      ).padStart(2, '0')}`;
                      const isWeekend = new Date(currentYear, currentMonth, day).getDay() % 6 === 0;

                      return (
                        <th
                          key={day}
                          className={`py-2 px-1 text-center w-9 min-w-[36px] border-r border-slate-200 font-medium ${
                            isWeekend ? 'bg-slate-200/50 text-slate-400' : 'text-slate-700'
                          }`}
                        >
                          <span className="block text-[10px] text-slate-400">
                            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][
                              new Date(currentYear, currentMonth, day).getDay()
                            ]}
                          </span>
                          <span>{day}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {workCenters.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="p-8 text-center text-xs text-slate-500">
                        Belum ada Work Center atau jadwal produksi aktif. Upload file Excel atau klik "+ Buat Jadwal Produksi" untuk menambahkan jadwal secara manual.
                      </td>
                    </tr>
                  ) : (
                    workCenters.map((wc) => {
                    // Schedules on this work center
                    const wcSchedules = productionSchedules.filter((s) => s.workCenter === wc);

                    return (
                      <tr key={wc} className="hover:bg-slate-50/50 transition-colors">
                        {/* Sticky Work Center Header */}
                        <td className="sticky left-0 z-10 bg-white py-3 px-3 border-r border-slate-200 font-semibold text-slate-800 shadow-xs">
                          <div className="truncate font-medium" title={wc}>
                            {wc}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {wcSchedules.length} aktivitas
                          </span>
                        </td>

                        {/* Calendar Day Cells & Overlay Bars */}
                        <td
                          colSpan={daysInMonth}
                          className="relative p-0 h-16 border-r border-slate-100"
                        >
                          {/* Day Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-30 pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(36px, 1fr))` }}>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                              const day = i + 1;
                              const isWeekend =
                                new Date(currentYear, currentMonth, day).getDay() % 6 === 0;
                              return (
                                <div
                                  key={day}
                                  className={`border-r border-slate-100 h-full ${
                                    isWeekend ? 'bg-slate-50/40' : ''
                                  }`}
                                />
                              );
                            })}
                          </div>

                          {/* Render Production Schedule Bars */}
                          <div className="relative z-1 h-full py-1.5 flex flex-col justify-center gap-1 px-1">
                            {wcSchedules.map((schedule) => {
                              // Compute horizontal start and span
                              const start = new Date(schedule.startDate);
                              const end = new Date(schedule.endDate);

                              // Only render if overlaps with current month
                              const monthStart = new Date(currentYear, currentMonth, 1);
                              const monthEnd = new Date(currentYear, currentMonth, daysInMonth);

                              if (end < monthStart || start > monthEnd) return null;

                              const startDay = Math.max(1, start.getMonth() === currentMonth && start.getFullYear() === currentYear ? start.getDate() : 1);
                              const endDay = Math.min(daysInMonth, end.getMonth() === currentMonth && end.getFullYear() === currentYear ? end.getDate() : daysInMonth);

                              const duration = Math.max(1, endDay - startDay + 1);

                              const leftPercent = ((startDay - 1) / daysInMonth) * 100;
                              const widthPercent = (duration / daysInMonth) * 100;

                              const barBg =
                                schedule.status === 'Completed'
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : schedule.status === 'In Production'
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700';

                              return (
                                <div
                                  key={schedule.id}
                                  onClick={() => {
                                    setEditingSchedule(schedule);
                                    setIsScheduleModalOpen(true);
                                  }}
                                  className={`relative h-7 rounded-sm ${barBg} text-white px-2 py-0.5 text-[11px] font-medium flex items-center justify-between cursor-pointer shadow-xs transition-transform hover:scale-[1.01] overflow-hidden truncate`}
                                  style={{
                                    marginLeft: `${leftPercent}%`,
                                    width: `${Math.max(3, widthPercent)}%`,
                                  }}
                                  title={`${schedule.moNumber} (${schedule.style}): ${schedule.startDate} s/d ${schedule.endDate} (${schedule.targetQty} pcs)`}
                                >
                                  <span className="truncate font-semibold">{schedule.moNumber}</span>
                                  <span className="hidden sm:inline font-mono text-[10px] opacity-90 ml-1">
                                    {schedule.targetQty} pcs
                                  </span>
                                </div>
                              );
                            })}

                            {/* Render Delivery Milestone Markers for this work center */}
                            {deliverySchedules.map((del) => {
                              const delDate = new Date(del.deliveryDate);
                              if (delDate.getMonth() !== currentMonth || delDate.getFullYear() !== currentYear)
                                return null;

                              // Check if this delivery belongs to an MO scheduled or produced on this work center
                              const matchesWC =
                                wcSchedules.some((s) => s.moNumber === del.moNumber) ||
                                orders.some((o) => o.moNumber === del.moNumber && o.workCenter === wc);
                              if (!matchesWC) return null;

                              const day = delDate.getDate();
                              const leftPercent = ((day - 0.5) / daysInMonth) * 100;

                              return (
                                <div
                                  key={`marker-${del.id}`}
                                  onClick={() => {
                                    setEditingDelivery(del);
                                    setIsDeliveryModalOpen(true);
                                  }}
                                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer group z-10"
                                  style={{ left: `${leftPercent}%` }}
                                  title={`Pengiriman: ${del.moNumber} (${del.quantity} pcs) pada ${del.deliveryDate}`}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-xs group-hover:scale-125 transition-transform" />
                                  <span className="hidden group-hover:block absolute bottom-full mb-1 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-30">
                                    {del.moNumber}: {del.quantity} pcs
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unscheduled MOs Drawer Panel (Section 6.A) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Daftar MO Belum Terjadwal di Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order produksi yang belum dialokasikan tanggal pengerjaan di kalender Gantt
                </p>
              </div>
              <span className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                {unscheduledOrders.length} MO Menunggu Jadwal
              </span>
            </div>

            {unscheduledOrders.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {filteredOrders.length === 0
                    ? 'Belum ada Manufacturing Order aktif.'
                    : 'Seluruh Manufacturing Order aktif telah memiliki jadwal produksi.'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unscheduledOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-blue-600">
                          {order.moNumber}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {order.targetQty.toLocaleString()} pcs
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 mt-1 truncate">
                        {order.style}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lini: {order.workCenter || '-'} · Tahap: {order.productionStage}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setSelectedMO(order)}
                        className="flex-1 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors font-medium text-center"
                      >
                        Detail MO
                      </button>
                      <button
                        onClick={() => handleOpenNewSchedule(order)}
                        className="flex-1 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium text-center shadow-2xs"
                      >
                        + Jadwalkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* View 2: Multiple Delivery Management (Section 6.C) */}
      {activeSubTab === 'deliveries' && (
        <div className="space-y-6">
          {/* Deliveries Search & Stat Header */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={deliverySearch}
                onChange={(e) => setDeliverySearch(e.target.value)}
                placeholder="Cari nomor MO, Style, atau keterangan delivery..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:border-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-slate-500">
                Total Termin Kirim: <strong className="text-slate-800">{deliverySchedules.length}</strong>
              </div>
              <span className="text-slate-300">|</span>
              <div className="text-slate-500">
                Total Volume Terjadwal:{' '}
                <strong className="text-emerald-700">
                  {deliverySchedules.reduce((sum, d) => sum + d.quantity, 0).toLocaleString()} pcs
                </strong>
              </div>
            </div>
          </div>

          {/* Grouped Multiple Deliveries per MO Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Jadwal Pengiriman per Manufacturing Order (Multiple Delivery)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian setiap termin pengiriman bertahap yang terhubung ke masing-masing order
              </p>
            </div>

            {deliveriesByMO.size === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada jadwal pengiriman
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {Array.from(deliveriesByMO.entries()).map(([moNo, dList]) => {
                  const matchingOrder = orders.find((o) => o.moNumber === moNo);
                  const orderTarget = matchingOrder?.originalQty ?? matchingOrder?.targetQty ?? 0;
                  const totalDelivered = dList.reduce((sum, d) => sum + d.quantity, 0);
                  const remaining = Math.max(0, orderTarget - totalDelivered);

                  return (
                    <div key={moNo} className="p-5 hover:bg-slate-50/40 transition-colors">
                      {/* MO Summary Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-blue-600">{moNo}</span>
                          <span className="text-xs font-semibold text-slate-800">
                            {dList[0]?.style || matchingOrder?.style || 'Style'}
                          </span>
                          {matchingOrder?.buyer && (
                            <span className="text-xs text-slate-500">({matchingOrder.buyer})</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-slate-500">
                            Order Target: <strong>{orderTarget.toLocaleString()} pcs</strong>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500">
                            Total Kirim:{' '}
                            <strong className="text-emerald-700">{totalDelivered.toLocaleString()} pcs</strong>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500">
                            Sisa:{' '}
                            <strong className={remaining > 0 ? 'text-amber-700' : 'text-slate-500'}>
                              {remaining.toLocaleString()} pcs
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Deliveries Sub-table */}
                      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 font-semibold">Termin</th>
                              <th className="py-2 px-3 font-semibold">Tanggal Pengiriman</th>
                              <th className="py-2 px-3 font-semibold text-right">Kuantitas</th>
                              <th className="py-2 px-3 font-semibold">Status</th>
                              <th className="py-2 px-3 font-semibold">Catatan / Ekspedisi</th>
                              <th className="py-2 px-3 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dList.map((del, idx) => (
                              <tr key={del.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-medium text-slate-700">
                                  Pengiriman #{idx + 1}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-800">
                                  {del.deliveryDate}
                                </td>
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
                                <td className="py-2 px-3 text-slate-600">{del.notes || '-'}</td>
                                <td className="py-2 px-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingDelivery(del);
                                        setIsDeliveryModalOpen(true);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Hapus pengiriman #${idx + 1} (${del.quantity} pcs)?`)) {
                                          deleteDeliverySchedule(del.id);
                                        }
                                      }}
                                      className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected Modals */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
          setTargetOrderForModal(null);
        }}
        targetOrder={targetOrderForModal}
        existingSchedule={editingSchedule}
      />

      <DeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => {
          setIsDeliveryModalOpen(false);
          setEditingDelivery(null);
          setTargetOrderForModal(null);
        }}
        targetOrder={targetOrderForModal}
        existingDelivery={editingDelivery}
      />
    </div>
  );
};
