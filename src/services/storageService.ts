import {
  UploadBatch,
  ManufacturingOrder,
  ProductionSchedule,
  DeliverySchedule,
  TemplateProfile,
} from '../types/ppic';
import { BUILTIN_STANDARD_TEMPLATE_PROFILE } from './excelParser';

const STORAGE_KEYS = {
  BATCHES: 'ppic_upload_batches_v6',
  ACTIVE_BATCH_ID: 'ppic_active_batch_id_v6',
  ORDERS: 'ppic_orders_v6',
  PRODUCTION_SCHEDULES: 'ppic_prod_schedules_v6',
  DELIVERY_SCHEDULES: 'ppic_deliv_schedules_v6',
  TEMPLATE_PROFILES: 'ppic_template_profiles_v1',
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
  getTemplateProfiles(): TemplateProfile[];
  saveTemplateProfile(profile: TemplateProfile): void;
  deleteTemplateProfile(id: string): void;
  resetToInitialData(): void;
}


const INITIAL_BATCH_ID = 'BATCH-20261108-SEED-V6';

const INITIAL_BATCH: UploadBatch = {
  id: INITIAL_BATCH_ID,
  batchNumber: 'BATCH-202611-006',
  fileName: 'Master_Production_Schedule_Standard_Stages.xlsx',
  uploadDate: '2026-11-08T08:00:00.000Z',
  totalRows: 10,
  moCount: 3,
  styleCount: 3,
  workCenterCount: 7,
  status: 'active',
  columnMappings: {
    moNumber: 'Display Name',
    style: 'Work Orders/Style/Display Name',
    workCenter: 'Work Orders/Work Center/Display Name',
    productionStage: 'Tahap Produksi',
    targetQty: 'Work Orders/Original Production Q',
    actualQty: 'Actual Qty',
    sewingCondition: 'Kondisi Sewing',
    repairQty: 'Work Orders/Qty Repair',
    reworkQty: 'Qty Rework',
    qaStatus: 'Status QA',
    startDate: 'Tgl Mulai',
    endDate: 'Tgl Selesai',
    deliveryDate: 'Tgl Pengiriman',
    buyer: 'Customer/Display Name',
    routing: 'Routing/Display Name',
  },
  warnings: [],
};

const INITIAL_ORDERS: ManufacturingOrder[] = [
  // 1. WH/MO/23169 — All 7 Standard Stages linked to same MO (Customer: YAYASAN ENAM PEDULI PENDIDIKAN, Style: UNSI JSU MHS 01)
  {
    id: `${INITIAL_BATCH_ID}-1`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'Cutting Section A',
    productionStage: 'Cutting',
    targetQty: 1200,
    actualQty: 1200,
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'Laser precision cutting complete',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-2`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'Sewing Line 1',
    productionStage: 'Sewing',
    line: 'Line 1',
    targetQty: 1200,
    actualQty: 950,
    sewingCondition: 'Repair',
    repairQty: 15,
    startDate: '2026-11-04',
    endDate: '2026-11-14',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'Pocket stitching tension recalibrated',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-3`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'Area Penerimaan Ironning',
    productionStage: 'Penerimaan Ironning',
    targetQty: 1200,
    actualQty: 850,
    startDate: '2026-11-08',
    endDate: '2026-11-12',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'Transferred from sewing line 1',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-4`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'Ironning Station 01',
    productionStage: 'Ironning',
    line: 'Station 01',
    targetQty: 1200,
    actualQty: 720,
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'High pressure crease ironning in progress',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-5`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'QC Finishing Line',
    productionStage: 'QC Finishing',
    targetQty: 1200,
    actualQty: 600,
    startDate: '2026-11-12',
    endDate: '2026-11-16',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'Button & rivets inspection',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-6`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'QC Ukur Station',
    productionStage: 'QC Ukur',
    targetQty: 1200,
    actualQty: 600,
    startDate: '2026-11-13',
    endDate: '2026-11-17',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'Size spec tolerance check passed',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-7`,
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'QA Audit Room',
    productionStage: 'QA',
    targetQty: 1200,
    actualQty: 600,
    qaStatus: 'Passed Final Audit 15-Nov',
    startDate: '2026-11-14',
    endDate: '2026-11-17',
    deliveryDate: '2026-11-18',
    buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
    routing: 'RT-POLO-MENS-V1',
    notes: 'AQL 1.5 final batch clearance',
    batchId: INITIAL_BATCH_ID,
  },

  // 2. WH/MO/23170 — Hoodie Stages
  {
    id: `${INITIAL_BATCH_ID}-8`,
    moNumber: 'WH/MO/23170',
    style: 'UNSI HOODIE FLEECE 02',
    workCenter: 'Cutting Section B',
    productionStage: 'Cutting',
    targetQty: 2000,
    actualQty: 2000,
    startDate: '2026-11-06',
    endDate: '2026-11-11',
    deliveryDate: '2026-11-28',
    buyer: 'PT GLOBAL GARMINDO UTAMA',
    routing: 'RT-HOODIE-CW-02',
    notes: 'Spreading & bundle cutting complete',
    batchId: INITIAL_BATCH_ID,
  },
  {
    id: `${INITIAL_BATCH_ID}-9`,
    moNumber: 'WH/MO/23170',
    style: 'UNSI HOODIE FLEECE 02',
    workCenter: 'Sewing Line 2',
    productionStage: 'Sewing',
    line: 'Line 2',
    targetQty: 2000,
    actualQty: 750,
    sewingCondition: 'Rework',
    reworkQty: 28,
    startDate: '2026-11-08',
    endDate: '2026-11-20',
    deliveryDate: '2026-11-28',
    buyer: 'PT GLOBAL GARMINDO UTAMA',
    routing: 'RT-HOODIE-CW-02',
    notes: 'Cuff rib attachment rework in progress',
    batchId: INITIAL_BATCH_ID,
  },

  // 3. WH/MO/23171 — Chino Pants
  {
    id: `${INITIAL_BATCH_ID}-10`,
    moNumber: 'WH/MO/23171',
    style: 'UNSI CHINO PANTS 03',
    workCenter: 'Sewing Line 1',
    productionStage: 'Sewing',
    line: 'Line 1',
    targetQty: 850,
    actualQty: 480,
    sewingCondition: 'Normal',
    startDate: '2026-11-10',
    endDate: '2026-11-22',
    deliveryDate: '2026-11-26',
    buyer: 'CV SINAR MAKMUR TEKSTIL',
    routing: 'RT-CHINO-SLIM-03',
    notes: 'Waistband attach on schedule',
    batchId: INITIAL_BATCH_ID,
  },
];

