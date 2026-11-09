import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProductionStage,
  detectColumnMappings,
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

test('generateSampleExcelWorkbook and parseExcelWorkbook produce 7 standard stages without synthetic QA', () => {
  const fileBytes = generateSampleExcelWorkbook();
  assert.ok(fileBytes.length > 0);

  const parsed = parseExcelWorkbook(fileBytes.buffer, 'sample.xlsx');
  assert.equal(parsed.normalizedOrders.length, 10);

  // Check all 7 stages are present in parsed orders
  const stagesFound = new Set(parsed.normalizedOrders.map((o) => o.productionStage));
  for (const std of STANDARD_PRODUCTION_STAGES) {
    assert.ok(stagesFound.has(std), `Standard stage "${std}" should be present in sample data`);
  }

  // Check Sewing repair and rework
  const reworkOrder = parsed.normalizedOrders.find((o) => o.moNumber === 'MO-2026-103');
  assert.ok(reworkOrder);
  assert.equal(reworkOrder.productionStage, 'Sewing');
  assert.equal(reworkOrder.sewingCondition, 'Rework');
  assert.equal(reworkOrder.reworkQty, 45);

  const repairOrder = parsed.normalizedOrders.find((o) => o.moNumber === 'MO-2026-104');
  assert.ok(repairOrder);
  assert.equal(repairOrder.productionStage, 'Sewing');
  assert.equal(repairOrder.sewingCondition, 'Repair');
  assert.equal(repairOrder.repairQty, 18);

  // Ensure NO order has qaStatus equal to Repair or Rework
  for (const order of parsed.normalizedOrders) {
    if (order.qaStatus) {
      assert.ok(
        !/repair|rework/i.test(order.qaStatus),
        `Order ${order.moNumber} has invalid QA status: ${order.qaStatus}`
      );
    }
  }

  // Ensure orders without QA in Excel do NOT have synthetic 'Pending' or 'Passed'
  const ironningOrder = parsed.normalizedOrders.find((o) => o.productionStage === 'Ironning');
  assert.ok(ironningOrder);
  assert.equal(ironningOrder.qaStatus, undefined, 'Empty QA in Excel must remain undefined');
});
