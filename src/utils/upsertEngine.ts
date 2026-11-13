import {
  ManufacturingOrder,
  UpsertAnalysisResult,
  MOAnalysisItem,
  StageDiff,
  STANDARD_PRODUCTION_STAGES,
} from '../types/ppic';

/**
 * Normalizes an MO number string for robust comparison.
 */
function normalizeKey(str?: string): string {
  return (str || '').trim().toLowerCase();
}

/**
 * Analyzes and performs an UPSERT (Update or Insert) between the current active orders
 * and incoming Excel normalized orders, strictly guided by the WH/MO Display Name.
 *
 * Rules:
 * A. WH/MO SAMA + STYLE SAMA -> Update existing data per stage (no summing, latest actual values).
 * B. WH/MO BERBEDA + STYLE SAMA -> Treat as distinct new MO order (separate entities).
 * C. WH/MO SAMA + STYLE BERBEDA -> Identity conflict (flagged, do not automatically overwrite).
 */
export function analyzeAndExecuteUpsert(
  existingOrders: ManufacturingOrder[],
  incomingOrders: ManufacturingOrder[],
  newBatchId: string
): UpsertAnalysisResult {
  // 1. Group existing orders by MO Number
  const existingMOMap = new Map<string, ManufacturingOrder[]>();
  const existingStyles = new Set<string>();

  for (const order of existingOrders) {
    const moKey = normalizeKey(order.moNumber);
    if (!moKey) continue;
    if (!existingMOMap.has(moKey)) {
      existingMOMap.set(moKey, []);
    }
    existingMOMap.get(moKey)!.push(order);
    if (order.style) {
      existingStyles.add(normalizeKey(order.style));
    }
  }

  // 2. Group incoming orders by MO Number
  const incomingMOMap = new Map<string, ManufacturingOrder[]>();
  for (const order of incomingOrders) {
    const moKey = normalizeKey(order.moNumber);
    if (!moKey) continue;
    if (!incomingMOMap.has(moKey)) {
      incomingMOMap.set(moKey, []);
    }
    incomingMOMap.get(moKey)!.push(order);
  }

  const items: MOAnalysisItem[] = [];
  const conflicts: MOAnalysisItem[] = [];
  let updatedStagesCount = 0;
  let unchangedRowsCount = 0;

  // Track resulting orders to be persisted
  const resultingOrdersByMO = new Map<string, ManufacturingOrder[]>();

  // Copy existing orders into result map first
  for (const [moKey, orders] of existingMOMap.entries()) {
    resultingOrdersByMO.set(moKey, [...orders]);
  }

  const incomingNewStyles = new Set<string>();

  // 3. Process each incoming MO group
  for (const [incomingKey, incOrders] of incomingMOMap.entries()) {
    const firstInc = incOrders[0] || {};
    const incMONumber = firstInc.moNumber || incomingKey;
    const incStyle = firstInc.style || '';
    const incCustomer = firstInc.buyer || '';

    if (incStyle && !existingStyles.has(normalizeKey(incStyle))) {
      incomingNewStyles.add(normalizeKey(incStyle));
    }

    const existingGroup = existingMOMap.get(incomingKey);

    if (!existingGroup || existingGroup.length === 0) {
      // -------------------------------------------------------------
      // RULE B: WH/MO BERBEDA (Belum pernah ada) -> Insert as New MO
      // (Even if Style is already used by another MO, this is a separate MO)
      // -------------------------------------------------------------
      const stageDiffs: StageDiff[] = incOrders.map((ord) => ({
        stageName: ord.productionStage,
        workCenter: ord.workCenter,
        newActualQty: ord.actualQty,
        newTargetQty: ord.targetQty,
        isNew: true,
        isUpdated: false,
        isUnchanged: false,
      }));

      const newOrdersWithBatch = incOrders.map((ord, idx) => ({
        ...ord,
        id: `${newBatchId}-${incomingKey}-${idx + 1}`,
        batchId: newBatchId,
      }));

      resultingOrdersByMO.set(incomingKey, newOrdersWithBatch);

      items.push({
        moNumber: incMONumber,
        style: incStyle,
        customer: incCustomer,
        action: 'insert',
        stageDiffs,
        incomingOrderCount: incOrders.length,
        existingOrderCount: 0,
      });
    } else {
      // Existing MO found! Check Style match
      const firstExisting = existingGroup[0] || {};
      const existingStyle = firstExisting.style || '';

      const styleMatches = normalizeKey(existingStyle) === normalizeKey(incStyle);

      if (!styleMatches) {
        // -------------------------------------------------------------
        // RULE C: WH/MO SAMA + STYLE BERBEDA -> Identity Conflict!
        // -------------------------------------------------------------
        const conflictItem: MOAnalysisItem = {
          moNumber: incMONumber,
          style: incStyle,
          customer: incCustomer,
          action: 'conflict',
          existingStyle: existingStyle,
          conflictReason: `Konflik Identitas: Nomor MO "${incMONumber}" di sistem memiliki Style "${existingStyle}", namun file Excel menggunakan Style "${incStyle}". Data lama dipertahankan untuk mencegah kerusakan relasi.`,
          stageDiffs: [],
          incomingOrderCount: incOrders.length,
          existingOrderCount: existingGroup.length,
        };

        conflicts.push(conflictItem);
        items.push(conflictItem);
        // Do NOT overwrite existing MO automatically!
      } else {
        // -------------------------------------------------------------
        // RULE A: WH/MO SAMA + STYLE SAMA -> Update Existing MO Data!
        // -------------------------------------------------------------
        const stageDiffs: StageDiff[] = [];
        let moHadAnyUpdate = false;

        // Clone current existing stages
        const updatedMOStages: ManufacturingOrder[] = [...existingGroup];

        for (const incOrd of incOrders) {
          // Find matching stage in existing orders
          const matchIdx = updatedMOStages.findIndex(
            (ex) =>
              normalizeKey(ex.productionStage) === normalizeKey(incOrd.productionStage) &&
              (normalizeKey(ex.workCenter) === normalizeKey(incOrd.workCenter) ||
                updatedMOStages.filter(
                  (s) => normalizeKey(s.productionStage) === normalizeKey(incOrd.productionStage)
                ).length === 1)
          );

          if (matchIdx !== -1) {
            const exOrd = updatedMOStages[matchIdx];

            const qtyChanged =
              exOrd.actualQty !== incOrd.actualQty ||
              exOrd.targetQty !== incOrd.targetQty ||
              exOrd.remainingQty !== incOrd.remainingQty ||
              exOrd.repairQty !== incOrd.repairQty ||
              exOrd.reworkQty !== incOrd.reworkQty ||
              exOrd.sewingCondition !== incOrd.sewingCondition ||
              exOrd.qaStatus !== incOrd.qaStatus ||
              exOrd.workCenter !== incOrd.workCenter;

            if (qtyChanged) {
              moHadAnyUpdate = true;
              updatedStagesCount++;

              stageDiffs.push({
                stageName: incOrd.productionStage,
                workCenter: incOrd.workCenter,
                oldActualQty: exOrd.actualQty,
                newActualQty: incOrd.actualQty,
                oldTargetQty: exOrd.targetQty,
                newTargetQty: incOrd.targetQty,
                isNew: false,
                isUpdated: true,
                isUnchanged: false,
              });

              // Replace with latest Excel values without summing
              updatedMOStages[matchIdx] = {
                ...exOrd,
                targetQty: incOrd.targetQty,
                actualQty: incOrd.actualQty,
                originalQty: incOrd.originalQty ?? exOrd.originalQty,
                quantity: incOrd.quantity ?? exOrd.quantity,
                remainingQty:
                  incOrd.remainingQty !== undefined
                    ? incOrd.remainingQty
                    : Math.max(0, incOrd.targetQty - incOrd.actualQty),
                repairQty: incOrd.repairQty ?? exOrd.repairQty,
                reworkQty: incOrd.reworkQty ?? exOrd.reworkQty,
                sewingCondition: incOrd.sewingCondition ?? exOrd.sewingCondition,
                qaStatus: incOrd.qaStatus ?? exOrd.qaStatus,
                routing: incOrd.routing || exOrd.routing,
                buyer: incOrd.buyer || exOrd.buyer,
                workCenter: incOrd.workCenter || exOrd.workCenter,
                line: incOrd.line || exOrd.line,
                notes: incOrd.notes || exOrd.notes,
                batchId: newBatchId, // Record latest batch update
              };
            } else {
              unchangedRowsCount++;
              stageDiffs.push({
                stageName: incOrd.productionStage,
                workCenter: incOrd.workCenter,
                oldActualQty: exOrd.actualQty,
                newActualQty: incOrd.actualQty,
                oldTargetQty: exOrd.targetQty,
                newTargetQty: incOrd.targetQty,
                isNew: false,
                isUpdated: false,
                isUnchanged: true,
              });
            }
          } else {
            // New stage in incoming file for this MO
            moHadAnyUpdate = true;
            updatedStagesCount++;

            stageDiffs.push({
              stageName: incOrd.productionStage,
              workCenter: incOrd.workCenter,
              newActualQty: incOrd.actualQty,
              newTargetQty: incOrd.targetQty,
              isNew: true,
              isUpdated: false,
              isUnchanged: false,
            });

            updatedMOStages.push({
              ...incOrd,
              id: `${newBatchId}-${incomingKey}-stage-${updatedMOStages.length + 1}`,
              batchId: newBatchId,
            });
          }
        }

        // Sort stages by standard production stages sequence
        updatedMOStages.sort((a, b) => {
          const idxA = STANDARD_PRODUCTION_STAGES.indexOf(
            a.productionStage as (typeof STANDARD_PRODUCTION_STAGES)[number]
          );
          const idxB = STANDARD_PRODUCTION_STAGES.indexOf(
            b.productionStage as (typeof STANDARD_PRODUCTION_STAGES)[number]
          );
          const sortA = idxA !== -1 ? idxA : 999;
          const sortB = idxB !== -1 ? idxB : 999;
          return sortA - sortB;
        });

        resultingOrdersByMO.set(incomingKey, updatedMOStages);

        items.push({
          moNumber: incMONumber,
          style: incStyle,
          customer: incCustomer || firstExisting.buyer,
          action: moHadAnyUpdate ? 'update' : 'unchanged',
          stageDiffs,
          incomingOrderCount: incOrders.length,
          existingOrderCount: existingGroup.length,
        });
      }
    }
  }

  // 4. Flatten resulting orders
  const resultingOrders: ManufacturingOrder[] = [];
  for (const orders of resultingOrdersByMO.values()) {
    resultingOrders.push(...orders);
  }

  const newMOCount = items.filter((i) => i.action === 'insert').length;
  const updatedMOCount = items.filter((i) => i.action === 'update').length;
  const unchangedMOCount = items.filter((i) => i.action === 'unchanged').length;

  return {
    newMOCount,
    updatedMOCount,
    newStyleCount: incomingNewStyles.size,
    updatedStagesCount,
    unchangedRowsCount,
    conflictCount: conflicts.length,
    items,
    conflicts,
    resultingOrders,
  };
}
