/**
 * Pure Equipment Availability & Criticality Scoring
 * Checks live operational availability of required clinical equipment
 */
export function evaluateEquipment(hospitalEquipment = [], equipmentRequirements = []) {
  if (!equipmentRequirements || equipmentRequirements.length === 0) {
    return {
      score: 1.0,
      passedMandatory: true,
      missingMandatory: [],
      details: []
    };
  }

  const inventory = Array.isArray(hospitalEquipment) ? hospitalEquipment : [];
  // No equipment rows seeded → don't hard-exclude (score mid); inventory still unknown
  if (inventory.length === 0) {
    return {
      score: 0.55,
      passedMandatory: true,
      missingMandatory: [],
      details: equipmentRequirements.map((req) => ({
        type: (req.value || '').toUpperCase(),
        required: Number(req.qty || 1),
        available: 0,
        mandatory: req.mandatory !== false,
        fulfilledRatio: 0.55,
        unknownInventory: true
      }))
    };
  }

  const missingMandatory = [];
  const details = [];
  let totalFulfillment = 0;

  for (const req of equipmentRequirements) {
    const eqType = (req.value || '').toUpperCase();
    const requiredQty = Number(req.qty || 1);
    const isMandatory = req.mandatory !== false;

    // Filter available units
    const matching = inventory.filter((e) => {
      const typeMatch = (e.type || '').toUpperCase() === eqType;
      const isAvailable = (e.status || '').toUpperCase() === 'AVAILABLE';
      return typeMatch && isAvailable;
    });

    const availableCount = matching.length;
    const fulfilledRatio = Math.min(1.0, availableCount / requiredQty);
    totalFulfillment += fulfilledRatio;

    details.push({
      type: eqType,
      required: requiredQty,
      available: availableCount,
      mandatory: isMandatory,
      fulfilledRatio
    });

    if (isMandatory && availableCount < requiredQty) {
      missingMandatory.push(
        `Mandatory equipment unavailable: ${eqType} (${availableCount}/${requiredQty} available)`
      );
    }
  }

  const averageFulfillment = equipmentRequirements.length > 0
    ? totalFulfillment / equipmentRequirements.length
    : 1.0;

  const passedMandatory = missingMandatory.length === 0;

  return {
    score: Number(averageFulfillment.toFixed(4)),
    passedMandatory,
    missingMandatory,
    details
  };
}

