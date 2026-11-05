/**
 * Pure Hospital Quality & Accredited Trauma Level Scoring
 */
export function evaluateQuality(ratingAvg = 3.5, traumaLevel = 1) {
  const rating = Number(ratingAvg || 3.5);
  const trauma = Number(traumaLevel || 1);

  // 80% weight to patient rating (0-5), 20% weight to trauma center tier (1-3)
  const ratingNorm = Math.max(0, Math.min(1, rating / 5.0));
  const traumaNorm = Math.max(0, Math.min(1, trauma / 3.0));

  const score = (ratingNorm * 0.8) + (traumaNorm * 0.2);

  return {
    score: Number(score.toFixed(4)),
    rating,
    traumaLevel: trauma
  };
}

