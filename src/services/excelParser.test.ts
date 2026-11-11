import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProductionStage,
  extractStyleAndMO,
  extractStageAndWorkCenter,
  recognizeTemplate,
  generateSampleExcelWorkbook,
  parseExcelWorkbook,
} from './excelParser';
import { STANDARD_PRODUCTION_STAGES } from '../types/ppic';

test('normalizeProductionStage correctly maps to the 7 standard stages', () => {
  assert.equal(normalizeProductionStage('Potong'), 'Cutting');
  assert.equal(normalizeProductionStage('Cutting'), 'Cutting');
  assert.equal(normalizeProductionStage('Jahit'), 'Sewing');
  assert.equal(normalizeProductionStage('Sewing Line 1'), 'Sewing');
  assert.equal(normalizeProductionStage('Terima Iron'), 'Penerimaan Ironning');
  assert.equal(normalizeProductionStage('Penerimaan Ironning'), 'Penerimaan Ironning');
  assert.equal(normalizeProductionStage('Ironing'), 'Ironning');
  assert.equal(normalizeProductionStage('Gosok'), 'Ironning');
  assert.equal(normalizeProductionStage('QC Finishing'), 'QC Finishing');
  assert.equal(normalizeProductionStage('QC Ukur'), 'QC Ukur');
  assert.equal(normalizeProductionStage('Measurement'), 'QC Ukur');
  assert.equal(normalizeProductionStage('QA'), 'QA');
  assert.equal(normalizeProductionStage('Quality Assurance'), 'QA');
});

test('extractStyleAndMO separates MO and Style using [MO] Style pattern accurately', () => {
  // Test user example: [UNSIO1-1] UNSI JSU MHS 01
  const result1 = extractStyleAndMO('[UNSIO1-1] UNSI JSU MHS 01');
  assert.equal(result1.moNumber, 'UNSIO1-1');
  assert.equal(result1.style, 'UNSI JSU MHS 01');
  assert.equal(result1.isConfident, true);
  assert.equal(result1.needsVerification, false);

  // Test bracket-only MO
  const result2 = extractStyleAndMO('[MO-999]');
  assert.equal(result2.moNumber, 'MO-999');
  assert.equal(result2.style, 'MO-999');
  assert.equal(result2.isConfident, true);

  // Test hyphen prefix format
  const result3 = extractStyleAndMO('MO-2026-101 - Heavyweight Cotton Hoodie');
  assert.equal(result3.moNumber, 'MO-2026-101');
  assert.equal(result3.style, 'Heavyweight Cotton Hoodie');
  assert.equal(result3.isConfident, true);

  // Test plain style text without clear MO (must NOT invent fake MO)
  const result4 = extractStyleAndMO('Plain Cotton T-Shirt Unbranded');
  assert.equal(result4.moNumber, '');
  assert.equal(result4.style, 'Plain Cotton T-Shirt Unbranded');
  assert.equal(result4.isConfident, false);
  assert.equal(result4.needsVerification, true);
});

test('extractStageAndWorkCenter preserves line info and maps to 7 standard stages', () => {
  // Sewing Line 1
  const s1 = extractStageAndWorkCenter('Sewing Line 1');
  assert.equal(s1.stage, 'Sewing');
  assert.equal(s1.workCenter, 'Sewing Line 1');
  assert.equal(s1.line, 'Line 1');
  assert.equal(s1.isRecognized, true);

  // Sewing Line 2
  const s2 = extractStageAndWorkCenter('Sewing Line 2');
  assert.equal(s2.stage, 'Sewing');
  assert.equal(s2.workCenter, 'Sewing Line 2');
  assert.equal(s2.line, 'Line 2');
  assert.equal(s2.isRecognized, true);
  // Ensure lines are NOT merged
  assert.notEqual(s1.workCenter, s2.workCenter);

  // Area Penerimaan Ironning
  const s3 = extractStageAndWorkCenter('Area Penerimaan Ironning');
  assert.equal(s3.stage, 'Penerimaan Ironning');
  assert.equal(s3.isRecognized, true);

  // Ironning Station 01
  const s4 = extractStageAndWorkCenter('Ironning Station 01');
  assert.equal(s4.stage, 'Ironning');
  assert.equal(s4.line, 'Station 01');
  assert.equal(s4.isRecognized, true);

  // QC Ukur Station
  const s5 = extractStageAndWorkCenter('QC Ukur Station');
  assert.equal(s5.stage, 'QC Ukur');
  assert.equal(s5.isRecognized, true);

  // Unrecognized stage: must NOT be discarded
  const unk = extractStageAndWorkCenter('Sub-Assembly Special Part');
  assert.equal(unk.stage, 'Sub-Assembly Special Part');
  assert.equal(unk.isRecognized, false);
  assert.equal(unk.needsVerification, true);
});

