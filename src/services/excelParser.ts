import * as XLSX from 'xlsx';
import {
  ColumnMappingConfig,
  ExcelParsingResult,
  ManufacturingOrder,
  STANDARD_PRODUCTION_STAGES,
  TemplateProfile,
} from '../types/ppic';

/**
 * Standard Built-in Template Profile definition
 */
export const BUILTIN_STANDARD_TEMPLATE_PROFILE: TemplateProfile = {
  id: 'tpl-ppic-work-orders-standard',
  name: 'PPIC Standard Work Orders Template',
  description:
    'Template resmi manufaktur PPIC (Display Name MO, Customer, Routing, Work Orders/Style, Work Center, Original Qty, Qty, Qty Sisa, Qty Repair)',
  isDefault: true,
  headerSignatures: [
    'Display Name',
    'Work Orders/Style/Display Name',
    'Work Orders/Work Center/Display Name',
  ],
  mapping: {
    moNumber: 'Display Name',
    buyer: 'Customer/Display Name',
    routing: 'Routing/Display Name',
    style: 'Work Orders/Style/Display Name',
    workCenter: 'Work Orders/Work Center/Display Name',
    originalQty: 'Work Orders/Original Production Q',
    quantity: 'Work Orders/Quantity',
    remainingQty: 'Work Orders/Qty Sisa',
    repairQty: 'Work Orders/Qty Repair',
  },
  createdAt: '2026-11-10T00:00:00.000Z',
};

/**
 * Normalizes production stages to the 7 standardized sequence stages:
 * 1. Cutting
 * 2. Sewing
 * 3. Penerimaan Ironning
 * 4. Ironning
 * 5. QC Finishing
 * 6. QC Ukur
 * 7. QA
 */
export function normalizeProductionStage(raw: string): string {
  if (!raw) return 'Cutting';
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // 1. Penerimaan Ironning (check before Ironning)
  if (/penerimaan[_\s.-]?iron|terima[_\s.-]?iron|receiving[_\s.-]?iron/i.test(lower)) {
    return 'Penerimaan Ironning';
  }
  // 2. Ironning
  if (/iron|setrika|gosok|pressing/i.test(lower)) {
    return 'Ironning';
  }
  // 3. QC Finishing
  if (/qc[_\s.-]?finish|finishing[_\s.-]?qc|finish[_\s.-]?qc/i.test(lower)) {
    return 'QC Finishing';
  }
  // 4. QC Ukur
  if (/qc[_\s.-]?ukur|measurement|ukur|size[_\s.-]?spec/i.test(lower)) {
    return 'QC Ukur';
  }
  // 5. QA
  if (/^qa\b|quality[_\s.-]?assurance|audit[_\s.-]?qa|final[_\s.-]?audit/i.test(lower)) {
    return 'QA';
  }
  // 6. Sewing
  if (/sewing|jahit/i.test(lower)) {
    return 'Sewing';
  }
  // 7. Cutting
  if (/cutting|potong/i.test(lower)) {
    return 'Cutting';
  }

  // Check if it exactly matches one of the standard stages ignoring case
  const exact = STANDARD_PRODUCTION_STAGES.find((s) => s.toLowerCase() === lower);
  return exact || trimmed;
}

/**
 * Extracts MO Number and Style from Work Orders/Style/Display Name.
 * Example format: "[UNSIO1-1] UNSI JSU MHS 01"
 *
 * Rules:
 * - Keep original value.
 * - Extract MO number and Style name if pattern is consistent (e.g., [MO] Style).
 * - Do NOT treat whole text as MO number.
 * - Do NOT invent fake random MO numbers.
 * - If MO cannot be confidently separated, mark as needsVerification.
 * - One MO can have multiple stage rows and must remain one unified MO entity.
 */
export interface StyleMOExtraction {
  raw: string;
  moNumber: string;
  style: string;
  isConfident: boolean;
  needsVerification: boolean;
  issue?: string;
}

