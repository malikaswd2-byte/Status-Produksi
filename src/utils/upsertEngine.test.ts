import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAndExecuteUpsert } from './upsertEngine';
import { ManufacturingOrder } from '../types/ppic';

const seedOrders: ManufacturingOrder[] = [
  {
    id: 'seed-1',
    moNumber: 'WH/MO/001',
    style: 'WRP3 STAF 04',
    buyer: 'ADARO',
    workCenter: 'Cutting Section A',
    productionStage: 'Cutting',
    targetQty: 500,
    actualQty: 500,
    batchId: 'batch-init',
  },
  {
    id: 'seed-2',
    moNumber: 'WH/MO/001',
    style: 'WRP3 STAF 04',
    buyer: 'ADARO',
    workCenter: 'Sewing Line 1',
    productionStage: 'Sewing',
    targetQty: 500,
    actualQty: 300,
    batchId: 'batch-init',
  },
];

test('Condition 1: Customer same, Style same, WH/MO different -> creates new MO', () => {
  const incoming: ManufacturingOrder[] = [
    {
      id: 'inc-1',
      moNumber: 'WH/MO/002',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Cutting Section B',
      productionStage: 'Cutting',
      targetQty: 1000,
      actualQty: 1000,
      batchId: 'batch-temp',
    },
    {
      id: 'inc-2',
      moNumber: 'WH/MO/002',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Sewing Line 2',
      productionStage: 'Sewing',
      targetQty: 1000,
      actualQty: 800,
      batchId: 'batch-temp',
    },
  ];

  const result = analyzeAndExecuteUpsert(seedOrders, incoming, 'batch-new-1');

  assert.equal(result.newMOCount, 1, 'Should detect 1 new MO');
  assert.equal(result.updatedMOCount, 0, 'Should not update existing MO');
  assert.equal(result.conflictCount, 0, 'No conflict');

  // Resulting orders should contain both WH/MO/001 (2 rows) and WH/MO/002 (2 rows)
  assert.equal(result.resultingOrders.length, 4);
  const mo1 = result.resultingOrders.filter((o) => o.moNumber === 'WH/MO/001');
  const mo2 = result.resultingOrders.filter((o) => o.moNumber === 'WH/MO/002');
  assert.equal(mo1.length, 2, 'WH/MO/001 should remain intact with 2 stages');
  assert.equal(mo2.length, 2, 'WH/MO/002 should have 2 stages');
});

test('Condition 2: Customer different, Style same, WH/MO different -> creates new MO', () => {
  const incoming: ManufacturingOrder[] = [
    {
      id: 'inc-3',
      moNumber: 'WH/MO/003',
      style: 'WRP3 STAF 04',
      buyer: 'KPC COAL', // Different customer, same style
      workCenter: 'Cutting Section A',
      productionStage: 'Cutting',
      targetQty: 600,
      actualQty: 600,
      batchId: 'batch-temp',
    },
  ];

  const result = analyzeAndExecuteUpsert(seedOrders, incoming, 'batch-new-2');
  assert.equal(result.newMOCount, 1, 'Must create a new separate MO');
  assert.equal(result.resultingOrders.length, 3, 'Seed 2 rows + new 1 row = 3 rows');
});

test('Condition 3 & 4: Customer same, Style same, WH/MO same -> updates data with latest Quantity (no summing)', () => {
  const incomingUpdate: ManufacturingOrder[] = [
    {
      id: 'inc-4',
      moNumber: 'WH/MO/001',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Cutting Section A',
      productionStage: 'Cutting',
      targetQty: 500,
      actualQty: 500, // unchanged
      batchId: 'batch-temp',
    },
    {
      id: 'inc-5',
      moNumber: 'WH/MO/001',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Sewing Line 1',
      productionStage: 'Sewing',
      targetQty: 500,
      actualQty: 450, // updated from 300 to 450!
      batchId: 'batch-temp',
    },
  ];

  const result = analyzeAndExecuteUpsert(seedOrders, incomingUpdate, 'batch-update-1');

  assert.equal(result.newMOCount, 0, 'No new MO created');
  assert.equal(result.updatedMOCount, 1, 'WH/MO/001 is updated');
  assert.equal(result.resultingOrders.length, 2, 'Total rows should still be 2, no duplicates!');

  const sewingStage = result.resultingOrders.find(
    (o) => o.moNumber === 'WH/MO/001' && o.productionStage === 'Sewing'
  );
  assert.ok(sewingStage);
  assert.equal(sewingStage?.actualQty, 450, 'Actual Qty must be updated to 450, NOT summed (300+450=750)');
});