test('recognizeTemplate identifies PPIC Standard Production Template headers automatically', () => {
  const headers = [
    'No',
    'Plant',
    'Customer/Display Name',
    'Routing/Display Name',
    'Work Orders/Style/Display Name',
    'Work Orders/Work Center/Display Name',
    'Work Orders/Original Production Q',
    'Work Orders/Quantity',
    'Work Orders/Qty Sisa',
    'Work Orders/Qty Repair',
  ];

  const recognized = recognizeTemplate(headers);
  assert.equal(recognized.isRecognized, true);
  assert.equal(recognized.templateName, 'PPIC Standard Work Orders Template');
  assert.equal(recognized.mapping.buyer, 'Customer/Display Name');
  assert.equal(recognized.mapping.routing, 'Routing/Display Name');
  assert.equal(recognized.mapping.style, 'Work Orders/Style/Display Name');
  assert.equal(recognized.mapping.workCenter, 'Work Orders/Work Center/Display Name');
  assert.equal(recognized.mapping.originalQty, 'Work Orders/Original Production Q');
  assert.equal(recognized.mapping.quantity, 'Work Orders/Quantity');
  assert.equal(recognized.mapping.remainingQty, 'Work Orders/Qty Sisa');
  assert.equal(recognized.mapping.repairQty, 'Work Orders/Qty Repair');
});

test('generateSampleExcelWorkbook and parseExcelWorkbook produce auto-recognized template without manual mapping', () => {
  const fileBytes = generateSampleExcelWorkbook();
  assert.ok(fileBytes.length > 0);

  const parsed = parseExcelWorkbook(fileBytes.buffer, 'sample_template.xlsx');

  // Verify template was recognized automatically
  assert.equal(parsed.isTemplateRecognized, true);
  assert.equal(parsed.matchedTemplateName, 'PPIC Standard Work Orders Template');
  assert.equal(parsed.normalizedOrders.length, 10);

  // Multi-stage rows of MO [UNSIO1-1] must all link to UNSIO1-1 and Style "UNSI JSU MHS 01"
  const unsioOrders = parsed.normalizedOrders.filter((o) => o.moNumber === 'UNSIO1-1');
  assert.equal(unsioOrders.length, 7);
  for (const o of unsioOrders) {
    assert.equal(o.style, 'UNSI JSU MHS 01');
    assert.equal(o.buyer, 'Uniqlo Global Retail');
    assert.equal(o.routing, 'RT-POLO-MENS-V1');
  }

  // Check unique MO count: UNSIO1-1 (7 rows) + UNSIO1-2 (2 rows) + UNSIO1-3 (1 row) = 3 MOs
  assert.equal(parsed.summary.moCount, 3);
  assert.equal(parsed.summary.styleCount, 3);

  // Check all 7 stages are present across the 10 rows
  const stagesFound = new Set(parsed.normalizedOrders.map((o) => o.productionStage));
  for (const std of STANDARD_PRODUCTION_STAGES) {
    assert.ok(stagesFound.has(std), `Standard stage "${std}" should be present in sample data`);
  }

  // Check Sewing repair on Line 1 (UNSIO1-1: 15 pcs repair)
  const sewingRow1 = parsed.normalizedOrders.find(
    (o) => o.moNumber === 'UNSIO1-1' && o.productionStage === 'Sewing'
  );
  assert.ok(sewingRow1);
  assert.equal(sewingRow1.workCenter, 'Sewing Line 1');
  assert.equal(sewingRow1.line, 'Line 1');
  assert.equal(sewingRow1.sewingCondition, 'Repair');
  assert.equal(sewingRow1.repairQty, 15);
  assert.equal(sewingRow1.remainingQty, 250);
  assert.equal(sewingRow1.originalQty, 1200);
  assert.equal(sewingRow1.quantity, 1200);

  // Ensure QA does NOT have repair or rework status
  const qaRow = parsed.normalizedOrders.find(
    (o) => o.moNumber === 'UNSIO1-1' && o.productionStage === 'QA'
  );
  assert.ok(qaRow);
  assert.equal(qaRow.qaStatus, undefined, 'QA status should not be synthetic');
});
