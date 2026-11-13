import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ManufacturingOrder,
  UploadBatch,
  ProductionSchedule,
  DeliverySchedule,
  FilterState,
  TemplateProfile,
} from '../types/ppic';

import { ppicRepository } from '../services/storageService';
import { filterOrders } from '../utils/ppicCalculations';

export type NavigationTab = 'dashboard' | 'monitoring' | 'gantt' | 'upload';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface PPICContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeBatch: UploadBatch | null;
  batches: UploadBatch[];
  orders: ManufacturingOrder[];
  filteredOrders: ManufacturingOrder[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  productionSchedules: ProductionSchedule[];
  deliverySchedules: DeliverySchedule[];
  selectedMO: ManufacturingOrder | null;
  setSelectedMO: (order: ManufacturingOrder | null) => void;
  confirmUploadBatch: (batch: UploadBatch, orders: ManufacturingOrder[]) => void;
  switchActiveBatch: (batchId: string) => void;
  deleteBatch: (batchId: string) => void;
  saveProductionSchedule: (schedule: ProductionSchedule) => void;
  deleteProductionSchedule: (id: string) => void;
  saveDeliverySchedule: (delivery: DeliverySchedule) => void;
  deleteDeliverySchedule: (id: string) => void;
  templateProfiles: TemplateProfile[];
  saveTemplateProfile: (profile: TemplateProfile) => void;
  deleteTemplateProfile: (id: string) => void;
  resetToSampleData: () => void;
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}


const defaultFilters: FilterState = {
  search: '',
  workCenter: '',
  style: '',
  mo: '',
  stage: '',
  qaStatus: '',
  dateFrom: '',
  dateTo: '',
};

const PPICContext = createContext<PPICContextType | undefined>(undefined);

export const PPICProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<UploadBatch | null>(null);
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [productionSchedules, setProductionSchedules] = useState<ProductionSchedule[]>([]);
  const [deliverySchedules, setDeliverySchedules] = useState<DeliverySchedule[]>([]);
  const [selectedMO, setSelectedMO] = useState<ManufacturingOrder | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [templateProfiles, setTemplateProfiles] = useState<TemplateProfile[]>([]);

  // Reload state from repository
  const refreshData = useCallback(() => {
    const allBatches = ppicRepository.getBatches();
    const currentActive = ppicRepository.getActiveBatch();
    const currentOrders = ppicRepository.getOrders(currentActive?.id);
    const schedules = ppicRepository.getProductionSchedules();
    const deliveries = ppicRepository.getDeliverySchedules();
    const profiles = ppicRepository.getTemplateProfiles();

    setBatches(allBatches);
    setActiveBatch(currentActive);
    setOrders(currentOrders);
    setProductionSchedules(schedules);
    setDeliverySchedules(deliveries);
    setTemplateProfiles(profiles);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const saveTemplateProfile = useCallback(
    (profile: TemplateProfile) => {
      ppicRepository.saveTemplateProfile(profile);
      refreshData();
      showToast(`Konfigurasi template "${profile.name}" berhasil disimpan!`, 'success');
    },
    [refreshData, showToast]
  );

  const deleteTemplateProfile = useCallback(
    (id: string) => {
      ppicRepository.deleteTemplateProfile(id);
      refreshData();
      showToast('Konfigurasi template berhasil dihapus', 'info');
    },
    [refreshData, showToast]
  );


  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const filteredOrders = useMemo(() => {
    return filterOrders(orders, filters);
  }, [orders, filters]);

  const confirmUploadBatch = useCallback(
    (batch: UploadBatch, newOrders: ManufacturingOrder[]) => {
      ppicRepository.saveBatch(batch, newOrders);
      refreshData();
      showToast(`Batch "${batch.fileName}" berhasil dijadikan data aktif!`, 'success');
      setActiveTab('dashboard');
    },
    [refreshData, showToast]
  );

  const switchActiveBatch = useCallback(
    (batchId: string) => {
      ppicRepository.setActiveBatch(batchId);
      refreshData();
      showToast('Sumber data aktif berhasil dialihkan', 'info');
    },
    [refreshData, showToast]
  );

  const deleteBatch = useCallback(
    (batchId: string) => {
      ppicRepository.deleteBatch(batchId);
      refreshData();
      showToast('Batch berhasil dihapus', 'info');
    },
    [refreshData, showToast]
  );

  const saveProductionSchedule = useCallback(
    (schedule: ProductionSchedule) => {
      ppicRepository.saveProductionSchedule(schedule);
      refreshData();
      showToast(`Jadwal produksi untuk MO ${schedule.moNumber} berhasil disimpan`, 'success');
    },
    [refreshData, showToast]
  );

  const deleteProductionSchedule = useCallback(
    (id: string) => {
      ppicRepository.deleteProductionSchedule(id);
      refreshData();
      showToast('Jadwal produksi berhasil dihapus', 'info');
    },
    [refreshData, showToast]
  );

  const saveDeliverySchedule = useCallback(
    (delivery: DeliverySchedule) => {
      ppicRepository.saveDeliverySchedule(delivery);
      refreshData();
      showToast(`Jadwal pengiriman MO ${delivery.moNumber} (${delivery.quantity} pcs) disimpan`, 'success');
    },
    [refreshData, showToast]
  );

  const deleteDeliverySchedule = useCallback(
    (id: string) => {
      ppicRepository.deleteDeliverySchedule(id);
      refreshData();
      showToast('Jadwal pengiriman berhasil dihapus', 'info');
    },
    [refreshData, showToast]
  );

  const resetToSampleData = useCallback(() => {
    ppicRepository.resetToInitialData();
    resetFilters();
    refreshData();
    showToast('Seluruh data aktif dan jadwal manual berhasil dibersihkan', 'info');
  }, [refreshData, resetFilters, showToast]);

  return (
    <PPICContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeBatch,
        batches,
        orders,
        filteredOrders,
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        productionSchedules,
        deliverySchedules,
        selectedMO,
        setSelectedMO,
        confirmUploadBatch,
        switchActiveBatch,
        deleteBatch,
        saveProductionSchedule,
        deleteProductionSchedule,
        saveDeliverySchedule,
        deleteDeliverySchedule,
        templateProfiles,
        saveTemplateProfile,
        deleteTemplateProfile,
        resetToSampleData,
        toasts,
        showToast,
        dismissToast,
      }}

    >
      {children}
    </PPICContext.Provider>
  );
};

export const usePPIC = () => {
  const context = useContext(PPICContext);
  if (!context) {
    throw new Error('usePPIC must be used within a PPICProvider');
  }
  return context;
};
