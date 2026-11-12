/**
 * Score how well a hospital's accepted insurers overlap with the patient's policies.
 * Soft signal (not a hard filter) so uninsured / cash patients still get matches.
 * Optional networkDetails Map: insurerId -> { discountPercent, cashless, benefits }
 */
export function evaluateInsurance(
  hospitalAcceptedInsurerIds = [],
  patientInsurerIds = [],
  networkDetails = null
) {
  const accepted = new Set((hospitalAcceptedInsurerIds || []).map(String));
  const patient = [...new Set((patientInsurerIds || []).map(String))];

  if (patient.length === 0) {
    return {
      score: 0.55,
      matched: [],
      coverage: 'NONE_DECLARED',
      detail: 'No insurance on file — cash / self-pay assumed',
      bestDiscountPercent: 0,
      benefits: [],
      cashless: false,
    };
  }

  if (accepted.size === 0) {
    return {
      score: 0.35,
      matched: [],
      coverage: 'HOSPITAL_UNKNOWN',
      detail: 'Hospital insurance network not listed',
      bestDiscountPercent: 0,
      benefits: [],
      cashless: false,
    };
  }

  const matched = patient.filter((id) => accepted.has(id));
  if (matched.length === 0) {
    return {
      score: 0.2,
      matched: [],
      coverage: 'NO_OVERLAP',
      detail: 'Patient insurers not empanelled here',
      bestDiscountPercent: 0,
      benefits: [],
      cashless: false,
    };
  }

  let bestDiscountPercent = 0;
  let cashless = false;
  const benefits = [];
  if (networkDetails instanceof Map) {
    for (const id of matched) {
      const detail = networkDetails.get(String(id));
      if (!detail) continue;
      const d = Number(detail.discountPercent) || 0;
      if (d > bestDiscountPercent) bestDiscountPercent = d;
      if (detail.cashless) cashless = true;
      if (Array.isArray(detail.benefits)) {
        for (const b of detail.benefits) {
          if (b && !benefits.includes(b)) benefits.push(b);
        }
      }
    }
  }

  const ratio = matched.length / patient.length;
  const discountBoost = Math.min(0.08, (bestDiscountPercent / 100) * 0.08);
  const score = Math.min(1, 0.7 + ratio * 0.3 + discountBoost);
  const discountLabel =
    bestDiscountPercent > 0 ? ` · up to ${bestDiscountPercent}% package benefit` : '';
  return {
    score: Number(score.toFixed(4)),
    matched,
    coverage: 'COVERED',
    detail: `${matched.length}/${patient.length} insurer(s) accepted${cashless ? ' (cashless)' : ''}${discountLabel}`,
    bestDiscountPercent,
    benefits: benefits.slice(0, 8),
    cashless,
  };
}
