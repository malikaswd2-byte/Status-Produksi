import {
  UploadBatch,
  ManufacturingOrder,
  ProductionSchedule,
  DeliverySchedule,
} from '../types/ppic';

const STORAGE_KEYS = {
  BATCHES: 'ppic_upload_batches_v1',
  ACTIVE_BATCH_ID: 'ppic_active_batch_id_v1',
  ORDERS: 'ppic_orders_v1',
  PRODUCTION_SCHEDULES: 'ppic_prod_schedules_v1',
  DELIVERY_SCHEDULES: 'ppic_deliv_schedules_v1',
};

export interface IPPICRepository {
  getBatches(): UploadBatch[];
  getActiveBatch(): UploadBatch | null;
  setActiveBatch(batchId: string): void;
  saveBatch(batch: UploadBatch, orders: ManufacturingOrder[]): void;
  deleteBatch(batchId: string): void;
  getOrders(batchId?: string): ManufacturingOrder[];
  getProductionSchedules(): ProductionSchedule[];
  saveProductionSchedule(schedule: ProductionSchedule): void;
  deleteProductionSchedule(id: string): void;
  getDeliverySchedules(): DeliverySchedule[];
  saveDeliverySchedule(delivery: DeliverySchedule): void;
  deleteDeliverySchedule(id: string): void;
  resetToInitialData(): void;
}

const INITIAL_BATCH_ID = 'BATCH-20261108-SEED';

const INITIAL_BATCH: UploadBatch = {
  id: INITIAL_BATCH_ID,
  batchNumber: 'BATCH-202611-001',
  fileName: 'Master_Production_Schedule_Nov2026.xlsx',
  uploadDate: '2026-11-08T08:00:00.000Z',
  totalRows: 10,
  moCount: 8,
  styleCount: 6,
  workCenterCount: 6,
  status: 'active',
  columnMappings: {
    moNumber: 'Nomor MO',
    style: 'Style',
    workCenter: 'Work Center',
    productionStage: 'Tahap Produksi',
    targetQty: 'Target Qty',
    actualQty: 'Actual Qty',
    qaStatus: 'Status QA',
    startDate: 'Tgl Mulai',
    endDate: 'Tgl Selesai',
    deliveryDate: 'Tgl Pengiriman',
    buyer: 'Buyer',
  },
  warnings: [],
};

