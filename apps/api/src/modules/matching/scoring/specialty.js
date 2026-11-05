/**
 * Pure Clinical Specialty Scoring
 */
export function evaluateSpecialties(hospitalSpecialties = [], specialtyRequirements = []) {
  if (!specialtyRequirements || specialtyRequirements.length === 0) {
    return {
      score: 1.0,
      passedMandatory: true,
      missingSpecialties: []
    };
  }

  const normalizedHospitalSpecialties = new Set(
    (hospitalSpecialties || []).map(s => String(s).trim().toUpperCase())
  );

  const missingSpecialties = [];
  let matches = 0;

  for (const req of specialtyRequirements) {
    const requiredSpecialty = String(req.value).trim().toUpperCase();
    const isMandatory = req.mandatory !== false;

    // Check exact or partial match (e.g. "Neurology" matches "Neurosurgery" or "Neurology")
    const found = Array.from(normalizedHospitalSpecialties).some(
      hs => hs === requiredSpecialty || hs.includes(requiredSpecialty) || requiredSpecialty.includes(hs)
    );

    if (found) {
      matches += 1;
    } else if (isMandatory) {
      missingSpecialties.push(`Missing mandatory specialty: ${req.value}`);
    }
  }

  const score = specialtyRequirements.length > 0 ? matches / specialtyRequirements.length : 1.0;

  return {
    score: Number(score.toFixed(4)),
    passedMandatory: missingSpecialties.length === 0,
    missingSpecialties
  };
}

