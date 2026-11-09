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
    workCenter: 'Finishing Line',
    productionStage: 'Finishing',
    targetQty: 400,
    actualQty: 0,
    qaStatus: 'Pending',
    batchId: 'batch-1',
  },
];

test('calculateKPIs computes correct unique counts and totals', () => {
  const kpis = calculateKPIs(mockOrders);
  assert.equal(kpis.totalMO, 3, 'Should have 3 unique MO numbers');
  assert.equal(kpis.totalStyle, 3, 'Should have 3 unique styles');
  assert.equal(kpis.totalWorkCenters, 4, 'Should have 4 unique work centers');
  assert.equal(kpis.totalTargetQty, 1700, 'Total target is 500+500+300+400');
  assert.equal(kpis.totalActualQty, 1050, 'Total actual is 450+500+100+0');
  assert.equal(kpis.progressPercent, 62, '1050 / 1700 is ~62%');
});

test('aggregateStyles groups correctly without losing MO relations', () => {
  const styles = aggregateStyles(mockOrders);
  assert.equal(styles.length, 3);
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

test('aggregateProductionStages identifies stage with largest backlog', () => {
  const stages = aggregateProductionStages(mockOrders);
  assert.ok(stages.length >= 3);
  // Finishing has 400 target and 0 actual -> 400 backlog (highest backlog)
  const finishing = stages.find((s) => s.stageName === 'Finishing');
  assert.ok(finishing);
  assert.equal(finishing?.isBottleneck, true);
});

test('aggregateQAStatus calculates correct distribution and percentages', () => {
  const qa = aggregateQAStatus(mockOrders);
  const passed = qa.find((q) => q.statusName === 'Passed');
  assert.ok(passed);
  assert.equal(passed?.count, 2);
  assert.equal(passed?.percentage, 50); // 2 out of 4 is 50%
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
