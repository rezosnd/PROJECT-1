/**
 * Pure Bed Availability Trend Scoring
 * BedTrend = forecast probability of a free bed in 3 h from the forecast module
 */
export function evaluateTrend(forecastProb3h = 0.5) {
  // If probability is passed directly [0, 1], use it; if netFlowPerHour was passed, normalize
  let score;
  if (forecastProb3h >= 0 && forecastProb3h <= 1.0) {
    score = Number(forecastProb3h);
  } else {
    // Fallback for net flow numbers
    score = 0.5 + Math.max(-0.5, Math.min(0.5, Number(forecastProb3h) / 20));
  }

  return {
    score: Number(score.toFixed(4)),
    forecastProbability3h: score
  };
}
