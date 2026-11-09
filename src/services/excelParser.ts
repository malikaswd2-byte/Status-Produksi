import * as XLSX from 'xlsx';
import {
  ColumnMappingConfig,
  ExcelParsingResult,
  ManufacturingOrder,
} from '../types/ppic';

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
      /^(qa|qc|quality|qa[_\s.-]?status|status[_\s.-]?qa|qc[_\s.-]?status|status[_\s.-]?qc|inspeksi|hasil[_\s.-]?qc)$/i,
      /qa/i,
      /qc/i,
      /quality/i,
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
  data: ArrayBuffer,
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

    let qaStatus = detectedMapping.qaStatus ? String(row[detectedMapping.qaStatus] || '').trim() : '';
    if (!qaStatus) {
      qaStatus = actualQty >= targetQty && targetQty > 0 ? 'Passed' : actualQty > 0 ? 'In-Inspection' : 'Pending';
    }

    const startDate = detectedMapping.startDate ? normalizeExcelDate(row[detectedMapping.startDate]) : undefined;
    const endDate = detectedMapping.endDate ? normalizeExcelDate(row[detectedMapping.endDate]) : undefined;
    const deliveryDate = detectedMapping.deliveryDate
      ? normalizeExcelDate(row[detectedMapping.deliveryDate])
      : undefined;

    const buyer = detectedMapping.buyer ? String(row[detectedMapping.buyer] || '').trim() : undefined;
    const notes = detectedMapping.notes ? String(row[detectedMapping.notes] || '').trim() : undefined;

    normalizedOrders.push({
      id: `${batchId}-${idx + 1}`,
      moNumber,
      style: styleRaw || 'Unknown Style',
      workCenter: wcRaw || 'Unassigned WC',
      productionStage: stageRaw,
      targetQty,
      actualQty,
      qaStatus,
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
      'Work Center': 'Sewing Line 01',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 1200,
      'Actual Qty': 850,
      'Status QA': 'Passed',
      'Tgl Mulai': '2026-11-03',
      'Tgl Selesai': '2026-11-14',
      'Tgl Pengiriman': '2026-11-18',
      'Buyer': 'Uniqlo Global',
      'Catatan': 'Priority batch 1 for Spring launch',
    },
    {
      'Nomor MO': 'MO-2026-102',
      'Style': 'Slim Fit Chino Trousers',
      'Work Center': 'Sewing Line 03',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 850,
      'Actual Qty': 850,
      'Status QA': 'Passed',
      'Tgl Mulai': '2026-11-01',
      'Tgl Selesai': '2026-11-09',
      'Tgl Pengiriman': '2026-11-12',
      'Buyer': 'Zara Men',
      'Catatan': 'First delivery batch',
    },
    {
      'Nomor MO': 'MO-2026-103',
      'Style': 'Slim Fit Chino Trousers',
      'Work Center': 'Finishing Line',
      'Tahap Produksi': 'Ironing & Packing',
      'Target Qty': 850,
      'Actual Qty': 400,
      'Status QA': 'In-Inspection',
      'Tgl Mulai': '2026-11-08',
      'Tgl Selesai': '2026-11-16',
      'Tgl Pengiriman': '2026-11-20',
      'Buyer': 'Zara Men',
      'Catatan': 'Tagging and barcode scan ongoing',
    },
    {
      'Nomor MO': 'MO-2026-104',
      'Style': 'Heavyweight Cotton Hoodie',
      'Work Center': 'Cutting Section',
      'Tahap Produksi': 'Cutting',
      'Target Qty': 2000,
      'Actual Qty': 1900,
      'Status QA': 'Passed',
      'Tgl Mulai': '2026-11-04',
      'Tgl Selesai': '2026-11-11',
      'Tgl Pengiriman': '2026-11-25',
      'Buyer': 'H&M Basic',
      'Catatan': 'Fabric relaxed 24 hours prior',
    },
    {
      'Nomor MO': 'MO-2026-105',
      'Style': 'Heavyweight Cotton Hoodie',
      'Work Center': 'Sewing Line 02',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 2000,
      'Actual Qty': 750,
      'Status QA': 'Rework',
      'Tgl Mulai': '2026-11-10',
      'Tgl Selesai': '2026-11-22',
      'Tgl Pengiriman': '2026-11-28',
      'Buyer': 'H&M Basic',
      'Catatan': 'Cuff stitching tension adjusted',
    },
    {
      'Nomor MO': 'MO-2026-106',
      'Style': 'Oxford Casual Button-Down',
      'Work Center': 'Sewing Line 01',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 600,
      'Actual Qty': 150,
      'Status QA': 'In-Inspection',
      'Tgl Mulai': '2026-11-12',
      'Tgl Selesai': '2026-11-20',
      'Tgl Pengiriman': '2026-11-26',
      'Buyer': 'Marks & Spencer',
      'Catatan': 'Collar fusing inspected',
    },
    {
      'Nomor MO': 'MO-2026-107',
      'Style': 'Water-Repellent Windbreaker',
      'Work Center': 'Cutting Section',
      'Tahap Produksi': 'Cutting',
      'Target Qty': 1500,
      'Actual Qty': 1500,
      'Status QA': 'Passed',
      'Tgl Mulai': '2026-11-06',
      'Tgl Selesai': '2026-11-13',
      'Tgl Pengiriman': '2026-11-30',
      'Buyer': 'Columbia Sportswear',
      'Catatan': 'Laser cutting executed smoothly',
    },
    {
      'Nomor MO': 'MO-2026-108',
      'Style': 'Water-Repellent Windbreaker',
      'Work Center': 'Sewing Line 04',
      'Tahap Produksi': 'Seam Sealing & Sewing',
      'Target Qty': 1500,
      'Actual Qty': 300,
      'Status QA': 'Pending',
      'Tgl Mulai': '2026-11-14',
      'Tgl Selesai': '2026-11-27',
      'Tgl Pengiriman': '2026-11-30',
      'Buyer': 'Columbia Sportswear',
      'Catatan': 'Seam sealing tape calibrated',
    },
    {
      'Nomor MO': 'MO-2026-109',
      'Style': 'Denim Jacket Vintage Wash',
      'Work Center': 'Washing Plant',
      'Tahap Produksi': 'Enzyme Wash',
      'Target Qty': 900,
      'Actual Qty': 450,
      'Status QA': 'Passed',
      'Tgl Mulai': '2026-11-09',
      'Tgl Selesai': '2026-11-18',
      'Tgl Pengiriman': '2026-11-24',
      'Buyer': 'Levi Strauss & Co',
      'Catatan': 'Eco-wash water recycling active',
    },
    {
      'Nomor MO': 'MO-2026-110',
      'Style': 'Athletic Dry-Fit Tee',
      'Work Center': 'Sewing Line 02',
      'Tahap Produksi': 'Sewing',
      'Target Qty': 3000,
      'Actual Qty': 2800,
      'Status QA': 'Passed',
      'Tgl Mulai': '2026-11-02',
      'Tgl Selesai': '2026-11-15',
      'Tgl Pengiriman': '2026-11-19',
      'Buyer': 'Decathlon',
      'Catatan': 'High efficiency line output',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PPIC_Production_Orders');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