export function extractStyleAndMO(rawValue: any): StyleMOExtraction {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return {
      raw: '',
      moNumber: '',
      style: '',
      isConfident: false,
      needsVerification: true,
      issue: 'Kolom Style/MO kosong',
    };
  }

  const raw = String(rawValue).trim();

  // Pattern 1: [MO-IDENTIFIER] STYLE_NAME (e.g. "[UNSIO1-1] UNSI JSU MHS 01")
  const bracketMatch = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    const moPart = bracketMatch[1].trim();
    const stylePart = bracketMatch[2].trim();
    return {
      raw,
      moNumber: moPart,
      style: stylePart || moPart,
      isConfident: true,
      needsVerification: false,
    };
  }

  // Pattern 2: Explicit prefix separator like "MO-2026-101 - Style Name" or "MO-101 : Style"
  const prefixMatch = raw.match(/^(MO[-A-Za-z0-9_]+|SPK[-A-Za-z0-9_]+|WO[-A-Za-z0-9_]+)\s*[-:–|/]\s*(.+)$/i);
  if (prefixMatch) {
    return {
      raw,
      moNumber: prefixMatch[1].trim(),
      style: prefixMatch[2].trim(),
      isConfident: true,
      needsVerification: false,
    };
  }

  // Pattern 3: Cannot separate MO number with high confidence
  // Do NOT make up a random MO number. Set style to raw, and flag for verification.
  return {
    raw,
    moNumber: '',
    style: raw,
    isConfident: false,
    needsVerification: true,
    issue: 'Nomor MO belum dapat diidentifikasi otomatis dari teks Style',
  };
}

/**
 * Extracts standardized Production Stage and retains specific Line & Work Center info.
 * Example: "Sewing Line 1" -> Stage: "Sewing", Work Center: "Sewing Line 1", Line: "Line 1"
 *
 * Rules:
 * - Recognize stage based on actual Excel value.
 * - Standardize into the 7 standard stages.
 * - Preserve Line information (Sewing Line 1 vs Sewing Line 2 must NOT be merged).
 * - Keep original Work Center string intact for full auditability.
 * - Unrecognized stages are flagged as needs verification, NEVER deleted or forced into wrong stage.
 */
export interface StageWorkCenterExtraction {
  raw: string;
  stage: string;
  workCenter: string;
  line?: string;
  isRecognized: boolean;
  needsVerification: boolean;
  issue?: string;
}

