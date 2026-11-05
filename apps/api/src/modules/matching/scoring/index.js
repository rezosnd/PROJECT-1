import fs from 'node:fs';
import { evaluateProximity } from './proximity.js';
import { evaluateBeds } from './bed.js';
import { evaluateEquipment } from './equipment.js';
import { evaluateSpecialties } from './specialty.js';
import { evaluateFacilities } from './facility.js';
import { evaluateTrend } from './trend.js';
import { evaluateQuality } from './quality.js';

// Load static weights from config
const weightsPath = new URL('../../../config/weights.json', import.meta.url);
const rawWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));

export const DEFAULT_WEIGHTS = rawWeights.base;
export const HIGH_SEVERITY_WEIGHTS = rawWeights.highSeverity;

/**
 * Pure evaluation function combining hard constraints, multi-criteria scoring, and plain explanation.
 * Strictly zero I/O and zero database calls.
 * 
 * @param {Object} hospital Candidate hospital with live beds, equipment, specialties, facilities
 * @param {Array} requirements Array of clinical requirements (BED, EQUIPMENT, SPECIALTY, FACILITY)
 * @param {Object} options Options including distanceMeters, severity (1-5 or string), netFlowPerHour
 * @returns {Object} { eligible: boolean, reasons?: string[], totalScore?: number, breakdown?: Object, explanation?: string }
 */
export function scoreHospitalCandidate(hospital, requirements = [], options = {}) {
  const {
    distanceMeters = 0,
    severity = 'NORMAL',
    netFlowPerHour = 0,
    bedsNeeded = 1
  } = options;

  // 1. Partition requirements by kind
  const bedReqs = [];
  const equipmentReqs = [];
  const specialtyReqs = [];
  const facilityReqs = [];

  for (const r of (requirements || [])) {
    const kind = (r.kind || '').toUpperCase();
    if (kind === 'BED') bedReqs.push(r);
    else if (kind === 'EQUIPMENT') equipmentReqs.push(r);
    else if (kind === 'SPECIALTY') specialtyReqs.push(r);
    else if (kind === 'FACILITY') facilityReqs.push(r);
  }

  // 2. Evaluate hard filters
  const reasons = [];

  // Bed filter
  const bedResult = evaluateBeds(hospital.beds || hospital.bed_inventory || [], bedReqs, bedsNeeded);
  if (!bedResult.passed) {
    const allowed = bedResult.allowedWards.join(', ');
    reasons.push(`No beds available in acceptable ward types (${allowed})`);
  }

  // Equipment filter
  const eqResult = evaluateEquipment(hospital.equipment || [], equipmentReqs);
  if (!eqResult.passedMandatory) {
    reasons.push(...eqResult.missingMandatory);
  }

  // Specialty filter
  const specResult = evaluateSpecialties(hospital.specialties || [], specialtyReqs);
  if (!specResult.passedMandatory) {
    reasons.push(...specResult.missingSpecialties);
  }

  // Facility filter
  const facResult = evaluateFacilities(hospital.facilities || [], facilityReqs);
  if (!facResult.passedMandatory) {
    reasons.push(...facResult.missingFacilities);
  }

  // If any hard filter failed, hospital is excluded from match ranking
  if (reasons.length > 0) {
    return {
      eligible: false,
      reasons,
      selectedWard: bedResult.selectedWard,
      freeCount: bedResult.freeCount
    };
  }

  // 3. Select dynamic weights based on clinical severity
  const isHighSeverity = severity === 4 || severity === 5 ||
    severity === 'CRITICAL' || severity === 'URGENT';
  const weights = isHighSeverity ? HIGH_SEVERITY_WEIGHTS : DEFAULT_WEIGHTS;

  // 4. Compute scoring components
  const proxResult = evaluateProximity(distanceMeters);
  const trendResult = evaluateTrend(netFlowPerHour);
  const qualityResult = evaluateQuality(hospital.rating_avg, hospital.trauma_level);

  // 5. Compute weighted composite score
  const totalScore = (
    (weights.proximity * proxResult.score) +
    (weights.bedScore * bedResult.score) +
    (weights.equipment * eqResult.score) +
    (weights.bedTrend * trendResult.score) +
    (weights.specialty * specResult.score) +
    (weights.quality * qualityResult.score)
  );

  const roundedScore = Number(totalScore.toFixed(4));
  const scorePercent = Math.round(roundedScore * 100);

  // 6. Generate human-readable clinical explanation
  const bedDetail = `${bedResult.freeCount} ${bedResult.selectedWard} bed${bedResult.freeCount === 1 ? '' : 's'} free now`;
  const proxDetail = `${proxResult.distanceKm} km away (~${proxResult.etaMinutes} min ETA)`;
  const eqDetail = equipmentReqs.length > 0 ? 'All mandatory equipment verified ready' : 'Standard facilities available';
  const explanation = `${proxDetail}. ${bedDetail}. ${eqDetail}. Match score: ${scorePercent}%.`;

  return {
    eligible: true,
    totalScore: roundedScore,
    breakdown: {
      proximity: proxResult.score,
      bedScore: bedResult.score,
      equipment: eqResult.score,
      bedTrend: trendResult.score,
      specialty: specResult.score,
      quality: qualityResult.score,
      weightsUsed: weights
    },
    explanation,
    selectedWard: bedResult.selectedWard,
    freeCount: bedResult.freeCount,
    distanceKm: proxResult.distanceKm,
    etaMinutes: proxResult.etaMinutes
  };
}

export {
  evaluateProximity,
  evaluateBeds,
  evaluateEquipment,
  evaluateSpecialties,
  evaluateFacilities,
  evaluateTrend,
  evaluateQuality
};

