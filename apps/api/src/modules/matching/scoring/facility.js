/**
 * Pure Hospital Facility & Infrastructure Scoring
 */
export function evaluateFacilities(hospitalFacilities = [], facilityRequirements = []) {
  if (!facilityRequirements || facilityRequirements.length === 0) {
    return {
      score: 1.0,
      passedMandatory: true,
      missingFacilities: []
    };
  }

  const normalizedFacilities = new Set(
    (hospitalFacilities || []).map(f => String(f).trim().toUpperCase())
  );

  const missingFacilities = [];
  let matches = 0;

  for (const req of facilityRequirements) {
    const requiredFacility = String(req.value).trim().toUpperCase();
    const isMandatory = req.mandatory !== false;

    const found = Array.from(normalizedFacilities).some(
      hf => hf === requiredFacility || hf.includes(requiredFacility) || requiredFacility.includes(hf)
    );

    if (found) {
      matches += 1;
    } else if (isMandatory) {
      missingFacilities.push(`Missing mandatory facility: ${req.value}`);
    }
  }

  const score = facilityRequirements.length > 0 ? matches / facilityRequirements.length : 1.0;

  return {
    score: Number(score.toFixed(4)),
    passedMandatory: missingFacilities.length === 0,
    missingFacilities
  };
}