export function extractStageAndWorkCenter(rawValue: any): StageWorkCenterExtraction {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return {
      raw: '',
      stage: 'Cutting',
      workCenter: 'Unassigned',
      isRecognized: false,
      needsVerification: true,
      issue: 'Kolom Work Center/Tahapan kosong',
    };
  }

  const raw = String(rawValue).trim();
  const lower = raw.toLowerCase();

  // Extract Line info if present (e.g., "Line 1", "Line 02", "Line B", "Station 1", "Section A")
  const lineMatch = raw.match(/(?:line|section|area|station|meja)\s*([A-Za-z0-9_-]+)/i);
  const line = lineMatch ? lineMatch[0].trim() : undefined;

  // 1. Penerimaan Ironning
  if (/penerimaan[_\s.-]?iron|terima[_\s.-]?iron|receiving[_\s.-]?iron/i.test(lower)) {
    return {
      raw,
      stage: 'Penerimaan Ironning',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // 2. Ironning
  if (/iron|setrika|gosok|pressing/i.test(lower)) {
    return {
      raw,
      stage: 'Ironning',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // 3. QC Finishing
  if (/qc[_\s.-]?finish|finishing[_\s.-]?qc|finish[_\s.-]?qc/i.test(lower)) {
    return {
      raw,
      stage: 'QC Finishing',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // 4. QC Ukur
  if (/qc[_\s.-]?ukur|measurement|ukur|size[_\s.-]?spec/i.test(lower)) {
    return {
      raw,
      stage: 'QC Ukur',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // 5. QA
  if (/^qa\b|quality[_\s.-]?assurance|audit[_\s.-]?qa|final[_\s.-]?audit/i.test(lower)) {
    return {
      raw,
      stage: 'QA',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // 6. Sewing
  if (/sewing|jahit/i.test(lower)) {
    return {
      raw,
      stage: 'Sewing',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // 7. Cutting
  if (/cutting|potong/i.test(lower)) {
    return {
      raw,
      stage: 'Cutting',
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // Check exact standard stage match
  const exact = STANDARD_PRODUCTION_STAGES.find((s) => s.toLowerCase() === lower);
  if (exact) {
    return {
      raw,
      stage: exact,
      workCenter: raw,
      line,
      isRecognized: true,
      needsVerification: false,
    };
  }

  // Stage is not in the standard 7 stages:
  // Retain raw stage and flag for verification without deleting
  return {
    raw,
    stage: raw,
    workCenter: raw,
    line,
    isRecognized: false,
    needsVerification: true,
    issue: `Tahapan "${raw}" belum termasuk dalam 7 tahapan standar`,
  };
}

/**
 * Normalizes Excel dates whether stored as Excel serial numbers, JS Dates, or formatted strings.
 */
export function normalizeExcelDate(val: any): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;

  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }

  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // ignore
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        const y = parts[2];
        const m = parts[1].padStart(2, '0');
        const d = parts[0].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  return undefined;
}

/**
 * Checks if raw headers match a given header pattern (fuzzy or exact).
 */
function findMatchingHeader(headers: string[], pattern: RegExp | string): string | undefined {
  if (typeof pattern === 'string') {
    const cleanPattern = pattern.toLowerCase().replace(/\s+/g, ' ').trim();
    return headers.find(
      (h) => h.toLowerCase().replace(/\s+/g, ' ').trim() === cleanPattern
    );
  }
  return headers.find((h) => pattern.test(h.trim()));
}

/**
 * Tests if the file headers match known templates (Built-in or saved custom profiles).
 */
export function recognizeTemplate(
  headers: string[],
  customProfiles: TemplateProfile[] = []
): {
  isRecognized: boolean;
  templateName?: string;
  mapping: Partial<ColumnMappingConfig>;
} {
  const allProfiles = [BUILTIN_STANDARD_TEMPLATE_PROFILE, ...customProfiles];

  // 1. Check if headers match standard PPIC template headers
  // Headers:
  // C: Customer/Display Name
  // D: Routing/Display Name
  // E: Work Orders/Style/Display Name
  // F: Work Orders/Work Center/Display Name
  // G: Work Orders/Original Production Q
  // H: Work Orders/Quantity
  // I: Work Orders/Qty Sisa
  // J: Work Orders/Qty Repair

  const headerStyle = findMatchingHeader(headers, /work[_\s.-]?orders?[_\s/.-]?style[_\s/.-]?display[_\s.-]?name/i) ||
    findMatchingHeader(headers, /style[_\s/.-]?display[_\s.-]?name/i);
  const headerWC = findMatchingHeader(headers, /work[_\s.-]?orders?[_\s/.-]?work[_\s.-]?center[_\s/.-]?display[_\s.-]?name/i) ||
    findMatchingHeader(headers, /work[_\s.-]?center[_\s/.-]?display[_\s.-]?name/i);

  // Requirement 1 & 2: Detect MO Display Name column specifically.
  // Must match pure "Display Name" or "Manufacturing Order/Display Name" or "MO/Display Name",
  // and must NEVER match "Customer/Display Name", "Routing/Display Name", or "Work Orders/Style/..."
  const headerMODisplayName =
    headers.find((h) => /^display[_\s.-]?name$/i.test(h.trim())) ||
    headers.find((h) =>
      /^(manufacturing[_\s.-]?orders?|mfg[_\s.-]?orders?|mo|production[_\s.-]?orders?)[_\s/.-]?display[_\s.-]?name$/i.test(
        h.trim()
      )
    ) ||
    headers.find((h) =>
      /^(nomor[_\s.-]?mo|no[_\s.-]?mo|mo[_\s.-]?number|no\.?[_\s.-]?mo|manufacturing[_\s.-]?order)$/i.test(
        h.trim()
      )
    );

  if (headerStyle && headerWC) {
    const headerCustomer =
      findMatchingHeader(headers, /customer[_\s/.-]?display[_\s.-]?name/i) ||
      findMatchingHeader(headers, /^customer$/i) ||
      findMatchingHeader(headers, /^buyer$/i);
    const headerRouting =
      findMatchingHeader(headers, /routing[_\s/.-]?display[_\s.-]?name/i) ||
      findMatchingHeader(headers, /^routing$/i);
    const headerOrigQty =
      findMatchingHeader(headers, /work[_\s.-]?orders?[_\s/.-]?original[_\s.-]?production[_\s.-]?q/i) ||
      findMatchingHeader(headers, /original[_\s.-]?production[_\s.-]?q/i) ||
      findMatchingHeader(headers, /original[_\s.-]?qty/i);
    const headerQty =
      findMatchingHeader(headers, /work[_\s.-]?orders?[_\s/.-]?quantity/i) ||
      findMatchingHeader(headers, /^quantity$/i) ||
      findMatchingHeader(headers, /^qty$/i);
    const headerQtySisa =
      findMatchingHeader(headers, /work[_\s.-]?orders?[_\s/.-]?qty[_\s.-]?sisa/i) ||
      findMatchingHeader(headers, /qty[_\s.-]?sisa/i) ||
      findMatchingHeader(headers, /remaining[_\s.-]?qty/i) ||
      findMatchingHeader(headers, /sisa/i);
    const headerQtyRepair =
      findMatchingHeader(headers, /work[_\s.-]?orders?[_\s/.-]?qty[_\s.-]?repair/i) ||
      findMatchingHeader(headers, /qty[_\s.-]?repair/i) ||
      findMatchingHeader(headers, /repair[_\s.-]?qty/i);

    const mapping: Partial<ColumnMappingConfig> = {
      buyer: headerCustomer,
      routing: headerRouting,
      style: headerStyle,
      workCenter: headerWC,
      originalQty: headerOrigQty,
      quantity: headerQty,
      remainingQty: headerQtySisa,
      repairQty: headerQtyRepair,
      // Map MO specifically to Display Name column (Requirement 1 & 2)
      // If Display Name is not present, moNumber remains undefined so warning is triggered
      moNumber: headerMODisplayName,
      productionStage: headerWC,
      targetQty: headerOrigQty || headerQty,
    };

    return {
      isRecognized: true,
      templateName: 'PPIC Standard Work Orders Template',
      mapping,
    };
  }

  // 2. Check against custom saved profiles
  for (const profile of customProfiles) {
    const matchesAll = profile.headerSignatures.every((sig) =>
      findMatchingHeader(headers, sig)
    );
    if (matchesAll) {
      return {
        isRecognized: true,
        templateName: profile.name,
        mapping: { ...profile.mapping },
      };
    }
  }

  return {
    isRecognized: false,
    mapping: {},
  };
}

/**
 * Fuzzy matches Excel column names to standard PPIC target keys when template is not recognized.
 */
export function detectColumnMappings(
  headers: string[],
  customProfiles: TemplateProfile[] = []
): Partial<ColumnMappingConfig> {
  // First, check template recognition
  const recognized = recognizeTemplate(headers, customProfiles);
  if (recognized.isRecognized) {
    return recognized.mapping;
  }

  // Fallback smart detection
  const mapping: Partial<ColumnMappingConfig> = {};

  const patterns: Record<keyof ColumnMappingConfig, RegExp[]> = {
    moNumber: [
      /^display[_\s.-]?name$/i,
      /^(manufacturing[_\s.-]?orders?|mfg[_\s.-]?orders?|mo|production[_\s.-]?orders?)[_\s/.-]?display[_\s.-]?name$/i,
      /^(nomor[_\s.-]?mo|no[_\s.-]?mo|mo[_\s.-]?number|no\.?[_\s.-]?mo|manufacturing[_\s.-]?order)$/i,
      /^(order[_\s.-]?no|wo[_\s.-]?no|production[_\s.-]?no)$/i,
    ],
    style: [
      /work[_\s.-]?orders?[_\s/.-]?style[_\s/.-]?display[_\s.-]?name/i,
      /style[_\s/.-]?display[_\s.-]?name/i,
      /^(style|style[_\s.-]?no|item|article|model|product|sku)$/i,
      /style/i,
      /article/i,
    ],
    workCenter: [
      /work[_\s.-]?orders?[_\s/.-]?work[_\s.-]?center[_\s/.-]?display[_\s.-]?name/i,
      /work[_\s.-]?center[_\s/.-]?display[_\s.-]?name/i,
      /^(work[_\s.-]?center|wc|line|line[_\s.-]?produksi|dept|department|station)$/i,
      /work[_\s.-]?center/i,
      /line/i,
    ],
    productionStage: [
      /work[_\s.-]?orders?[_\s/.-]?work[_\s.-]?center/i,
      /^(stage|tahap|tahapan|proses|operation|process|step|urutan)$/i,
      /stage/i,
      /proses/i,
      /tahap/i,
    ],
    originalQty: [
      /work[_\s.-]?orders?[_\s/.-]?original[_\s.-]?production[_\s.-]?q/i,
      /original[_\s.-]?production[_\s.-]?q/i,
      /original[_\s.-]?qty/i,
      /rencana[_\s.-]?produksi/i,
    ],
    quantity: [
      /work[_\s.-]?orders?[_\s/.-]?quantity/i,
      /^(quantity|qty|jumlah|order[_\s.-]?qty)$/i,
      /quantity/i,
    ],
    remainingQty: [
      /work[_\s.-]?orders?[_\s/.-]?qty[_\s.-]?sisa/i,
      /qty[_\s.-]?sisa/i,
      /remaining[_\s.-]?qty/i,
      /sisa/i,
      /backlog/i,
    ],
    repairQty: [
      /work[_\s.-]?orders?[_\s/.-]?qty[_\s.-]?repair/i,
      /^(repair[_\s.-]?qty|qty[_\s.-]?repair|jumlah[_\s.-]?repair|repair)$/i,
    ],
    reworkQty: [
      /^(rework[_\s.-]?qty|qty[_\s.-]?rework|jumlah[_\s.-]?rework|rework)$/i,
    ],
    targetQty: [
      /work[_\s.-]?orders?[_\s/.-]?original[_\s.-]?production[_\s.-]?q/i,
      /^(target|target[_\s.-]?qty|plan[_\s.-]?qty|target[_\s.-]?produksi)$/i,
      /target/i,
      /plan/i,
    ],
    actualQty: [
      /^(actual|actual[_\s.-]?qty|output|qty[_\s.-]?aktual|hasil|realisasi|completed|selesai)$/i,
      /actual/i,
      /output/i,
      /realisasi/i,
    ],
    routing: [
      /routing[_\s/.-]?display[_\s.-]?name/i,
      /^(routing|alur|rute|flow)$/i,
      /routing/i,
    ],
    buyer: [
      /customer[_\s/.-]?display[_\s.-]?name/i,
      /^(buyer|customer|pemesan|klien|pelanggan)$/i,
      /customer/i,
      /buyer/i,
    ],
    qaStatus: [
      /^(qa[_\s.-]?status|status[_\s.-]?qa|qc[_\s.-]?status|status[_\s.-]?qc|inspeksi|hasil[_\s.-]?qc)$/i,
      /qa/i,
      /qc/i,
      /quality/i,
    ],
    sewingCondition: [
      /^(kondisi[_\s.-]?sewing|status[_\s.-]?sewing|sewing[_\s.-]?condition)$/i,
      /kondisi/i,
    ],
    startDate: [/^(start[_\s.-]?date|tgl[_\s.-]?mulai|tanggal[_\s.-]?mulai|start|mulai)$/i],
    endDate: [/^(end[_\s.-]?date|tgl[_\s.-]?selesai|tanggal[_\s.-]?selesai|end|selesai|due[_\s.-]?date)$/i],
    deliveryDate: [/^(delivery[_\s.-]?date|tgl[_\s.-]?kirim|tanggal[_\s.-]?pengiriman|ship[_\s.-]?date)$/i],
    notes: [/^(notes|catatan|keterangan|remark|remarks)$/i],
  };

  const usedHeaders = new Set<string>();

  for (const [key, regexList] of Object.entries(patterns) as [
    keyof ColumnMappingConfig,
    RegExp[]
  ][]) {
    for (const regex of regexList) {
      const match = headers.find((h) => !usedHeaders.has(h) && regex.test(h.trim()));
      if (match) {
        mapping[key] = match;
        usedHeaders.add(match);
        break;
      }
    }
  }

  return mapping;
}

/**
 * Parses raw Excel file buffer into structured sheets, headers, preview rows, and normalized orders.
 * Reads ALL worksheets or selected worksheet and all rows.
 * Processes multi-stage rows per Style without dropping rows.
 */
export function parseExcelWorkbook(
  data: ArrayBuffer | ArrayBufferLike,
  fileName: string,
  preferredSheet?: string,
  customMapping?: Partial<ColumnMappingConfig>,
  customProfiles: TemplateProfile[] = []
): ExcelParsingResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }

  const selectedSheet =
    preferredSheet && sheetNames.includes(preferredSheet) ? preferredSheet : sheetNames[0];

  const worksheet = workbook.Sheets[selectedSheet];
  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  if (rawJson.length === 0) {
    return {
      fileName,
      sheets: sheetNames,
      selectedSheet,
      rawHeaders: [],
      isTemplateRecognized: false,
      detectedMapping: {},
      rows: [],
      normalizedOrders: [],
      summary: {
        totalRows: 0,
        moCount: 0,
        styleCount: 0,
        workCenterCount: 0,
        stageCount: 0,
        sheetsProcessed: sheetNames.length,
        needsVerificationCount: 0,
      },
      unrecognizedStages: [],
      warnings: ['Lembar kerja kosong atau tidak ada data yang terbaca.'],
    };
  }

  // Extract all distinct headers from rows
  const rawHeaders = Object.keys(rawJson[0] || {});

  // Template recognition
  const templateCheck = recognizeTemplate(rawHeaders, customProfiles);
  const isTemplateRecognized = templateCheck.isRecognized;
  const matchedTemplateName = templateCheck.templateName;

  const detectedMapping =
    customMapping && Object.keys(customMapping).length > 0
      ? customMapping
      : isTemplateRecognized
      ? templateCheck.mapping
      : detectColumnMappings(rawHeaders, customProfiles);

  const warnings: string[] = [];

  if (!isTemplateRecognized) {
    warnings.push(
      'Template belum dikenali otomatis. Sistem menggunakan smart detection. Silakan periksa mapping kolom di Advanced Mapping.'
    );
  }

  // Requirement 2: If Display Name column is not found, provide a clear warning
  if (!detectedMapping.moNumber) {
    warnings.push(
      'Peringatan: Kolom "Display Name" untuk identitas Manufacturing Order (MO) tidak ditemukan pada file Excel. Periksa pemetaan kolom agar identitas MO tidak keliru.'
    );
  }

  const batchId = `BATCH-${Date.now()}`;
  const seenMOs = new Set<string>();
  const uniqueStyles = new Set<string>();
  const uniqueWorkCenters = new Set<string>();
  const uniqueStages = new Set<string>();
  const unrecognizedStagesSet = new Set<string>();

  let needsVerificationCount = 0;
  const normalizedOrders: ManufacturingOrder[] = [];

  rawJson.forEach((row, idx) => {
    // 1. MO & Style Extraction (Requirement 1 & 2)
    // Primary MO identity MUST come directly from Excel Display Name column (e.g. WH/MO/23169).
    // Never extract MO from Style brackets (e.g. DAR002-9).
    const moRawCol = detectedMapping.moNumber ? row[detectedMapping.moNumber] : undefined;
    const styleRawCol = detectedMapping.style ? row[detectedMapping.style] : undefined;

    // Check if row is completely empty across all mapped columns
    const hasAnyMappedData = Object.values(detectedMapping).some((col) => {
      const val = col ? row[col] : undefined;
      return val !== undefined && val !== null && String(val).trim() !== '';
    });

    if (!hasAnyMappedData) {
      // Ignore blank empty rows (Requirement 8)
      return;
    }

    const moString = moRawCol !== undefined && moRawCol !== null ? String(moRawCol).trim() : '';
    const styleString = styleRawCol !== undefined && styleRawCol !== null ? String(styleRawCol).trim() : '';

    // Style is stored cleanly from the Style column (e.g. "[DAR002-9] DAR JEANS 002")
    const style = styleString || 'Unknown Style';

    // Row-level verification issues tracking
    const verificationIssues: string[] = [];
    let needsVerification = false;

    // MO Identity: Use pristine Display Name value directly from Excel without changing format
    let moNumber = moString;
    if (!moNumber) {
      needsVerification = true;
      verificationIssues.push(
        detectedMapping.moNumber
          ? 'Nilai kolom "Display Name" untuk identitas MO kosong pada baris ini'
          : 'Kolom "Display Name" untuk identitas MO tidak ditemukan dalam file Excel'
      );
      // Clearly mark unassigned MO without creating synthetic fake numbers
      moNumber = '(MO Belum Ditetapkan)';
    }

    // 2. Stage & Work Center Extraction
    const wcRawCol = detectedMapping.workCenter ? row[detectedMapping.workCenter] : undefined;
    const stageExplicitCol =
      detectedMapping.productionStage && detectedMapping.productionStage !== detectedMapping.workCenter
        ? row[detectedMapping.productionStage]
        : undefined;

    const stageWC = extractStageAndWorkCenter(stageExplicitCol || wcRawCol);

    if (!stageWC.isRecognized) {
      needsVerification = true;
      unrecognizedStagesSet.add(stageWC.stage);
      verificationIssues.push(stageWC.issue || `Tahapan "${stageWC.stage}" belum dikenali`);
    }

    // 3. Quantity Parsing
    // Rules:
    // - Original Production Q -> originalQty
    // - Quantity -> quantity
    // - Qty Sisa -> remainingQty
    // - Qty Repair -> repairQty
    // - Do NOT assume Quantity as Actual Production!
    // - Do NOT create fake formulas for Output Actual!
    const parseNum = (val: any): number | undefined => {
      if (val === null || val === undefined || val === '') return undefined;
      const clean = String(val).replace(/[^0-9.-]+/g, '');
      if (clean === '') return undefined;
      const num = Number(clean);
      return isNaN(num) ? undefined : num;
    };

    const originalQty = detectedMapping.originalQty ? parseNum(row[detectedMapping.originalQty]) : undefined;
    const quantity = detectedMapping.quantity ? parseNum(row[detectedMapping.quantity]) : undefined;
    const remainingQty = detectedMapping.remainingQty ? parseNum(row[detectedMapping.remainingQty]) : undefined;
    const repairQty = detectedMapping.repairQty ? parseNum(row[detectedMapping.repairQty]) : undefined;
    const reworkQty = detectedMapping.reworkQty ? parseNum(row[detectedMapping.reworkQty]) : undefined;

    // Target Qty defaults to originalQty, fallback to quantity or 0
    const targetQty = originalQty ?? quantity ?? 0;

    // Actual Qty: only if explicit actual column exists in Excel
    let actualQty = 0;
    if (detectedMapping.actualQty && row[detectedMapping.actualQty] !== undefined && row[detectedMapping.actualQty] !== '') {
      actualQty = parseNum(row[detectedMapping.actualQty]) ?? 0;
    }

    // 4. Sewing Condition & Repair
    // Qty Repair is strictly associated with Sewing. Never make it a QA status!
    let sewingCondition: 'Normal' | 'Repair' | 'Rework' | undefined = undefined;
    if (stageWC.stage === 'Sewing') {
      if (repairQty && repairQty > 0) {
        sewingCondition = 'Repair';
      } else if (reworkQty && reworkQty > 0) {
        sewingCondition = 'Rework';
      } else if (detectedMapping.sewingCondition && row[detectedMapping.sewingCondition]) {
        const cond = String(row[detectedMapping.sewingCondition]).trim();
        if (/rework/i.test(cond)) sewingCondition = 'Rework';
        else if (/repair/i.test(cond)) sewingCondition = 'Repair';
        else if (cond) sewingCondition = 'Normal';
      } else {
        sewingCondition = 'Normal';
      }
    }

    // 5. QA Status
    // Rule: QA NEVER has status Repair or Rework.
    // Rule: Do NOT synthesize fake QA statuses if absent in Excel.
    const rawQA = detectedMapping.qaStatus ? String(row[detectedMapping.qaStatus] || '').trim() : '';
    let qaStatus: string | undefined = undefined;
    if (rawQA) {
      if (/repair|rework/i.test(rawQA)) {
        if (stageWC.stage === 'Sewing' && !sewingCondition) {
          sewingCondition = /rework/i.test(rawQA) ? 'Rework' : 'Repair';
        }
        qaStatus = undefined;
      } else {
        qaStatus = rawQA;
      }
    }

    // Customer & Routing
    const buyer = detectedMapping.buyer ? String(row[detectedMapping.buyer] || '').trim() || undefined : undefined;
    const routing = detectedMapping.routing ? String(row[detectedMapping.routing] || '').trim() || undefined : undefined;
    const notes = detectedMapping.notes ? String(row[detectedMapping.notes] || '').trim() || undefined : undefined;

    const startDate = detectedMapping.startDate ? normalizeExcelDate(row[detectedMapping.startDate]) : undefined;
    const endDate = detectedMapping.endDate ? normalizeExcelDate(row[detectedMapping.endDate]) : undefined;
    const deliveryDate = detectedMapping.deliveryDate
      ? normalizeExcelDate(row[detectedMapping.deliveryDate])
      : undefined;

    if (needsVerification) {
      needsVerificationCount++;
    }

    seenMOs.add(moNumber);
    if (style) uniqueStyles.add(style);
    if (stageWC.workCenter) uniqueWorkCenters.add(stageWC.workCenter);
    if (stageWC.stage) uniqueStages.add(stageWC.stage);

    normalizedOrders.push({
      id: `${batchId}-${idx + 1}`,
      moNumber,
      style: style || 'Unknown Style',
      workCenter: stageWC.workCenter,
      productionStage: stageWC.stage,
      targetQty,
      actualQty,
      originalQty,
      quantity,
      remainingQty,
      repairQty,
      reworkQty,
      routing,
      buyer,
      line: stageWC.line,
      rawStyle: styleString,
      rawWorkCenter: stageWC.raw,
      qaStatus,
      sewingCondition,
      startDate,
      endDate,
      deliveryDate,
      notes,
      batchId,
      needsVerification,
      verificationIssues: verificationIssues.length > 0 ? verificationIssues : undefined,
      customAttributes: row,
    });
  });

  return {
    fileName,
    sheets: sheetNames,
    selectedSheet,
    rawHeaders,
    isTemplateRecognized,
    matchedTemplateName,
    detectedMapping,
    rows: rawJson,
    normalizedOrders,
    summary: {
      totalRows: normalizedOrders.length,
      moCount: seenMOs.size,
      styleCount: uniqueStyles.size,
      workCenterCount: uniqueWorkCenters.size,
      stageCount: uniqueStages.size,
      sheetsProcessed: sheetNames.length,
      needsVerificationCount,
    },
    unrecognizedStages: Array.from(unrecognizedStagesSet),
    warnings,
  };
}

/**
 * Generates an Excel (.xlsx) file conforming exactly to the user's operational PPIC template structure:
 * Column C: Customer/Display Name
 * Column D: Routing/Display Name
 * Column E: Work Orders/Style/Display Name (format: [DAR002-9] DAR JEANS 002)
 * Column F: Work Orders/Work Center/Display Name (e.g., Sewing Line 1, Sewing Line 2, etc.)
 * Column G: Work Orders/Original Production Q
 * Column H: Work Orders/Quantity
 * Column I: Work Orders/Qty Sisa
 * Column J: Work Orders/Qty Repair
 * Column Display Name: WH/MO/23169 (primary MO identification)
 */
export function generateSampleExcelWorkbook(): Uint8Array {
  const sampleData = [
    {
      'No': 1,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'Cutting Section A',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 0,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 2,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'Sewing Line 1',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 250,
      'Work Orders/Qty Repair': 15,
    },
    {
      'No': 3,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'Area Penerimaan Ironning',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 350,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 4,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'Ironning Station 01',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 480,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 5,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'QC Finishing Line',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 600,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 6,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'QC Ukur Station',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 600,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 7,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23169',
      'Customer/Display Name': 'Uniqlo Global Retail',
      'Routing/Display Name': 'RT-POLO-MENS-V1',
      'Work Orders/Style/Display Name': '[DAR002-9] DAR JEANS 002',
      'Work Orders/Work Center/Display Name': 'QA Audit Room',
      'Work Orders/Original Production Q': 1200,
      'Work Orders/Quantity': 1200,
      'Work Orders/Qty Sisa': 600,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 8,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23170',
      'Customer/Display Name': 'H&M Basic Apparel',
      'Routing/Display Name': 'RT-HOODIE-CW-02',
      'Work Orders/Style/Display Name': '[UNSIO1-2] UNSI HOODIE FLEECE 02',
      'Work Orders/Work Center/Display Name': 'Cutting Section B',
      'Work Orders/Original Production Q': 2000,
      'Work Orders/Quantity': 2000,
      'Work Orders/Qty Sisa': 0,
      'Work Orders/Qty Repair': 0,
    },
    {
      'No': 9,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23170',
      'Customer/Display Name': 'H&M Basic Apparel',
      'Routing/Display Name': 'RT-HOODIE-CW-02',
      'Work Orders/Style/Display Name': '[UNSIO1-2] UNSI HOODIE FLEECE 02',
      'Work Orders/Work Center/Display Name': 'Sewing Line 2',
      'Work Orders/Original Production Q': 2000,
      'Work Orders/Quantity': 2000,
      'Work Orders/Qty Sisa': 1250,
      'Work Orders/Qty Repair': 28,
    },
    {
      'No': 10,
      'Plant': 'PLANT-01',
      'Display Name': 'WH/MO/23171',
      'Customer/Display Name': 'Marks & Spencer',
      'Routing/Display Name': 'RT-CHINO-SLIM-03',
      'Work Orders/Style/Display Name': '[UNSIO1-3] UNSI CHINO PANTS 03',
      'Work Orders/Work Center/Display Name': 'Sewing Line 1',
      'Work Orders/Original Production Q': 850,
      'Work Orders/Quantity': 850,
      'Work Orders/Qty Sisa': 370,
      'Work Orders/Qty Repair': 12,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Production_Work_Orders');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
