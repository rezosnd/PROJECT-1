/**
 * Pure Proximity & ETA scoring
 * Assumes urban traffic speed of 30 km/h in Bhubaneswar
 */
export function evaluateProximity(distanceMeters) {
  const distanceKm = Math.max(0, Number((distanceMeters / 1000).toFixed(2)));
  // Urban travel time: 30 km/h = 0.5 km/min -> ETA = distanceKm * 2 minutes
  const etaMinutes = Math.max(1, Math.round(distanceKm * 2));

  // Proximity score: max(0, 1 - ETA/30 min) per master specification
  const score = Math.max(0, Math.min(1, 1 - (etaMinutes / 30)));

  return {
    score: Number(score.toFixed(4)),
    distanceKm,
    etaMinutes
  };
}

