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
  groupOrdersByMO,
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
    workCenter: 'Cutting Line 1',
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
  const cutting = wcs.find((w) => w.name === 'Cutting Line 1');
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

test('groupOrdersByMO groups orders by MO with merged Customer, Style and ordered stages', () => {
  const multiStageOrders: ManufacturingOrder[] = [
    {
      id: 'stg-1',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Cutting',
      productionStage: 'Cutting',
      targetQty: 1200,
      actualQty: 1200,
      batchId: 'b-1',
    },
    {
      id: 'stg-2',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Sewing Line 1',
      productionStage: 'Sewing',
      targetQty: 1200,
      actualQty: 950,
      batchId: 'b-1',
    },
    {
      id: 'stg-3',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Area Penerimaan Ironning',
      productionStage: 'Penerimaan Ironning',
      targetQty: 1200,
      actualQty: 850,
      batchId: 'b-1',
    },
    {
      id: 'stg-4',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Ironning Station 01',
      productionStage: 'Ironning',
      targetQty: 1200,
      actualQty: 720,
      batchId: 'b-1',
    },
    {
      id: 'stg-5',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'QC Finishing Line',
      productionStage: 'QC Finishing',
      targetQty: 1200,
      actualQty: 600,
      batchId: 'b-1',
    },
    {
      id: 'stg-6',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'QC Ukur Station',
      productionStage: 'QC Ukur',
      targetQty: 1200,
      actualQty: 600,
      batchId: 'b-1',
    },
    {
      id: 'stg-7',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'QA',
      productionStage: 'QA',
      targetQty: 1200,
      actualQty: 600,
      batchId: 'b-1',
    },
    {
      id: 'stg-8',
      moNumber: 'WH/MO/23170',
      style: 'UNSI HOODIE FLEECE 02',
      buyer: 'PT GLOBAL GARMINDO UTAMA',
      workCenter: 'Cutting Line 2',
      productionStage: 'Cutting',
      targetQty: 2000,
      actualQty: 2000,
      batchId: 'b-1',
    },
  ];

  const groups = groupOrdersByMO(multiStageOrders);
  assert.equal(groups.length, 2, 'Should create 2 MO groups');

  const mo23169 = groups.find((g) => g.moNumber === 'WH/MO/23169');
  assert.ok(mo23169, 'WH/MO/23169 group should exist');
  assert.equal(mo23169?.customer, 'YAYASAN ENAM PEDULI PENDIDIKAN');
  assert.equal(mo23169?.style, 'UNSI JSU MHS 01');
  assert.equal(mo23169?.stageCount, 7, 'WH/MO/23169 should have 7 stages');
  assert.equal(mo23169?.stages[0].productionStage, 'Cutting');
  assert.equal(mo23169?.stages[1].productionStage, 'Sewing');
  assert.equal(mo23169?.stages[2].productionStage, 'Penerimaan Ironning');
  assert.equal(mo23169?.stages[3].productionStage, 'Ironning');
  assert.equal(mo23169?.stages[4].productionStage, 'QC Finishing');
  assert.equal(mo23169?.stages[5].productionStage, 'QC Ukur');
  assert.equal(mo23169?.stages[6].productionStage, 'QA');
});

