import {
  poissonPmf,
  computePoissonDistribution,
  exactPoissonConvolution
} from '../../src/modules/forecast/forecast.math.js';

describe('Poisson Forecast Engine (Pure Math & Discrete Convolution)', () => {
  describe('poissonPmf and computePoissonDistribution', () => {
    it('matches exact theoretical Poisson values for lambda = 2', () => {
      // P(k; lambda=2) = (2^k * e^-2) / k!
      const eNeg2 = Math.exp(-2); // ~0.135335
      const p0 = poissonPmf(0, 2);
      const p1 = poissonPmf(1, 2);
      const p2 = poissonPmf(2, 2);

      expect(p0).toBeCloseTo(eNeg2, 4);
      expect(p1).toBeCloseTo(2 * eNeg2, 4);
      expect(p2).toBeCloseTo(2 * eNeg2, 4);
    });

    it('Poisson distribution sums to ~1.0', () => {
      const dist = computePoissonDistribution(3.5, 30);
      const sum = dist.reduce((acc, p) => acc + p, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('exactPoissonConvolution', () => {
    it('reduces expected free beds when arrival rate exceeds discharge rate', () => {
      const currentFree = 5;
      const capacity = 20;
      const lambdaArrivals = 3.0;
      const lambdaDischarges = 0.5;

      const res = exactPoissonConvolution(currentFree, capacity, lambdaArrivals, lambdaDischarges);

      expect(res.expectedFree).toBeLessThan(currentFree);
      expect(res.expectedFree).toBeGreaterThanOrEqual(0);
      expect(res.p10).toBeLessThanOrEqual(res.p90);
      expect(res.probabilityAtLeastOneFree).toBeGreaterThan(0);
      expect(res.probabilityAtLeastOneFree).toBeLessThanOrEqual(1.0);
    });

    it('increases expected free beds when discharges exceed arrivals', () => {
      const currentFree = 3;
      const capacity = 20;
      const lambdaArrivals = 0.5;
      const lambdaDischarges = 4.0;

      const res = exactPoissonConvolution(currentFree, capacity, lambdaArrivals, lambdaDischarges);

      expect(res.expectedFree).toBeGreaterThan(currentFree);
      expect(res.expectedFree).toBeLessThanOrEqual(capacity);
    });

    it('clamps probability mass strictly within physical capacity [0, capacity]', () => {
      const currentFree = 1;
      const capacity = 10;
      // Massive influx of patients
      const lambdaArrivals = 50.0;
      const lambdaDischarges = 0.0;

      const res = exactPoissonConvolution(currentFree, capacity, lambdaArrivals, lambdaDischarges);

      expect(res.expectedFree).toBe(0);
      expect(res.p10).toBe(0);
      expect(res.probabilityAtLeastOneFree).toBe(0);
    });
  });
});

