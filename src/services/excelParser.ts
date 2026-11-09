import * as XLSX from 'xlsx';
import {
  ColumnMappingConfig,
  ExcelParsingResult,
  ManufacturingOrder,
  STANDARD_PRODUCTION_STAGES,
} from '../types/ppic';

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

  if (/penerimaan[_\s.-]?iron|terima[_\s.-]?iron/i.test(lower)) return 'Penerimaan Ironning';
  if (/iron|setrika|gosok/i.test(lower)) return 'Ironning';
  if (/qc[_\s.-]?finish|finishing[_\s.-]?qc|finish[_\s.-]?qc/i.test(lower)) return 'QC Finishing';
  if (/qc[_\s.-]?ukur|measurement|ukur/i.test(lower)) return 'QC Ukur';
  if (/^qa$|quality[_\s.-]?assurance/i.test(lower)) return 'QA';
  if (/sewing|jahit/i.test(lower)) return 'Sewing';
  if (/cutting|potong/i.test(lower)) return 'Cutting';

  // Check if it exactly matches one of the standard stages ignoring case
  const exact = STANDARD_PRODUCTION_STAGES.find((s) => s.toLowerCase() === lower);
  return exact || trimmed;
}

/**
 * Normalizes Excel dates whether stored as Excel serial numbers, JS Dates, or formatted strings.
 */
