import {
  ManufacturingOrder,
  StyleSummary,
  WorkCenterSummary,
  ProductionStageSummary,
  QARecord,
  FilterState,
  DeliverySchedule,
  ProductionSchedule,
} from '../types/ppic';

/**
 * Filter orders based on active filter criteria.
 * Search matches against MO Number, Style, Work Center, Stage, Buyer, and Notes.
 */
export function filterOrders(
  orders: ManufacturingOrder[],
  filters: FilterState
): ManufacturingOrder[] {
  const searchTerm = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    // 1. Text Search
    if (searchTerm) {
      const matchMO = order.moNumber?.toLowerCase().includes(searchTerm);
      const matchStyle = order.style?.toLowerCase().includes(searchTerm);
      const matchWC = order.workCenter?.toLowerCase().includes(searchTerm);
      const matchStage = order.productionStage?.toLowerCase().includes(searchTerm);
      const matchBuyer = order.buyer?.toLowerCase().includes(searchTerm);
      const matchNotes = order.notes?.toLowerCase().includes(searchTerm);

      if (!matchMO && !matchStyle && !matchWC && !matchStage && !matchBuyer && !matchNotes) {
        return false;
      }
    }

    // 2. Work Center Filter
    if (filters.workCenter && order.workCenter !== filters.workCenter) {
      return false;
    }

    // 3. Style Filter
    if (filters.style && order.style !== filters.style) {
      return false;
    }

    // 4. MO Filter
    if (filters.mo && order.moNumber !== filters.mo) {
      return false;
    }

    // 5. Stage Filter
    if (filters.stage && order.productionStage !== filters.stage) {
      return false;
    }

    // 6. QA Status Filter
    if (filters.qaStatus && order.qaStatus !== filters.qaStatus) {
      return false;
    }

    // 7. Date Range Filter (checks startDate or deliveryDate if available)
    if (filters.dateFrom) {
      const orderDate = order.startDate || order.deliveryDate;
      if (orderDate && orderDate < filters.dateFrom) {
        return false;
      }
    }

    if (filters.dateTo) {
      const orderDate = order.endDate || order.deliveryDate;
      if (orderDate && orderDate > filters.dateTo) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Aggregate style metrics without losing associated MO relations.
 */
export function aggregateStyles(orders: ManufacturingOrder[]): StyleSummary[] {
  const styleMap = new Map<string, ManufacturingOrder[]>();

  for (const order of orders) {
    const key = order.style || 'Unknown Style';
    if (!styleMap.has(key)) {
      styleMap.set(key, []);
    }
    styleMap.get(key)!.push(order);
  }

  const result: StyleSummary[] = [];

  for (const [styleName, orderList] of styleMap.entries()) {
    const uniqueMOs = new Set(orderList.map((o) => o.moNumber));
    const workCenters = Array.from(new Set(orderList.map((o) => o.workCenter).filter(Boolean)));
    const stages = Array.from(new Set(orderList.map((o) => o.productionStage).filter(Boolean)));

    const totalTargetQty = orderList.reduce((sum, o) => sum + (Number(o.targetQty) || 0), 0);
    const totalActualQty = orderList.reduce((sum, o) => sum + (Number(o.actualQty) || 0), 0);
    const progressPercent =
      totalTargetQty > 0 ? Math.min(100, Math.round((totalActualQty / totalTargetQty) * 100)) : 0;

    const qaBreakdown: Record<string, number> = {};
    for (const order of orderList) {
      const qa = order.qaStatus || 'Not Inspected';
      qaBreakdown[qa] = (qaBreakdown[qa] || 0) + 1;
    }

    let status: StyleSummary['status'] = 'Pending';
    if (totalTargetQty > 0 && totalActualQty >= totalTargetQty) {
      status = 'Completed';
    } else if (totalActualQty > 0 && progressPercent < 40) {
      status = 'Behind';
    } else if (totalActualQty > 0) {
      status = 'In Progress';
    } else {
      status = 'Pending';
    }

    result.push({
      style: styleName,
      moCount: uniqueMOs.size,
      workCenters,
      stages,
      totalTargetQty,
      totalActualQty,
      progressPercent,
      qaBreakdown,
      status,
      orders: orderList,
    });
  }

  // Sort by target quantity descending
  return result.sort((a, b) => b.totalTargetQty - a.totalTargetQty);
}

/**
 * Aggregate metrics by Work Center.
 */
export function aggregateWorkCenters(orders: ManufacturingOrder[]): WorkCenterSummary[] {
  const wcMap = new Map<string, ManufacturingOrder[]>();

  for (const order of orders) {
    const wc = order.workCenter || 'Unassigned';
    if (!wcMap.has(wc)) {
      wcMap.set(wc, []);
    }
    wcMap.get(wc)!.push(order);
  }

  const result: WorkCenterSummary[] = [];

  for (const [name, orderList] of wcMap.entries()) {
    const uniqueMOs = new Set(orderList.map((o) => o.moNumber));
    const uniqueStyles = new Set(orderList.map((o) => o.style));
    const totalTargetQty = orderList.reduce((sum, o) => sum + (Number(o.targetQty) || 0), 0);
    const totalActualQty = orderList.reduce((sum, o) => sum + (Number(o.actualQty) || 0), 0);
    const progressPercent =
      totalTargetQty > 0 ? Math.min(100, Math.round((totalActualQty / totalTargetQty) * 100)) : 0;

    result.push({
      name,
      moCount: uniqueMOs.size,
      styleCount: uniqueStyles.size,
      totalTargetQty,
      totalActualQty,
      progressPercent,
    });
  }

  return result.sort((a, b) => b.totalTargetQty - a.totalTargetQty);
}

/**
 * Aggregate metrics by Production Stage and identify bottlenecks.
 */
export function aggregateProductionStages(orders: ManufacturingOrder[]): ProductionStageSummary[] {
  const stageMap = new Map<string, ManufacturingOrder[]>();

  for (const order of orders) {
    const stage = order.productionStage || 'Unassigned';
    if (!stageMap.has(stage)) {
      stageMap.set(stage, []);
    }
    stageMap.get(stage)!.push(order);
  }

  const rawList: ProductionStageSummary[] = [];

  for (const [stageName, orderList] of stageMap.entries()) {
    const workCenters = Array.from(new Set(orderList.map((o) => o.workCenter).filter(Boolean)));
    const uniqueMOs = new Set(orderList.map((o) => o.moNumber));
    const uniqueStyles = new Set(orderList.map((o) => o.style));

    const targetQty = orderList.reduce((sum, o) => sum + (Number(o.targetQty) || 0), 0);
    const actualQty = orderList.reduce((sum, o) => sum + (Number(o.actualQty) || 0), 0);
    const completionRate =
      targetQty > 0 ? Math.min(100, Math.round((actualQty / targetQty) * 100)) : 0;

    rawList.push({
      stageName,
      workCenters,
      moCount: uniqueMOs.size,
      styleCount: uniqueStyles.size,
      targetQty,
      actualQty,
      completionRate,
      isBottleneck: false,
    });
  }

  // Determine bottleneck: find the stage with the highest unfinished backlog (targetQty - actualQty)
  let maxBacklog = -1;
  let bottleneckIndex = -1;

  rawList.forEach((stage, idx) => {
    const backlog = stage.targetQty - stage.actualQty;
    if (backlog > maxBacklog && backlog > 0) {
      maxBacklog = backlog;
      bottleneckIndex = idx;
    }
  });

  if (bottleneckIndex !== -1) {
    rawList[bottleneckIndex].isBottleneck = true;
  }

  return rawList.sort((a, b) => b.targetQty - a.targetQty);
}

/**
 * QA status color map conforming to enterprise palette and accessibility standards.
 */
const QA_COLORS: Record<string, string> = {
  Passed: '#16a34a',     // Green
  Approved: '#16a34a',
  'In-Inspection': '#0284c7', // Sky Blue
  Checking: '#0284c7',
  Rework: '#d97706',     // Amber
  Repair: '#d97706',
  Rejected: '#dc2626',   // Crimson
  Scrap: '#dc2626',
  Pending: '#64748b',    // Slate
  'Not Inspected': '#94a3b8',
};

/**
 * Aggregate QA Status with percentage calculations.
 */
export function aggregateQAStatus(orders: ManufacturingOrder[]): QARecord[] {
  if (orders.length === 0) return [];

  const counts: Record<string, number> = {};
  let totalWithQA = 0;

  for (const order of orders) {
    const qa = order.qaStatus?.trim();
    if (qa) {
      counts[qa] = (counts[qa] || 0) + 1;
      totalWithQA++;
    }
  }

  if (totalWithQA === 0) return [];

  const result: QARecord[] = Object.entries(counts).map(([statusName, count]) => {
    const percentage = Math.round((count / totalWithQA) * 100);
    const color = QA_COLORS[statusName] || '#64748b';
    return {
      statusName,
      count,
      percentage,
      color,
    };
  });

  return result.sort((a, b) => b.count - a.count);
}

/**
 * Calculate dynamic KPIs for Dashboard cards.
 */
export function calculateKPIs(
  orders: ManufacturingOrder[],
  schedules: ProductionSchedule[] = [],
  deliveries: DeliverySchedule[] = []
) {
  const uniqueMOs = new Set(orders.map((o) => o.moNumber));
  const uniqueStyles = new Set(orders.map((o) => o.style));
  const uniqueWorkCenters = new Set(orders.map((o) => o.workCenter).filter(Boolean));

  const totalTargetQty = orders.reduce((sum, o) => sum + (Number(o.targetQty) || 0), 0);
  const totalActualQty = orders.reduce((sum, o) => sum + (Number(o.actualQty) || 0), 0);
  const progressPercent =
    totalTargetQty > 0 ? Math.min(100, Math.round((totalActualQty / totalTargetQty) * 100)) : 0;

  const scheduledMONumbers = new Set(schedules.map((s) => s.moNumber));
  const scheduledCount = Array.from(uniqueMOs).filter((mo) => scheduledMONumbers.has(mo)).length;
  const unscheduledCount = uniqueMOs.size - scheduledCount;

  const totalDeliveredQty = deliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  return {
    totalMO: uniqueMOs.size,
    totalStyle: uniqueStyles.size,
    totalWorkCenters: uniqueWorkCenters.size,
    totalTargetQty,
    totalActualQty,
    progressPercent,
    scheduledCount,
    unscheduledCount,
    totalDeliveredQty,
    totalDeliveries: deliveries.length,
  };
}

/**
 * Multiple Delivery summary for a specific MO.
 */
export function calculateDeliverySummary(
  moNumber: string,
  targetQty: number,
  deliveries: DeliverySchedule[]
) {
  const moDeliveries = deliveries.filter((d) => d.moNumber === moNumber);
  const totalScheduledDeliveryQty = moDeliveries.reduce(
    (sum, d) => sum + (Number(d.quantity) || 0),
    0
  );
  const remainingQty = Math.max(0, targetQty - totalScheduledDeliveryQty);

  let status: 'Fully Scheduled' | 'Partially Scheduled' | 'Over Scheduled' | 'Not Scheduled' =
    'Not Scheduled';

  if (moDeliveries.length === 0) {
    status = 'Not Scheduled';
  } else if (totalScheduledDeliveryQty === targetQty) {
    status = 'Fully Scheduled';
  } else if (totalScheduledDeliveryQty > targetQty) {
    status = 'Over Scheduled';
  } else {
    status = 'Partially Scheduled';
  }

  return {
    deliveries: moDeliveries.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate)),
    totalScheduledDeliveryQty,
    remainingQty,
    deliveryCount: moDeliveries.length,
    status,
  };
}