test('Condition 5: WH/MO same with multiple stages -> updates and appends stages accurately', () => {
  const incomingMultiStage: ManufacturingOrder[] = [
    {
      id: 'inc-6',
      moNumber: 'WH/MO/001',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Cutting Section A',
      productionStage: 'Cutting',
      targetQty: 500,
      actualQty: 500,
      batchId: 'batch-temp',
    },
    {
      id: 'inc-7',
      moNumber: 'WH/MO/001',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Sewing Line 1',
      productionStage: 'Sewing',
      targetQty: 500,
      actualQty: 480,
      batchId: 'batch-temp',
    },
    {
      id: 'inc-8',
      moNumber: 'WH/MO/001',
      style: 'WRP3 STAF 04',
      buyer: 'ADARO',
      workCenter: 'Ironning Station 01',
      productionStage: 'Ironning',
      targetQty: 500,
      actualQty: 200,
      batchId: 'batch-temp',
    },
  ];

  const result = analyzeAndExecuteUpsert(seedOrders, incomingMultiStage, 'batch-multistage');

  assert.equal(result.updatedMOCount, 1);
  const mo1Stages = result.resultingOrders.filter((o) => o.moNumber === 'WH/MO/001');
  assert.equal(mo1Stages.length, 3, 'Now has 3 stages (Cutting, Sewing, Ironning)');
  assert.equal(mo1Stages.find((o) => o.productionStage === 'Ironning')?.actualQty, 200);
});

test('Condition 6: Upload the same file again -> does not duplicate data, marked unchanged', () => {
  const result = analyzeAndExecuteUpsert(seedOrders, seedOrders, 'batch-duplicate');

  assert.equal(result.newMOCount, 0);
  assert.equal(result.updatedMOCount, 0);
  assert.equal(result.unchangedRowsCount, 2, 'Both rows are marked unchanged');
  assert.equal(result.resultingOrders.length, 2, 'No duplicates created');
});

test('Condition 7: WH/MO same, Style different -> detects identity conflict and preserves old data', () => {
  const conflictingIncoming: ManufacturingOrder[] = [
    {
      id: 'inc-conflict',
      moNumber: 'WH/MO/001', // Same MO
      style: 'DIFFERENT JACKET BOMBER 99', // Different Style!
      buyer: 'ADARO',
      workCenter: 'Cutting Section A',
      productionStage: 'Cutting',
      targetQty: 999,
      actualQty: 999,
      batchId: 'batch-conflict',
    },
  ];

  const result = analyzeAndExecuteUpsert(seedOrders, conflictingIncoming, 'batch-conflict-id');

  assert.equal(result.conflictCount, 1, 'Must detect 1 conflict');
  assert.equal(result.conflicts[0].moNumber, 'WH/MO/001');
  assert.ok(result.conflicts[0].conflictReason?.includes('Konflik Identitas'));

  // Ensure old data is NOT overwritten
  const preservedMO = result.resultingOrders.find((o) => o.moNumber === 'WH/MO/001');
  assert.equal(preservedMO?.style, 'WRP3 STAF 04', 'Original style must be preserved');
});

test('Rule A update clears stale qaStatus and updates Work Center to "-" when absent in new Excel', () => {
  const existing: ManufacturingOrder[] = [
    {
      id: 'old-qa',
      moNumber: 'WH/MO/010',
      style: 'POLO X',
      buyer: 'BUYER A',
      workCenter: 'Old WC',
      productionStage: 'QA',
      targetQty: 1702,
      actualQty: 500,
      qaStatus: 'Old Stale Status',
      batchId: 'old-batch',
    },
  ];

  const incoming: ManufacturingOrder[] = [
    {
      id: 'new-qa',
      moNumber: 'WH/MO/010',
      style: 'POLO X',
      buyer: 'BUYER A',
      workCenter: '-',
      productionStage: 'QA',
      targetQty: 1702,
      actualQty: 1702,
      qaStatus: undefined,
      batchId: 'new-batch',
    },
  ];

  const res = analyzeAndExecuteUpsert(existing, incoming, 'new-batch');
  assert.equal(res.updatedMOCount, 1);
  assert.equal(res.resultingOrders[0].actualQty, 1702);
  assert.equal(res.resultingOrders[0].workCenter, '-');
  assert.equal(res.resultingOrders[0].qaStatus, undefined);
});