export function normalizeExcelDate(val: any): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;

  // If already YYYY-MM-DD
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }

  // If number (Excel serial date)
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

  // If Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If string date like DD/MM/YYYY or MM/DD/YYYY
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      // If 4-digit year at end: DD/MM/YYYY or MM/DD/YYYY
      if (parts[2].length === 4) {
        const y = parts[2];
        const m = parts[1].padStart(2, '0');
        const d = parts[0].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      // If 4-digit year at start: YYYY/MM/DD
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
 * Fuzzy matches Excel column names to standard PPIC target keys.
 */
export function detectColumnMappings(headers: string[]): Partial<ColumnMappingConfig> {
  const mapping: Partial<ColumnMappingConfig> = {};

  const patterns: Record<keyof ColumnMappingConfig, RegExp[]> = {
    moNumber: [
      /^(mo|no[_\s.-]?mo|nomor[_\s.-]?mo|order[_\s.-]?no|spk|no[_\s.-]?spk|work[_\s.-]?order|mfg[_\s.-]?order|wo[_\s.-]?no)$/i,
      /mo/i,
      /order/i,
      /spk/i,
    ],
    style: [
      /^(style|style[_\s.-]?no|item|article|model|product|sku|kode[_\s.-]?barang|nama[_\s.-]?barang)$/i,
      /style/i,
      /article/i,
      /item/i,
    ],
    workCenter: [
      /^(work[_\s.-]?center|wc|line|line[_\s.-]?produksi|dept|department|station|workshop|line[_\s.-]?no)$/i,
      /work[_\s.-]?center/i,
      /line/i,
      /dept/i,
    ],
    productionStage: [
      /^(stage|tahap|tahapan|proses|operation|process|step|urutan)$/i,
      /stage/i,
      /proses/i,
      /tahap/i,
    ],
    targetQty: [
      /^(qty|quantity|target|target[_\s.-]?qty|plan[_\s.-]?qty|order[_\s.-]?qty|jumlah|rencana|target[_\s.-]?produksi)$/i,
      /target/i,
      /plan/i,
      /qty/i,
    ],
    actualQty: [
      /^(actual|actual[_\s.-]?qty|output|qty[_\s.-]?aktual|hasil|realisasi|completed|selesai)$/i,
      /actual/i,
      /output/i,
      /realisasi/i,
    ],
    qaStatus: [
      /^(qa[_\s.-]?status|status[_\s.-]?qa|qc[_\s.-]?status|status[_\s.-]?qc|inspeksi|hasil[_\s.-]?qc)$/i,
      /qa/i,
      /qc/i,
      /quality/i,
    ],
    sewingCondition: [
      /^(kondisi[_\s.-]?sewing|status[_\s.-]?sewing|sewing[_\s.-]?condition|sewing[_\s.-]?status|repair[_\s.-]?rework)$/i,
      /kondisi/i,
    ],
    repairQty: [
      /^(repair[_\s.-]?qty|qty[_\s.-]?repair|jumlah[_\s.-]?repair|repair)$/i,
    ],
    reworkQty: [
      /^(rework[_\s.-]?qty|qty[_\s.-]?rework|jumlah[_\s.-]?rework|rework)$/i,
    ],
    startDate: [
      /^(start[_\s.-]?date|tgl[_\s.-]?mulai|tanggal[_\s.-]?mulai|start|mulai)$/i,
      /mulai/i,
      /start/i,
    ],
    endDate: [
      /^(end[_\s.-]?date|tgl[_\s.-]?selesai|tanggal[_\s.-]?selesai|end|selesai|due[_\s.-]?date|deadline)$/i,
      /selesai/i,
      /due/i,
      /deadline/i,
    ],
    deliveryDate: [
      /^(delivery[_\s.-]?date|tgl[_\s.-]?kirim|tanggal[_\s.-]?pengiriman|ship[_\s.-]?date|tgl[_\s.-]?ekspedisi)$/i,
      /kirim/i,
      /delivery/i,
    ],
    buyer: [/^(buyer|customer|pemesan|klien|pelanggan)$/i, /buyer/i, /customer/i],
    notes: [/^(notes|catatan|keterangan|remark|remarks)$/i, /catatan/i, /remark/i],
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
 */
export function parseExcelWorkbook(
  data: ArrayBuffer | ArrayBufferLike,
  fileName: string,
  preferredSheet?: string,
  customMapping?: Partial<ColumnMappingConfig>
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
      detectedMapping: {},
      rows: [],
      normalizedOrders: [],
      summary: { totalRows: 0, moCount: 0, styleCount: 0, workCenterCount: 0 },
      warnings: ['Lembar kerja kosong atau tidak ada data yang terbaca.'],
    };
  }

  // Extract all distinct keys from first rows
  const rawHeaders = Object.keys(rawJson[0] || {});
  const detectedMapping = customMapping || detectColumnMappings(rawHeaders);
  const warnings: string[] = [];

  // Validation checks
  if (!detectedMapping.moNumber) {
    warnings.push('Kolom Nomor MO (Manufacturing Order) tidak terdeteksi otomatis.');
  }
  if (!detectedMapping.style) {
    warnings.push('Kolom Style tidak terdeteksi otomatis.');
  }
  if (!detectedMapping.workCenter) {
    warnings.push('Kolom Work Center tidak terdeteksi otomatis.');
  }

  const batchId = `BATCH-${Date.now()}`;
  const seenMOs = new Set<string>();
  const duplicateMOs = new Set<string>();
  const uniqueStyles = new Set<string>();
  const uniqueWorkCenters = new Set<string>();

  const normalizedOrders: ManufacturingOrder[] = [];

  rawJson.forEach((row, idx) => {
    const moRaw = detectedMapping.moNumber ? String(row[detectedMapping.moNumber] || '').trim() : '';
    const styleRaw = detectedMapping.style ? String(row[detectedMapping.style] || '').trim() : '';
    const wcRaw = detectedMapping.workCenter ? String(row[detectedMapping.workCenter] || '').trim() : '';
    const stageRaw = detectedMapping.productionStage
      ? String(row[detectedMapping.productionStage] || '').trim()
      : 'General';

    if (!moRaw && !styleRaw) {
      // skip completely empty rows
      return;
    }

    const moNumber = moRaw || `MO-AUTO-${idx + 1}`;
    if (seenMOs.has(moNumber)) {
      duplicateMOs.add(moNumber);
    } else {
      seenMOs.add(moNumber);
    }

    if (styleRaw) uniqueStyles.add(styleRaw);
    if (wcRaw) uniqueWorkCenters.add(wcRaw);

    const targetQtyRaw = detectedMapping.targetQty ? row[detectedMapping.targetQty] : 0;
    const actualQtyRaw = detectedMapping.actualQty ? row[detectedMapping.actualQty] : 0;

    const targetQty = Number(String(targetQtyRaw).replace(/[^0-9.-]+/g, '')) || 0;
    const actualQty = Number(String(actualQtyRaw).replace(/[^0-9.-]+/g, '')) || 0;

    const productionStage = normalizeProductionStage(stageRaw);

    // Parse Sewing condition, Repair and Rework
    let sewingCondition: 'Normal' | 'Repair' | 'Rework' | undefined = undefined;
    let repairQty: number | undefined = undefined;
    let reworkQty: number | undefined = undefined;

    if (detectedMapping.sewingCondition && row[detectedMapping.sewingCondition] !== undefined) {
      const condRaw = String(row[detectedMapping.sewingCondition]).trim();
      if (/rework/i.test(condRaw)) sewingCondition = 'Rework';
      else if (/repair/i.test(condRaw)) sewingCondition = 'Repair';
      else if (condRaw) sewingCondition = 'Normal';
    }

    if (detectedMapping.repairQty && row[detectedMapping.repairQty] !== undefined && row[detectedMapping.repairQty] !== '') {
      repairQty = Number(String(row[detectedMapping.repairQty]).replace(/[^0-9.-]+/g, '')) || 0;
      if (repairQty > 0 && !sewingCondition) sewingCondition = 'Repair';
    }

    if (detectedMapping.reworkQty && row[detectedMapping.reworkQty] !== undefined && row[detectedMapping.reworkQty] !== '') {
      reworkQty = Number(String(row[detectedMapping.reworkQty]).replace(/[^0-9.-]+/g, '')) || 0;
      if (reworkQty > 0) sewingCondition = 'Rework';
    }

    // Process QA status:
    // Rule: QA NEVER has Repair or Rework status. If found in raw QA column, relocate to Sewing condition.
    // Rule: Do NOT synthesize fake QA statuses (Passed, Pending, etc.) without actual Excel data.
    const rawQA = detectedMapping.qaStatus ? String(row[detectedMapping.qaStatus] || '').trim() : '';
    let qaStatus: string | undefined = undefined;

    if (rawQA) {
      if (/repair/i.test(rawQA)) {
        if (!sewingCondition || productionStage === 'Sewing') {
          sewingCondition = 'Repair';
        }
        qaStatus = undefined; // QA does not have status Repair
      } else if (/rework/i.test(rawQA)) {
        if (!sewingCondition || productionStage === 'Sewing') {
          sewingCondition = 'Rework';
        }
        qaStatus = undefined; // QA does not have status Rework
      } else {
        qaStatus = rawQA;
      }
    }

    const startDate = detectedMapping.startDate ? normalizeExcelDate(row[detectedMapping.startDate]) : undefined;
    const endDate = detectedMapping.endDate ? normalizeExcelDate(row[detectedMapping.endDate]) : undefined;
    const deliveryDate = detectedMapping.deliveryDate
      ? normalizeExcelDate(row[detectedMapping.deliveryDate])
      : undefined;

    const buyer = detectedMapping.buyer ? String(row[detectedMapping.buyer] || '').trim() : undefined;
    const notes = detectedMapping.notes ? String(row[detectedMapping.notes] || '').trim() : undefined;

    // Check notes for Sewing repair/rework if not set
    if (!sewingCondition && notes && productionStage === 'Sewing') {
      if (/rework/i.test(notes)) sewingCondition = 'Rework';
      else if (/repair/i.test(notes)) sewingCondition = 'Repair';
    }

    normalizedOrders.push({
      id: `${batchId}-${idx + 1}`,
      moNumber,
      style: styleRaw || 'Unknown Style',
      workCenter: wcRaw || 'Unassigned WC',
      productionStage,
      targetQty,
      actualQty,
      qaStatus,
      sewingCondition,
      repairQty,
      reworkQty,
      startDate,
      endDate,
      deliveryDate,
      buyer,
      notes,
      batchId,
      customAttributes: row,
    });
  });

  if (duplicateMOs.size > 0) {
    warnings.push(
      `Terdapat ${duplicateMOs.size} nomor MO yang muncul di beberapa baris detail (misalnya sub-proses atau ukuran berbeda). Data baris detail tetap dipertahankan.`
    );
  }

  return {
    fileName,
    sheets: sheetNames,
    selectedSheet,
    rawHeaders,
    detectedMapping,
    rows: rawJson,
    normalizedOrders,
    summary: {
      totalRows: normalizedOrders.length,
      moCount: seenMOs.size,
      styleCount: uniqueStyles.size,
      workCenterCount: uniqueWorkCenters.size,
    },
    warnings,
  };
}

/**
 * Generates a realistic sample Excel (.xlsx) file that can be downloaded or loaded directly.
 */
export function generateSampleExcelWorkbook(): Uint8Array {
  const sampleData = [
    {
      'Nomor MO': 'MO-2026-101',
      'Style': 'Mens Pique Polo Shirt',
      'Work Center': 'Cutting Section A',
      'Tahap Produksi': 'Cutting',
      'Target Qty': 1200,
      'Actual Qty': 1200,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': 'Passed Fabric Inspection',
      'Tgl Mulai': '2026-11-01',
      'Tgl Selesai': '2026-11-05',
      'Tgl Pengiriman': '2026-11-18',
      'Buyer': 'Uniqlo Global',
      'Catatan': 'Priority batch 1 for Spring launch',
    },
    {
      'Nomor MO': 'MO-2026-102',
      'Style': 'Mens Pique Polo Shirt',
      'Work Center': 'Sewing Line 01',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 1200,
      'Actual Qty': 950,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': '',
      'Tgl Mulai': '2026-11-04',
      'Tgl Selesai': '2026-11-14',
      'Tgl Pengiriman': '2026-11-18',
      'Buyer': 'Uniqlo Global',
      'Catatan': 'Collar attachment running on schedule',
    },
    {
      'Nomor MO': 'MO-2026-103',
      'Style': 'Heavyweight Cotton Hoodie',
      'Work Center': 'Sewing Line 02',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 2000,
      'Actual Qty': 750,
      'Kondisi Sewing': 'Rework',
      'Qty Repair': 0,
      'Qty Rework': 45,
      'Status QA': '',
      'Tgl Mulai': '2026-11-08',
      'Tgl Selesai': '2026-11-20',
      'Tgl Pengiriman': '2026-11-28',
      'Buyer': 'H&M Basic',
      'Catatan': 'Cuff stitching tension recalibrated',
    },
    {
      'Nomor MO': 'MO-2026-104',
      'Style': 'Oxford Casual Button-Down',
      'Work Center': 'Sewing Line 01',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 600,
      'Actual Qty': 220,
      'Kondisi Sewing': 'Repair',
      'Qty Repair': 18,
      'Qty Rework': 0,
      'Status QA': '',
      'Tgl Mulai': '2026-11-10',
      'Tgl Selesai': '2026-11-22',
      'Tgl Pengiriman': '2026-11-26',
      'Buyer': 'Marks & Spencer',
      'Catatan': 'Collar point repair minor alignment',
    },
    {
      'Nomor MO': 'MO-2026-105',
      'Style': 'Slim Fit Chino Trousers',
      'Work Center': 'Area Penerimaan Ironning',
      'Tahap Produksi': 'Penerimaan Ironning',
      'Target Qty': 850,
      'Actual Qty': 850,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': '',
      'Tgl Mulai': '2026-11-09',
      'Tgl Selesai': '2026-11-12',
      'Tgl Pengiriman': '2026-11-20',
      'Buyer': 'Zara Men',
      'Catatan': 'Batch transfer from sewing verified',
    },
    {
      'Nomor MO': 'MO-2026-106',
      'Style': 'Slim Fit Chino Trousers',
      'Work Center': 'Ironning Station 01',
      'Tahap Produksi': 'Ironning',
      'Target Qty': 850,
      'Actual Qty': 480,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': '',
      'Tgl Mulai': '2026-11-11',
      'Tgl Selesai': '2026-11-16',
      'Tgl Pengiriman': '2026-11-20',
      'Buyer': 'Zara Men',
      'Catatan': 'Crease line pressing in progress',
    },
    {
      'Nomor MO': 'MO-2026-107',
      'Style': 'Water-Repellent Windbreaker',
      'Work Center': 'QC Finishing Line',
      'Tahap Produksi': 'QC Finishing',
      'Target Qty': 1500,
      'Actual Qty': 1100,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': '',
      'Tgl Mulai': '2026-11-12',
      'Tgl Selesai': '2026-11-19',
      'Tgl Pengiriman': '2026-11-30',
      'Buyer': 'Columbia Sportswear',
      'Catatan': 'Zipper puller & snap button checking',
    },
    {
      'Nomor MO': 'MO-2026-108',
      'Style': 'Water-Repellent Windbreaker',
      'Work Center': 'QC Ukur Station',
      'Tahap Produksi': 'QC Ukur',
      'Target Qty': 1500,
      'Actual Qty': 750,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': '',
      'Tgl Mulai': '2026-11-14',
      'Tgl Selesai': '2026-11-22',
      'Tgl Pengiriman': '2026-11-30',
      'Buyer': 'Columbia Sportswear',
      'Catatan': 'Measurement spec sheet tolerance ±0.5cm',
    },
    {
      'Nomor MO': 'MO-2026-109',
      'Style': 'Denim Jacket Vintage Wash',
      'Work Center': 'QA Audit Room',
      'Tahap Produksi': 'QA',
      'Target Qty': 900,
      'Actual Qty': 900,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': 'Passed AQL 1.5 Final Audit',
      'Tgl Mulai': '2026-11-12',
      'Tgl Selesai': '2026-11-18',
      'Tgl Pengiriman': '2026-11-24',
      'Buyer': 'Levi Strauss & Co',
      'Catatan': 'Final carton packing audit approved',
    },
    {
      'Nomor MO': 'MO-2026-110',
      'Style': 'Athletic Dry-Fit Tee',
      'Work Center': 'QA Audit Room',
      'Tahap Produksi': 'QA',
      'Target Qty': 3000,
      'Actual Qty': 2850,
      'Kondisi Sewing': 'Normal',
      'Qty Repair': 0,
      'Qty Rework': 0,
      'Status QA': 'Audit Selesai 2026-11-15',
      'Tgl Mulai': '2026-11-10',
      'Tgl Selesai': '2026-11-16',
      'Tgl Pengiriman': '2026-11-19',
      'Buyer': 'Decathlon',
      'Catatan': 'Audit sampling completed',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PPIC_Production_Orders');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
