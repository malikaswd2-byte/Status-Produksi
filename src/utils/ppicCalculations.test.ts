import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateStyles,
  aggregateWorkCenters,
  aggregateProductionStages,
  aggregateQAStatus,
  calculateKPIs,
  filterOrders,
  calculateDeliverySummary,
} from './ppicCalculations';
import { ManufacturingOrder, DeliverySchedule, ProductionSchedule } from '../types/ppic';

const mockOrders: ManufacturingOrder[] = [
  {
    id: 'ord-1',
    moNumber: 'MO-2026-001',
    style: 'Classic Polo',
    workCenter: 'Sewing Line 1',
    productionStage: 'Sewing',
    targetQty: 500,
    actualQty: 450,
    qaStatus: 'Passed',
    batchId: 'batch-1',
  },
  {
    id: 'ord-2',
    moNumber: 'MO-2026-001',
    style: 'Classic Polo',
    workCenter: 'Cutting Section',
    productionStage: 'Cutting',
    targetQty: 500,
    actualQty: 500,
    qaStatus: 'Passed',
    batchId: 'batch-1',
  },
  {
    id: 'ord-3',
    moNumber: 'MO-2026-002',
    style: 'Oxford Shirt',
    workCenter: 'Sewing Line 2',
    productionStage: 'Sewing',
    targetQty: 300,
    actualQty: 100,
    qaStatus: 'In-Inspection',
    batchId: 'batch-1',
  },
  {
    id: 'ord-4',
    moNumber: 'MO-2026-003',
    style: 'Chino Pants',
    workCenter: 'Ironning Station 1',
    productionStage: 'Ironning',
    targetQty: 400,
    actualQty: 0,
    sewingCondition: 'Normal',
    batchId: 'batch-1',
  },
  {
    id: 'ord-5',
    moNumber: 'MO-2026-004',
    style: 'Heavy Hoodie',
    workCenter: 'Sewing Line 3',
    productionStage: 'Sewing',
    targetQty: 800,
    actualQty: 400,
    sewingCondition: 'Rework',
    reworkQty: 30,
    batchId: 'batch-1',
  },
  {
    id: 'ord-6',
    moNumber: 'MO-2026-005',
    style: 'Windbreaker',
    workCenter: 'Sewing Line 4',
    productionStage: 'Sewing',
    targetQty: 600,
    actualQty: 200,
    sewingCondition: 'Repair',
    repairQty: 15,
    batchId: 'batch-1',
  },
];

test('calculateKPIs computes correct unique counts and totals', () => {
  const kpis = calculateKPIs(mockOrders);
  assert.equal(kpis.totalMO, 5, 'Should have 5 unique MO numbers');
  assert.equal(kpis.totalStyle, 5, 'Should have 5 unique styles');
  assert.equal(kpis.totalTargetQty, 3100, 'Total target is 500+500+300+400+800+600');
  assert.equal(kpis.totalActualQty, 1650, 'Total actual is 450+500+100+0+400+200');
});

test('aggregateStyles groups correctly without losing MO relations', () => {
  const styles = aggregateStyles(mockOrders);
  assert.equal(styles.length, 5);
  const polo = styles.find((s) => s.style === 'Classic Polo');
  assert.ok(polo);
  assert.equal(polo?.moCount, 1);
  assert.equal(polo?.totalTargetQty, 1000);
  assert.equal(polo?.totalActualQty, 950);
  assert.equal(polo?.workCenters.length, 2);
  assert.equal(polo?.orders.length, 2);
});

test('aggregateWorkCenters correctly groups data and calculates progress', () => {
  const wcs = aggregateWorkCenters(mockOrders);
  const cutting = wcs.find((w) => w.name === 'Cutting Section');
  assert.ok(cutting);
  assert.equal(cutting?.totalTargetQty, 500);
  assert.equal(cutting?.totalActualQty, 500);
  assert.equal(cutting?.progressPercent, 100);
});

test('aggregateProductionStages orders all 7 standard stages and tracks Sewing repair/rework', () => {
  const stages = aggregateProductionStages(mockOrders);
  // Stages that exist in mock data should be ordered according to STANDARD_PRODUCTION_STAGES:
  // Cutting (index 0), Sewing (index 1), Ironning (index 3)
  const cutting = stages.find((s) => s.stageName === 'Cutting');
  const sewing = stages.find((s) => s.stageName === 'Sewing');
  const ironning = stages.find((s) => s.stageName === 'Ironning');

  assert.ok(cutting);
  assert.ok(sewing);
  assert.ok(ironning);

  assert.ok(cutting.stageIndex < sewing.stageIndex, 'Cutting must precede Sewing');
  assert.ok(sewing.stageIndex < ironning.stageIndex, 'Sewing must precede Ironning');

  // Verify Sewing Repair & Rework tracking
  assert.equal(sewing.repairCount, 1, 'Sewing should have 1 MO in repair');
  assert.equal(sewing.reworkCount, 1, 'Sewing should have 1 MO in rework');
  assert.equal(sewing.repairQty, 15, 'Sewing repair qty should be 15');
  assert.equal(sewing.reworkQty, 30, 'Sewing rework qty should be 30');

  // Verify bottleneck is sewing (target 2200, actual 1150 -> 1050 backlog)
  assert.equal(sewing.isBottleneck, true);
});

test('aggregateQAStatus calculates correct distribution without repair or rework', () => {
  const qa = aggregateQAStatus(mockOrders);
  const hasRepairOrRework = qa.some((q) => /repair|rework/i.test(q.statusName));
  assert.equal(hasRepairOrRework, false, 'QA status must NEVER contain Repair or Rework');

  const passed = qa.find((q) => q.statusName === 'Passed');
  assert.ok(passed);
  assert.equal(passed?.count, 2);
});

test('filterOrders filters accurately by text and category', () => {
  const filtered = filterOrders(mockOrders, {
    search: 'Oxford',
    workCenter: '',
    style: '',
    mo: '',
    stage: '',
    qaStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].moNumber, 'MO-2026-002');
});

test('calculateDeliverySummary handles multiple deliveries per MO correctly', () => {
  const deliveries: DeliverySchedule[] = [
    {
      id: 'del-1',
      moNumber: 'MO-2026-001',
      style: 'Classic Polo',
      deliveryDate: '2026-11-10',
      quantity: 100,
      status: 'Planned',
      createdAt: '2026-11-01',
    },
    {
      id: 'del-2',
      moNumber: 'MO-2026-001',
      style: 'Classic Polo',
      deliveryDate: '2026-11-15',
      quantity: 150,
      status: 'Planned',
      createdAt: '2026-11-01',
    },
    {
      id: 'del-3',
      moNumber: 'MO-2026-001',
      style: 'Classic Polo',
      deliveryDate: '2026-11-20',
      quantity: 200,
      status: 'Planned',
      createdAt: '2026-11-01',
    },
  ];

  const summary = calculateDeliverySummary('MO-2026-001', 500, deliveries);
  assert.equal(summary.deliveryCount, 3);
  assert.equal(summary.totalScheduledDeliveryQty, 450);
  assert.equal(summary.remainingQty, 50);
  assert.equal(summary.status, 'Partially Scheduled');
});
