/**
 * Score how well a hospital's accepted insurers overlap with the patient's policies.
 * Soft signal (not a hard filter) so uninsured / cash patients still get matches.
 */
export function evaluateInsurance(hospitalAcceptedInsurerIds = [], patientInsurerIds = []) {
  const accepted = new Set((hospitalAcceptedInsurerIds || []).map(String));
  const patient = [...new Set((patientInsurerIds || []).map(String))];

  if (patient.length === 0) {
    return {
      score: 0.55,
      matched: [],
      coverage: 'NONE_DECLARED',
      detail: 'No insurance on file — cash / self-pay assumed',
    };
  }

  if (accepted.size === 0) {
    return {
      score: 0.35,
      matched: [],
      coverage: 'HOSPITAL_UNKNOWN',
      detail: 'Hospital insurance network not listed',
    };
  }

  const matched = patient.filter((id) => accepted.has(id));
  if (matched.length === 0) {
    return {
      score: 0.2,
      matched: [],
      coverage: 'NO_OVERLAP',
      detail: 'Patient insurers not empanelled here',
    };
  }

  const ratio = matched.length / patient.length;
  const score = Math.min(1, 0.7 + ratio * 0.3);
  return {
    score: Number(score.toFixed(4)),
    matched,
    coverage: 'COVERED',
    detail: `${matched.length}/${patient.length} insurer(s) accepted (cashless likely)`,
  };
}
