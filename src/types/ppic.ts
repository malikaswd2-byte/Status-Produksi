export const STANDARD_PRODUCTION_STAGES = [
  'Cutting',
  'Sewing',
  'Penerimaan Ironning',
  'Ironning',
  'QC Finishing',
  'QC Ukur',
  'QA',
] as const;

export type StandardProductionStage = typeof STANDARD_PRODUCTION_STAGES[number];

export interface ManufacturingOrder {
  id: string;
  moNumber: string;
  style: string;
  workCenter: string;
  productionStage: string;
  targetQty: number;
  actualQty: number;
  // Specific quantities from Excel template
  originalQty?: number;
  quantity?: number;
  remainingQty?: number;
  repairQty?: number;
  reworkQty?: number;
  // Additional operational metadata
  routing?: string;
  buyer?: string;
  line?: string;
  rawStyle?: string;
  rawWorkCenter?: string;
  qaStatus?: string; // Optional actual QA info/status only when present in Excel
  sewingCondition?: 'Normal' | 'Repair' | 'Rework'; // Sewing process condition
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD
  notes?: string;
  batchId: string;
  needsVerification?: boolean;
  verificationIssues?: string[];
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

export interface MOGroup {
  moNumber: string;
  customer: string;
  style: string;
  routing: string;
  stages: ManufacturingOrder[];
  stageCount: number;
  totalTargetQty: number;
  totalActualQty: number;
  totalRemainingQty: number;
  progressPercent: number;
  workCenters: string[];
  stageNames: string[];
  qaStatusSummary?: string;
  status: 'On Track' | 'In Progress' | 'Behind' | 'Completed' | 'Pending';
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
  stageIndex: number; // 0 for Cutting, 1 for Sewing, etc.
  workCenters: string[];
  moCount: number;
  styleCount: number;
  targetQty: number;
  actualQty: number;
  completionRate: number;
  isBottleneck: boolean;
  originalQty?: number;
  quantity?: number;
  remainingQty?: number;
  repairCount?: number; // Only for Sewing
  reworkCount?: number; // Only for Sewing
  repairQty?: number;
  reworkQty?: number;
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
  originalQty: string;
  quantity: string;
  remainingQty: string;
  repairQty: string;
  reworkQty: string;
  routing: string;
  buyer: string;
  qaStatus: string;
  sewingCondition: string;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  notes: string;
}

export interface TemplateProfile {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  headerSignatures: string[];
  mapping: Partial<ColumnMappingConfig>;
  createdAt: string;
}

export interface ExcelParsingResult {
  fileName: string;
  sheets: string[];
  selectedSheet: string;
  rawHeaders: string[];
  isTemplateRecognized: boolean;
  matchedTemplateName?: string;
  detectedMapping: Partial<ColumnMappingConfig>;
  rows: any[];
  normalizedOrders: ManufacturingOrder[];
  summary: {
    totalRows: number;
    moCount: number;
    styleCount: number;
    workCenterCount: number;
    stageCount: number;
    sheetsProcessed: number;
    needsVerificationCount: number;
  };
  unrecognizedStages: string[];
  warnings: string[];
}

