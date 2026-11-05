/**
 * Pure Clinical Specialty Scoring
 */

/** hospitals.specialties may be text[], JSON array, or a single free-text string */
export function normalizeSpecialtyList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean);
  }
  const raw = String(input).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  // Keep full blob so "… Orthopedics …".includes("ORTHOPEDICS") works,
  // plus comma/semicolon tokens when present.
  const parts = raw.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [raw];
}

export function evaluateSpecialties(hospitalSpecialties = [], specialtyRequirements = []) {
  if (!specialtyRequirements || specialtyRequirements.length === 0) {
    return {
      score: 1.0,
      passedMandatory: true,
      missingSpecialties: []
    };
  }

  const normalizedHospitalSpecialties = new Set(
    normalizeSpecialtyList(hospitalSpecialties).map((s) => String(s).trim().toUpperCase())
  );

  const missingSpecialties = [];
  let matches = 0;

  for (const req of specialtyRequirements) {
    const requiredSpecialty = String(req.value).trim().toUpperCase();
    const isMandatory = req.mandatory !== false;

    const found = Array.from(normalizedHospitalSpecialties).some(
      (hs) =>
        hs === requiredSpecialty ||
        hs.includes(requiredSpecialty) ||
        requiredSpecialty.includes(hs)
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
