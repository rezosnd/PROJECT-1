/**
 * Pure Bed Availability & Preference Order Scoring
 * Strictly uses derived free beds (total - occupied - reserved - cleaning - maintenance)
 */
export function evaluateBeds(inventory = [], bedRequirements = [], bedsNeeded = 1) {
  // If no specific bed requirement, allow any ward with free beds
  const reqs = (bedRequirements && bedRequirements.length > 0)
    ? [...bedRequirements].sort((a, b) => (a.preference_order ?? a.preferenceOrder ?? 1) - (b.preference_order ?? b.preferenceOrder ?? 1))
    : [{ value: 'GENERAL', preferenceOrder: 1, mandatory: true }];

  const allowedWards = reqs.map(r => r.value.toUpperCase());

  // Find map of inventory by ward type
  const wardMap = new Map();
  for (const item of inventory) {
    const ward = item.ward_type || item.wardType;
    if (ward) {
      const total = Number(item.total || 0);
      const occupied = Number(item.occupied || 0);
      const reserved = Number(item.reserved || 0);
      const cleaning = Number(item.cleaning || 0);
      const maintenance = Number(item.maintenance || 0);
      // Strictly derived free beds
      const free = Math.max(0, total - (occupied + reserved + cleaning + maintenance));
      
      wardMap.set(ward.toUpperCase(), {
        wardType: ward.toUpperCase(),
        total,
        free,
        hasVentilatorBeds: Number(item.has_ventilator_beds || item.hasVentilatorBeds || 0)
      });
    }
  }

  // Iterate over preferences in strict order
  for (let i = 0; i < reqs.length; i++) {
    const req = reqs[i];
    const wardType = req.value.toUpperCase();
    const inv = wardMap.get(wardType);
    const freeCount = inv ? inv.free : 0;

    if (freeCount > 0) {
      const preferenceRank = i + 1;
      // 1st preference gets 1.0 multiplier, 2nd preference gets 0.75, 3rd gets 0.50
      const preferencePenalty = preferenceRank === 1 ? 1.0 : (preferenceRank === 2 ? 0.75 : 0.50);
      const fulfillmentRatio = Math.min(1.0, freeCount / bedsNeeded);
      const score = Number((fulfillmentRatio * preferencePenalty).toFixed(4));

      return {
        score,
        passed: true,
        selectedWard: wardType,
        freeCount,
        preferenceRank,
        allowedWards
      };
    }
  }

  // No beds available in any acceptable ward type
  return {
    score: 0.0,
    passed: false,
    selectedWard: null,
    freeCount: 0,
    preferenceRank: null,
    allowedWards
  };
}