test('filterOrders search keeps all 7 stages together when searching MO, Customer, Style, or Work Center', () => {
  const multiStageOrders: ManufacturingOrder[] = [
    {
      id: 's1',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Cutting',
      productionStage: 'Cutting',
      targetQty: 1200,
      actualQty: 1200,
      batchId: 'b-1',
    },
    {
      id: 's2',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Sewing Line 1',
      productionStage: 'Sewing',
      targetQty: 1200,
      actualQty: 950,
      batchId: 'b-1',
    },
    {
      id: 's3',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Area Penerimaan Ironning',
      productionStage: 'Penerimaan Ironning',
      targetQty: 1200,
      actualQty: 850,
      batchId: 'b-1',
    },
    {
      id: 's4',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'Ironning Station 01',
      productionStage: 'Ironning',
      targetQty: 1200,
      actualQty: 720,
      batchId: 'b-1',
    },
    {
      id: 's5',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'QC Finishing Line',
      productionStage: 'QC Finishing',
      targetQty: 1200,
      actualQty: 600,
      batchId: 'b-1',
    },
    {
      id: 's6',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'QC Ukur Station',
      productionStage: 'QC Ukur',
      targetQty: 1200,
      actualQty: 600,
      batchId: 'b-1',
    },
    {
      id: 's7',
      moNumber: 'WH/MO/23169',
      style: 'UNSI JSU MHS 01',
      buyer: 'YAYASAN ENAM PEDULI PENDIDIKAN',
      workCenter: 'QA',
      productionStage: 'QA',
      targetQty: 1200,
      actualQty: 600,
      batchId: 'b-1',
    },
    {
      id: 's8',
      moNumber: 'WH/MO/23170',
      style: 'UNSI HOODIE FLEECE 02',
      buyer: 'PT GLOBAL GARMINDO UTAMA',
      workCenter: 'Cutting Line 2',
      productionStage: 'Cutting',
      targetQty: 2000,
      actualQty: 2000,
      batchId: 'b-1',
    },
  ];

  // 1. Search by MO Number
  const resMO = filterOrders(multiStageOrders, {
    search: 'WH/MO/23169',
    workCenter: '',
    style: '',
    mo: '',
    stage: '',
    qaStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  assert.equal(resMO.length, 7, 'Searching for WH/MO/23169 should return all 7 stages');

  // 2. Search by Customer Name
  const resCustomer = filterOrders(multiStageOrders, {
    search: 'YAYASAN ENAM',
    workCenter: '',
    style: '',
    mo: '',
    stage: '',
    qaStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  assert.equal(resCustomer.length, 7, 'Searching for YAYASAN ENAM should return all 7 stages');

  // 3. Search by Style
  const resStyle = filterOrders(multiStageOrders, {
    search: 'UNSI JSU MHS 01',
    workCenter: '',
    style: '',
    mo: '',
    stage: '',
    qaStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  assert.equal(resStyle.length, 7, 'Searching for UNSI JSU MHS 01 should return all 7 stages');

  // 4. Search by Work Center in MO group
  const resWC = filterOrders(multiStageOrders, {
    search: 'Ironning Station 01',
    workCenter: '',
    style: '',
    mo: '',
    stage: '',
    qaStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  assert.equal(resWC.length, 7, 'Searching for a workcenter in WH/MO/23169 should return all 7 stages intact');
});

test('Acceptance Criteria: QA 1702/1702 = 100%, empty Work Center "-" excluded from WC stats, zero synthetic QA status, empty deliveries stay empty', () => {
  const orders: ManufacturingOrder[] = [
    {
      id: 'acc-1',
      moNumber: 'WH/MO/25001',
      style: 'SHIRT A',
      workCenter: '-',
      productionStage: 'QA',
      targetQty: 1702,
      actualQty: 1702,
      remainingQty: 0,
      batchId: 'b-active',
    },
  ];

  const stages = aggregateProductionStages(orders);
  const qaStage = stages.find((s) => s.stageName === 'QA');
  assert.ok(qaStage);
  assert.equal(qaStage.completionRate, 100, 'QA 1702/1702 must yield 100% completionRate');
  assert.equal(qaStage.remainingQty, 0);

  const wcs = aggregateWorkCenters(orders);
  assert.equal(wcs.length, 0, 'Placeholder "-" Work Center must not produce synthetic Work Center entry');

  const kpis = calculateKPIs(orders, [], []);
  assert.equal(kpis.totalWorkCenters, 0);
  assert.equal(kpis.scheduledCount, 0);
  assert.equal(kpis.totalDeliveries, 0);

  const qaRecords = aggregateQAStatus(orders);
  assert.equal(qaRecords.length, 0, 'Must NOT invent QA status when qaStatus is absent');

  const styles = aggregateStyles(orders);
  assert.deepEqual(styles[0].qaBreakdown, {}, 'Style qaBreakdown must NOT invent "Not Inspected"');

  const emptyDeliveries = calculateDeliverySummary('WH/MO/25001', 1702, []);
  assert.equal(emptyDeliveries.deliveryCount, 0);
  assert.equal(emptyDeliveries.deliveries.length, 0);
  assert.equal(emptyDeliveries.remainingQty, 1702);
  assert.equal(emptyDeliveries.status, 'Not Scheduled');
});
