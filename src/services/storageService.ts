import {
  UploadBatch,
  ManufacturingOrder,
  ProductionSchedule,
  DeliverySchedule,
  TemplateProfile,
} from '../types/ppic';
import { BUILTIN_STANDARD_TEMPLATE_PROFILE } from './excelParser';

const STORAGE_KEYS = {
  BATCHES: 'ppic_upload_batches_v7',
  ACTIVE_BATCH_ID: 'ppic_active_batch_id_v7',
  ORDERS: 'ppic_orders_v7',
  PRODUCTION_SCHEDULES: 'ppic_prod_schedules_v7',
  DELIVERY_SCHEDULES: 'ppic_deliv_schedules_v7',
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

class LocalStoragePPICRepository implements IPPICRepository {
  private isStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  getBatches(): UploadBatch[] {
    if (!this.isStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BATCHES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getActiveBatch(): UploadBatch | null {
    const batches = this.getBatches();
    if (batches.length === 0) return null;
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

      const batchOrders = localStorage.getItem(`${STORAGE_KEYS.ORDERS}_batch_${batchId}`);
      if (batchOrders) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, batchOrders);
      }
    } catch {
      // ignore
    }
  }

  saveBatch(batch: UploadBatch, orders: ManufacturingOrder[]): void {
    if (!this.isStorageAvailable()) return;
    try {
      let batches = this.getBatches();
      const existingIdx = batches.findIndex((b) => b.id === batch.id);
      if (existingIdx !== -1) {
        batches[existingIdx] = batch;
      } else {
        batches = batches.map((b) => ({ ...b, status: 'archived' as const }));
        batches.unshift(batch);
      }
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BATCH_ID, batch.id);

      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      localStorage.setItem(`${STORAGE_KEYS.ORDERS}_batch_${batch.id}`, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }

  deleteBatch(batchId: string): void {
    if (!this.isStorageAvailable()) return;
    try {
      const batches = this.getBatches().filter((b) => b.id !== batchId);
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
      localStorage.removeItem(`${STORAGE_KEYS.ORDERS}_batch_${batchId}`);

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BATCH_ID);
      if (batches.length === 0) {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_BATCH_ID);
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
      } else if (activeId === batchId) {
        this.setActiveBatch(batches[0].id);
      }
    } catch {
      // ignore
    }
  }

  getOrders(batchId?: string): ManufacturingOrder[] {
    if (!this.isStorageAvailable()) return [];
    try {
      if (batchId) {
        const batchData = localStorage.getItem(`${STORAGE_KEYS.ORDERS}_batch_${batchId}`);
        if (batchData) return JSON.parse(batchData);
      }
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getProductionSchedules(): ProductionSchedule[] {
    if (!this.isStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTION_SCHEDULES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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
    if (!this.isStorageAvailable()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELIVERY_SCHEDULES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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
      const batches = this.getBatches();
      for (const batch of batches) {
        localStorage.removeItem(`${STORAGE_KEYS.ORDERS}_batch_${batch.id}`);
      }
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_BATCH_ID);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PRODUCTION_SCHEDULES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.DELIVERY_SCHEDULES, JSON.stringify([]));
    } catch {
      // ignore
    }
  }
}

export const ppicRepository: IPPICRepository = new LocalStoragePPICRepository();