const INITIAL_ORDERS: ManufacturingOrder[] = [
  {
    id: `${INITIAL_BATCH_ID}-1`,
    moNumber: 'MO-2026-101',
    style: 'Mens Pique Polo Shirt',
    workCenter: 'Sewing Line 01',
    productionStage: 'Sewing',
    targetQty: 1200,
    actualQty: 950,
    qaStatus: 'Passed',
    startDate: '2026-11-03',
    endDate: '2026-11-14',
    deliveryDate: '2026-11-18',
    buyer: 'Uniqlo Global',
    notes: 'Priority batch 1 for Spring launch',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-2`,
    moNumber: 'MO-2026-102',
    style: 'Slim Fit Chino Trousers',
    workCenter: 'Sewing Line 03',
    productionStage: 'Sewing',
    targetQty: 850,
    actualQty: 850,
    qaStatus: 'Passed',
    startDate: '2026-11-01',
    endDate: '2026-11-09',
    deliveryDate: '2026-11-12',
    buyer: 'Zara Men',
    notes: 'Completed ahead of schedule',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-3`,
    moNumber: 'MO-2026-103',
    style: 'Slim Fit Chino Trousers',
    workCenter: 'Finishing Line',
    productionStage: 'Ironing & Packing',
    targetQty: 850,
    actualQty: 420,
    qaStatus: 'In-Inspection',
    startDate: '2026-11-08',
    endDate: '2026-11-16',
    deliveryDate: '2026-11-20',
    buyer: 'Zara Men',
    notes: 'Barcode scanning verification in progress',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-4`,
    moNumber: 'MO-2026-104',
    style: 'Heavyweight Cotton Hoodie',
    workCenter: 'Cutting Section',
    productionStage: 'Cutting',
    targetQty: 2000,
    actualQty: 1950,
    qaStatus: 'Passed',
    startDate: '2026-11-04',
    endDate: '2026-11-11',
    deliveryDate: '2026-11-25',
    buyer: 'H&M Basic',
    notes: 'Fabric relaxed 24 hours prior',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-5`,
    moNumber: 'MO-2026-105',
    style: 'Heavyweight Cotton Hoodie',
    workCenter: 'Sewing Line 02',
    productionStage: 'Sewing',
    targetQty: 2000,
    actualQty: 750,
    qaStatus: 'Rework',
    startDate: '2026-11-10',
    endDate: '2026-11-22',
    deliveryDate: '2026-11-28',
    buyer: 'H&M Basic',
    notes: 'Cuff stitching tension recalibrated',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-6`,
    moNumber: 'MO-2026-106',
    style: 'Oxford Casual Button-Down',
    workCenter: 'Sewing Line 01',
    productionStage: 'Sewing',
    targetQty: 600,
    actualQty: 180,
    qaStatus: 'In-Inspection',
    startDate: '2026-11-12',
    endDate: '2026-11-20',
    deliveryDate: '2026-11-26',
    buyer: 'Marks & Spencer',
    notes: 'Collar interfacing quality checked',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-7`,
    moNumber: 'MO-2026-107',
    style: 'Water-Repellent Windbreaker',
    workCenter: 'Cutting Section',
    productionStage: 'Cutting',
    targetQty: 1500,
    actualQty: 1500,
    qaStatus: 'Passed',
    startDate: '2026-11-06',
    endDate: '2026-11-13',
    deliveryDate: '2026-11-30',
    buyer: 'Columbia Sportswear',
    notes: 'Laser precision cut completed',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-8`,
    moNumber: 'MO-2026-108',
    style: 'Water-Repellent Windbreaker',
    workCenter: 'Sewing Line 04',
    productionStage: 'Seam Sealing & Sewing',
    targetQty: 1500,
    actualQty: 320,
    qaStatus: 'Pending',
    startDate: '2026-11-14',
    endDate: '2026-11-27',
    deliveryDate: '2026-11-30',
    buyer: 'Columbia Sportswear',
    notes: 'Waterproof seam tape temperature test',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-9`,
    moNumber: 'MO-2026-109',
    style: 'Denim Jacket Vintage Wash',
    workCenter: 'Washing Plant',
    productionStage: 'Enzyme Wash',
    targetQty: 900,
    actualQty: 480,
    qaStatus: 'Passed',
    startDate: '2026-11-09',
    endDate: '2026-11-18',
    deliveryDate: '2026-11-24',
    buyer: 'Levi Strauss & Co',
    notes: 'Eco-wash enzyme formula cycle',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-10`,
    moNumber: 'MO-2026-110',
    style: 'Athletic Dry-Fit Tee',
    workCenter: 'Sewing Line 02',
    productionStage: 'Sewing',
    targetQty: 3000,
    actualQty: 2850,
    qaStatus: 'Passed',
    startDate: '2026-11-02',
    endDate: '2026-11-15',
    deliveryDate: '2026-11-19',
    buyer: 'Decathlon',
    notes: 'High speed 4-needle overlock',
    batchId: INITIAL_BATCH_ID,
  },
];

const INITIAL_PRODUCTION_SCHEDULES: ProductionSchedule[] = [
  {
    id: 'sched-1',
    moNumber: 'MO-2026-101',
    style: 'Mens Pique Polo Shirt',
    workCenter: 'Sewing Line 01',
    startDate: '2026-11-03',
    endDate: '2026-11-14',
    targetQty: 1200,
    notes: 'Line balancing adjusted for polo collar attach',
    status: 'In Production',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'sched-2',
    moNumber: 'MO-2026-102',
    style: 'Slim Fit Chino Trousers',
    workCenter: 'Sewing Line 03',
    startDate: '2026-11-01',
    endDate: '2026-11-09',
    targetQty: 850,
    notes: 'Completed ahead of schedule',
    status: 'Completed',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'sched-3',
    moNumber: 'MO-2026-104',
    style: 'Heavyweight Cotton Hoodie',
    workCenter: 'Cutting Section',
    startDate: '2026-11-04',
    endDate: '2026-11-11',
    targetQty: 2000,
    notes: 'Full marker layout cutting',
    status: 'In Production',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'sched-4',
    moNumber: 'MO-2026-105',
    style: 'Heavyweight Cotton Hoodie',
    workCenter: 'Sewing Line 02',
    startDate: '2026-11-10',
    endDate: '2026-11-22',
    targetQty: 2000,
    notes: 'Kangaroo pocket attachment',
    status: 'Scheduled',
    createdAt: '2026-11-02T08:00:00.000Z',
  },
  {
    id: 'sched-5',
    moNumber: 'MO-2026-109',
    style: 'Denim Jacket Vintage Wash',
    workCenter: 'Washing Plant',
    startDate: '2026-11-09',
    endDate: '2026-11-18',
    targetQty: 900,
    notes: 'Stone wash + softening tumbler',
    status: 'In Production',
    createdAt: '2026-11-03T08:00:00.000Z',
  },
  {
    id: 'sched-6',
    moNumber: 'MO-2026-110',
    style: 'Athletic Dry-Fit Tee',
    workCenter: 'Sewing Line 02',
    startDate: '2026-11-02',
    endDate: '2026-11-15',
    targetQty: 3000,
    notes: 'Decathlon running line',
    status: 'In Production',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
];

// Note: One MO can have multiple deliveries as required by Section 6.C
const INITIAL_DELIVERY_SCHEDULES: DeliverySchedule[] = [
  {
    id: 'del-101-1',
    moNumber: 'MO-2026-101',
    style: 'Mens Pique Polo Shirt',
    deliveryDate: '2026-11-10',
    quantity: 400,
    notes: 'Delivery Batch 1: Air shipment to Tokyo DC',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-101-2',
    moNumber: 'MO-2026-101',
    style: 'Mens Pique Polo Shirt',
    deliveryDate: '2026-11-15',
    quantity: 400,
    notes: 'Delivery Batch 2: Sea shipment batch A',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-101-3',
    moNumber: 'MO-2026-101',
    style: 'Mens Pique Polo Shirt',
    deliveryDate: '2026-11-20',
    quantity: 400,
    notes: 'Delivery Batch 3: Final delivery batch',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-102-1',
    moNumber: 'MO-2026-102',
    style: 'Slim Fit Chino Trousers',
    deliveryDate: '2026-11-12',
    quantity: 500,
    notes: 'First dispatch to Regional Hub Jakarta',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-102-2',
    moNumber: 'MO-2026-102',
    style: 'Slim Fit Chino Trousers',
    deliveryDate: '2026-11-16',
    quantity: 350,
    notes: 'Final balance dispatch',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-104-1',
    moNumber: 'MO-2026-104',
    style: 'Heavyweight Cotton Hoodie',
    deliveryDate: '2026-11-25',
    quantity: 1000,
    notes: 'Partial lot delivery',
    status: 'Planned',
    createdAt: '2026-11-02T08:00:00.000Z',
  },
  {
    id: 'del-104-2',
    moNumber: 'MO-2026-104',
    style: 'Heavyweight Cotton Hoodie',
    deliveryDate: '2026-11-28',
    quantity: 1000,
    notes: 'Remaining lot delivery',
    status: 'Planned',
    createdAt: '2026-11-02T08:00:00.000Z',
  },
];

class LocalStoragePPICRepository implements IPPICRepository {
  constructor() {
    this.ensureInitialized();
  }

  private isStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private ensureInitialized(): void {
    if (!this.isStorageAvailable()) return;

    try {
      const existingBatches = localStorage.getItem(STORAGE_KEYS.BATCHES);
      if (!existingBatches) {
        this.resetToInitialData();
      }
    } catch {
      // In case localStorage is blocked in sandbox, fallback in-memory is held
    }
  }

  getBatches(): UploadBatch[] {
    if (!this.isStorageAvailable()) return [INITIAL_BATCH];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BATCHES);
      return data ? JSON.parse(data) : [INITIAL_BATCH];
    } catch {
      return [INITIAL_BATCH];
    }
  }

  getActiveBatch(): UploadBatch | null {
    const batches = this.getBatches();
    if (!this.isStorageAvailable()) return batches[0] || null;

    try {
      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BATCH_ID);
      const found = batches.find((b) => b.id === activeId);
      return found || batches[0] || null;
    } catch {
      return batches[0] || null;
    }
  }

  setActiveBatch(batchId: string): void {
    if (!this.isStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BATCH_ID, batchId);
      const batches = this.getBatches().map((b) => ({
        ...b,
        status: (b.id === batchId ? 'active' : 'archived') as 'active' | 'archived',
      }));
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
    } catch {
      // ignore
    }
  }

  saveBatch(batch: UploadBatch, orders: ManufacturingOrder[]): void {
    if (!this.isStorageAvailable()) return;
    try {
      // 1. Get existing batches
      let batches = this.getBatches();
      // If batch with same id exists, replace it, else prepend
      const existingIdx = batches.findIndex((b) => b.id === batch.id);
      if (existingIdx !== -1) {
        batches[existingIdx] = batch;
      } else {
        // Set previous active to archived
        batches = batches.map((b) => ({ ...b, status: 'archived' as const }));
        batches.unshift(batch);
      }
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BATCH_ID, batch.id);

      // 2. Save orders
      const allOrders = this.getOrders();
      // Filter out previous orders for this batch to avoid duplicates
      const remainingOrders = allOrders.filter((o) => o.batchId !== batch.id);
      const updatedOrders = [...orders, ...remainingOrders];
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
    } catch {
      // ignore
    }
  }

  deleteBatch(batchId: string): void {
    if (!this.isStorageAvailable()) return;
    try {
      const batches = this.getBatches().filter((b) => b.id !== batchId);
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));

      const orders = this.getOrders().filter((o) => o.batchId !== batchId);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BATCH_ID);
      if (activeId === batchId && batches.length > 0) {
        this.setActiveBatch(batches[0].id);
      }
    } catch {
      // ignore
    }
  }

  getOrders(batchId?: string): ManufacturingOrder[] {
    if (!this.isStorageAvailable()) return INITIAL_ORDERS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders: ManufacturingOrder[] = data ? JSON.parse(data) : INITIAL_ORDERS;
      if (batchId) {
        return allOrders.filter((o) => o.batchId === batchId);
      }
      const activeBatch = this.getActiveBatch();
      if (activeBatch) {
        return allOrders.filter((o) => o.batchId === activeBatch.id);
      }
      return allOrders;
    } catch {
      return INITIAL_ORDERS;
    }
  }

  getProductionSchedules(): ProductionSchedule[] {
    if (!this.isStorageAvailable()) return INITIAL_PRODUCTION_SCHEDULES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTION_SCHEDULES);
      return data ? JSON.parse(data) : INITIAL_PRODUCTION_SCHEDULES;
    } catch {
      return INITIAL_PRODUCTION_SCHEDULES;
    }
  }

  saveProductionSchedule(schedule: ProductionSchedule): void {
    if (!this.isStorageAvailable()) return;
    try {
      const schedules = this.getProductionSchedules();
      const idx = schedules.findIndex((s) => s.id === schedule.id);
      if (idx !== -1) {
        schedules[idx] = schedule;
      } else {
        schedules.unshift(schedule);
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTION_SCHEDULES, JSON.stringify(schedules));
    } catch {
      // ignore
    }
  }

  deleteProductionSchedule(id: string): void {
    if (!this.isStorageAvailable()) return;
    try {
      const schedules = this.getProductionSchedules().filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTION_SCHEDULES, JSON.stringify(schedules));
    } catch {
      // ignore
    }
  }

  getDeliverySchedules(): DeliverySchedule[] {
    if (!this.isStorageAvailable()) return INITIAL_DELIVERY_SCHEDULES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELIVERY_SCHEDULES);
      return data ? JSON.parse(data) : INITIAL_DELIVERY_SCHEDULES;
    } catch {
      return INITIAL_DELIVERY_SCHEDULES;
    }
  }

  saveDeliverySchedule(delivery: DeliverySchedule): void {
    if (!this.isStorageAvailable()) return;
    try {
      const deliveries = this.getDeliverySchedules();
      const idx = deliveries.findIndex((d) => d.id === delivery.id);
      if (idx !== -1) {
        deliveries[idx] = delivery;
      } else {
        deliveries.unshift(delivery);
      }
      localStorage.setItem(STORAGE_KEYS.DELIVERY_SCHEDULES, JSON.stringify(deliveries));
    } catch {
      // ignore
    }
  }

  deleteDeliverySchedule(id: string): void {
    if (!this.isStorageAvailable()) return;
    try {
      const deliveries = this.getDeliverySchedules().filter((d) => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.DELIVERY_SCHEDULES, JSON.stringify(deliveries));
    } catch {
      // ignore
    }
  }

  resetToInitialData(): void {
    if (!this.isStorageAvailable()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([INITIAL_BATCH]));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BATCH_ID, INITIAL_BATCH_ID);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
      localStorage.setItem(
        STORAGE_KEYS.PRODUCTION_SCHEDULES,
        JSON.stringify(INITIAL_PRODUCTION_SCHEDULES)
      );
      localStorage.setItem(
        STORAGE_KEYS.DELIVERY_SCHEDULES,
        JSON.stringify(INITIAL_DELIVERY_SCHEDULES)
      );
    } catch {
      // ignore
    }
  }
}

// Export singleton repository instance
export const ppicRepository: IPPICRepository = new LocalStoragePPICRepository();
