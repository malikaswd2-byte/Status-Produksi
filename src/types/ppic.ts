export interface ManufacturingOrder {
  id: string;
  moNumber: string;
  style: string;
  workCenter: string;
  productionStage: string;
  targetQty: number;
  actualQty: number;
  qaStatus: string; // e.g. "Passed", "In-Inspection", "Rework", "Rejected", "Pending"
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD
  buyer?: string;
  notes?: string;
  batchId: string;
  customAttributes?: Record<string, any>;
}

export interface UploadBatch {
  id: string;
  batchNumber: string;
  fileName: string;
  uploadDate: string; // ISO string
  totalRows: number;
  moCount: number;
  styleCount: number;
  workCenterCount: number;
  status: 'active' | 'archived';
  columnMappings: Record<string, string>;
  warnings: string[];
  rawRowsSample?: any[];
}

export interface ProductionSchedule {
  id: string;
  moNumber: string;
  style: string;
  workCenter: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  targetQty: number;
  notes?: string;
  status: 'Scheduled' | 'In Production' | 'Completed';
  createdAt: string;
}

export interface DeliverySchedule {
  id: string;
  moNumber: string;
  style: string;
  deliveryDate: string; // YYYY-MM-DD
  quantity: number;
  notes?: string;
  status: 'Planned' | 'Shipped' | 'Delayed';
  createdAt: string;
}

export interface StyleSummary {
  style: string;
  moCount: number;
  workCenters: string[];
  stages: string[];
  totalTargetQty: number;
  totalActualQty: number;
  progressPercent: number;
  qaBreakdown: Record<string, number>;
  status: 'On Track' | 'In Progress' | 'Behind' | 'Completed' | 'Pending';
  orders: ManufacturingOrder[];
}

export interface WorkCenterSummary {
  name: string;
  moCount: number;
  styleCount: number;
  totalTargetQty: number;
  totalActualQty: number;
  progressPercent: number;
}

export interface ProductionStageSummary {
  stageName: string;
  workCenters: string[];
  moCount: number;
  styleCount: number;
  targetQty: number;
  actualQty: number;
  completionRate: number;
  isBottleneck: boolean;
}

export interface QARecord {
  statusName: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FilterState {
  search: string;
  workCenter: string;
  style: string;
  mo: string;
  stage: string;
  qaStatus: string;
  dateFrom: string;
  dateTo: string;
}

export interface ColumnMappingConfig {
  moNumber: string;
  style: string;
  workCenter: string;
  productionStage: string;
  targetQty: string;
  actualQty: string;
  qaStatus: string;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  buyer: string;
  notes: string;
}

export interface ExcelParsingResult {
  fileName: string;
  sheets: string[];
  selectedSheet: string;
  rawHeaders: string[];
  detectedMapping: Partial<ColumnMappingConfig>;
  rows: any[];
  normalizedOrders: ManufacturingOrder[];
  summary: {
    totalRows: number;
    moCount: number;
    styleCount: number;
    workCenterCount: number;
  };
  warnings: string[];
}