const INITIAL_PRODUCTION_SCHEDULES: ProductionSchedule[] = [
  {
    id: 'sched-1',
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'Cutting Section A',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    targetQty: 1200,
    notes: 'Marker layout and denim spreading',
    status: 'Completed',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'sched-2',
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    workCenter: 'Sewing Line 1',
    startDate: '2026-11-04',
    endDate: '2026-11-14',
    targetQty: 1200,
    notes: 'Line balancing adjusted for denim sewing',
    status: 'In Production',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'sched-3',
    moNumber: 'WH/MO/23170',
    style: 'UNSI HOODIE FLEECE 02',
    workCenter: 'Sewing Line 2',
    startDate: '2026-11-08',
    endDate: '2026-11-20',
    targetQty: 2000,
    notes: 'Kangaroo pocket attachment & cuff sewing',
    status: 'In Production',
    createdAt: '2026-11-02T08:00:00.000Z',
  },
  {
    id: 'sched-4',
    moNumber: 'WH/MO/23171',
    style: 'UNSI CHINO PANTS 03',
    workCenter: 'Sewing Line 1',
    startDate: '2026-11-10',
    endDate: '2026-11-22',
    targetQty: 850,
    notes: 'Chino pants sewing assembly',
    status: 'In Production',
    createdAt: '2026-11-03T08:00:00.000Z',
  },
];

const INITIAL_DELIVERY_SCHEDULES: DeliverySchedule[] = [
  {
    id: 'del-23169-1',
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    deliveryDate: '2026-11-10',
    quantity: 400,
    notes: 'Delivery Termin 1: Air shipment to Tokyo DC',
    status: 'Shipped',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-23169-2',
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    deliveryDate: '2026-11-15',
    quantity: 400,
    notes: 'Delivery Termin 2: Sea shipment batch A',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-23169-3',
    moNumber: 'WH/MO/23169',
    style: 'UNSI JSU MHS 01',
    deliveryDate: '2026-11-18',
    quantity: 400,
    notes: 'Delivery Termin 3: Final delivery batch',
    status: 'Planned',
    createdAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'del-23170-1',
    moNumber: 'WH/MO/23170',
    style: '[UNSIO1-2] UNSI HOODIE FLEECE 02',
    deliveryDate: '2026-11-25',
    quantity: 1000,
    notes: 'Partial lot delivery to H&M Warehouse',
    status: 'Planned',
    createdAt: '2026-11-02T08:00:00.000Z',
  },
  {
    id: 'del-23171-1',
    moNumber: 'WH/MO/23171',
    style: '[UNSIO1-3] UNSI CHINO PANTS 03',
    deliveryDate: '2026-11-26',
    quantity: 400,
    notes: 'Dispatch to M&S Distribution Center',
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

  getTemplateProfiles(): TemplateProfile[] {
    if (!this.isStorageAvailable()) return [BUILTIN_STANDARD_TEMPLATE_PROFILE];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATE_PROFILES);
      if (!data) return [BUILTIN_STANDARD_TEMPLATE_PROFILE];
      const parsed: TemplateProfile[] = JSON.parse(data);
      // Ensure built-in standard profile is always present
      if (!parsed.some((p) => p.id === BUILTIN_STANDARD_TEMPLATE_PROFILE.id)) {
        return [BUILTIN_STANDARD_TEMPLATE_PROFILE, ...parsed];
      }
      return parsed;
    } catch {
      return [BUILTIN_STANDARD_TEMPLATE_PROFILE];
    }
  }

  saveTemplateProfile(profile: TemplateProfile): void {
    if (!this.isStorageAvailable()) return;
    try {
      const profiles = this.getTemplateProfiles();
      const existingIdx = profiles.findIndex((p) => p.id === profile.id || p.name === profile.name);
      if (existingIdx !== -1) {
        profiles[existingIdx] = profile;
      } else {
        profiles.push(profile);
      }
      localStorage.setItem(STORAGE_KEYS.TEMPLATE_PROFILES, JSON.stringify(profiles));
    } catch {
      // ignore
    }
  }

  deleteTemplateProfile(id: string): void {
    if (!this.isStorageAvailable()) return;
    try {
      // Prevent deleting the default built-in profile
      if (id === BUILTIN_STANDARD_TEMPLATE_PROFILE.id) return;
      const profiles = this.getTemplateProfiles().filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.TEMPLATE_PROFILES, JSON.stringify(profiles));
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
