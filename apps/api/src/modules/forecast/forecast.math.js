/**
 * Pure Poisson Probabilistic Forecast Mathematics
 * Provides exact discrete convolution, percentiles, and expected values
 */

/**
 * Computes Poisson PMF table up to maxK iteratively to prevent floating point overflow
 */
export function computePoissonDistribution(lambda, maxK = 35) {
  if (lambda <= 0) {
    const dist = new Array(maxK + 1).fill(0);
    dist[0] = 1.0;
    return dist;
  }

  const dist = new Array(maxK + 1);
  dist[0] = Math.exp(-lambda);

  for (let k = 1; k <= maxK; k++) {
    dist[k] = dist[k - 1] * (lambda / k);
  }

  return dist;
}

export function poissonPmf(k, lambda) {
  if (k < 0) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const dist = computePoissonDistribution(lambda, Math.max(k, 10));
  return dist[k] || 0;
}

/**
 * Exact bivariate discrete convolution of arrivals and discharges clamped to [0, capacity]
 * 
 * @param {number} currentFree Number of currently free beds
 * @param {number} capacity Maximum operational capacity (total - maintenance)
 * @param {number} lambdaArrivals Expected arrivals over horizon
 * @param {number} lambdaDischarges Expected discharges over horizon
 * @returns {Object} Forecast projection summary
 */
export function exactPoissonConvolution(currentFree, capacity, lambdaArrivals, lambdaDischarges) {
  const safeCapacity = Math.max(1, Math.round(capacity));
  const safeFree = Math.max(0, Math.min(safeCapacity, Math.round(currentFree)));
  const lambdaA = Math.max(0, Number(lambdaArrivals) || 0);
  const lambdaD = Math.max(0, Number(lambdaDischarges) || 0);

  // Determine cutoff for Poisson summation
  const maxLambda = Math.max(lambdaA, lambdaD);
  const cutoff = Math.min(100, Math.max(35, Math.ceil(maxLambda + 5 * Math.sqrt(maxLambda || 1))));

  const arrivalDist = computePoissonDistribution(lambdaA, cutoff);
  const dischargeDist = computePoissonDistribution(lambdaD, cutoff);

  // Initialize discrete state distribution for free beds: [0 ... capacity]
  const stateProbs = new Float64Array(safeCapacity + 1);

  for (let j = 0; j <= cutoff; j++) {
    const probD = dischargeDist[j];
    if (probD < 1e-12) continue;

    for (let k = 0; k <= cutoff; k++) {
      const probA = arrivalDist[k];
      if (probA < 1e-12) continue;

      const jointProb = probD * probA;
      // Clamped bed state
      const nextFree = Math.max(0, Math.min(safeCapacity, safeFree + j - k));
      stateProbs[nextFree] += jointProb;
    }
  }

  // Normalize to 1.0 to account for tail truncation
  let sumProbs = 0;
  for (let i = 0; i <= safeCapacity; i++) {
    sumProbs += stateProbs[i];
  }

  if (sumProbs > 0) {
    for (let i = 0; i <= safeCapacity; i++) {
      stateProbs[i] /= sumProbs;
    }
  } else {
    stateProbs[safeFree] = 1.0;
  }

  // Derive metrics
  let expectedFree = 0;
  let p10 = 0;
  let p90 = 0;
  let cumulative = 0;
  let foundP10 = false;
  let foundP90 = false;

  for (let s = 0; s <= safeCapacity; s++) {
    const prob = stateProbs[s];
    expectedFree += s * prob;
    cumulative += prob;

    if (!foundP10 && cumulative >= 0.10) {
      p10 = s;
      foundP10 = true;
    }
    if (!foundP90 && cumulative >= 0.90) {
      p90 = s;
      foundP90 = true;
    }
  }

  if (!foundP10) p10 = safeCapacity;
  if (!foundP90) p90 = safeCapacity;

  const probAtLeastOneFree = 1.0 - stateProbs[0];

  return {
    expectedFree: Number(expectedFree.toFixed(1)),
    probabilityAtLeastOneFree: Number(Math.max(0, Math.min(1, probAtLeastOneFree)).toFixed(4)),
    p10,
    p90,
    distribution: Array.from(stateProbs).map(p => Number(p.toFixed(4)))
  };
}

