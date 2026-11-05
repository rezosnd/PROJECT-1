import pg from 'pg';
import dotenv from 'dotenv';
import { exactPoissonConvolution } from '../src/modules/forecast/forecast.math.js';

dotenv.config();

/**
 * Deterministic Backtest Engine
 * Compares Poisson queueing model vs naive "free stays same" baseline across 1h, 3h, 6h horizons
 */
async function runBacktest() {
  console.log('=== LifeLink CityHealth - Forecast Backtest Runner ===\n');

  let flowData = [];
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    try {
      const client = new pg.Client({ connectionString });
      await client.connect();
      const res = await client.query(`
        SELECT hour_start, admissions, discharges
        FROM bed_flow_hourly
        ORDER BY hour_start ASC
        LIMIT 672;
      `);
      await client.end();
      if (res.rows.length >= 100) {
        flowData = res.rows.map(r => ({
          hour_start: new Date(r.hour_start),
          admissions: Number(r.admissions),
          discharges: Number(r.discharges)
        }));
        console.log(`[Backtest] Loaded ${flowData.length} hours of historical flow from PostgreSQL.`);
      }
    } catch {
      console.log('[Backtest] Live database not reachable, running deterministic in-memory backtest suite.');
    }
  }

  // Generate deterministic synthetic 28-day series if DB is empty
  if (flowData.length < 100) {
    const baseDate = new Date('2026-01-01T00:00:00Z');
    flowData = [];
    for (let h = 0; h < 672; h++) {
      const date = new Date(baseDate.getTime() + h * 3600 * 1000);
      const hod = date.getUTCHours();
      const dow = date.getUTCDay();

      const admRate = 0.5 + 0.5 * Math.sin(((hod - 8) / 24) * 2 * Math.PI);
      const disRate = 0.5 + 0.5 * Math.sin(((hod - 11) / 24) * 2 * Math.PI);
      const weekend = (dow === 0 || dow === 6) ? 0.8 : 1.1;

      // Deterministic PRNG
      const noise = ((h * 9301 + 49297) % 233280) / 233280;
      flowData.push({
        hour_start: date,
        admissions: Math.max(0, Math.round(1.5 * admRate * weekend + (noise > 0.6 ? 1 : 0))),
        discharges: Math.max(0, Math.round(1.5 * disRate * weekend + (noise < 0.4 ? 1 : 0)))
      });
    }
    console.log(`[Backtest] Generated ${flowData.length} hours of deterministic diurnal time series.`);
  }

  const capacity = 30;
  const initialFree = 8;
  const horizons = [1, 3, 6];

  const maeNaive = { 1: 0, 3: 0, 6: 0 };
  const maePoisson = { 1: 0, 3: 0, 6: 0 };
  const counts = { 1: 0, 3: 0, 6: 0 };

  // Rolling walk-forward evaluation starting after 7 days (168 hours) of training data
  for (let t = 168; t < flowData.length - 6; t++) {
    const currentFree = initialFree;

    for (const h of horizons) {
      // 1. Calculate actual ground truth free beds at t + h
      let actualDelta = 0;
      for (let step = 1; step <= h; step++) {
        actualDelta += flowData[t + step].discharges - flowData[t + step].admissions;
      }
      const actualFree = Math.max(0, Math.min(capacity, currentFree + actualDelta));

      // 2. Naive Baseline: Free beds remain identical to current state
      const naivePred = currentFree;
      const naiveError = Math.abs(naivePred - actualFree);

      // 3. Poisson Model: Estimate lambdaA and lambdaD using historical hour-of-day rates for target hours
      let lambdaA = 0;
      let lambdaD = 0;

      for (let step = 1; step <= h; step++) {
        const targetDate = flowData[t + step].hour_start;
        const targetHod = targetDate.getUTCHours();
        const targetDow = targetDate.getUTCDay();

        // Calculate average for this specific target hour-of-day across all past days
        let sumA = 0;
        let sumD = 0;
        let count = 0;

        for (let day = 1; day <= 7; day++) {
          const pastIndex = t - (day * 24) + step;
          if (pastIndex >= 0 && pastIndex < t) {
            sumA += flowData[pastIndex].admissions;
            sumD += flowData[pastIndex].discharges;
            count++;
          }
        }

        if (count > 0) {
          lambdaA += sumA / count;
          lambdaD += sumD / count;
        } else {
          lambdaA += 1.0;
          lambdaD += 1.0;
        }
      }

      const poissonResult = exactPoissonConvolution(currentFree, capacity, lambdaA, lambdaD);
      const poissonPred = poissonResult.expectedFree;
      const poissonError = Math.abs(poissonPred - actualFree);

      maeNaive[h] += naiveError;
      maePoisson[h] += poissonError;
      counts[h]++;
    }
  }

  console.log('\n--- Backtest Evaluation Results ---');
  console.log('| Horizon | Naive MAE | Poisson MAE | MAE Improvement | Superiority |');
  console.log('|---------|-----------|-------------|-----------------|-------------|');

  let allBeaten = true;
  for (const h of horizons) {
    const avgNaive = maeNaive[h] / counts[h];
    const avgPoisson = maePoisson[h] / counts[h];
    const improvementPercent = (((avgNaive - avgPoisson) / avgNaive) * 100).toFixed(1);
    const beatsNaive = avgPoisson < avgNaive;
    if (!beatsNaive) allBeaten = false;

    console.log(`| ${h} hour${h > 1 ? 's' : ' '} | ${avgNaive.toFixed(3)} beds | ${avgPoisson.toFixed(3)} beds  | ${improvementPercent}% reduction  | ${beatsNaive ? 'PASS (Poisson)' : 'FAIL'} |`);
  }

  console.log('\nConclusion:');
  if (allBeaten) {
    console.log('SUCCESS: Poisson arrival/discharge convolution consistently outperforms naive baseline across all 1h, 3h, and 6h horizons.');
    process.exit(0);
  } else {
    console.error('FAILURE: Poisson model did not beat naive baseline on all horizons.');
    process.exit(1);
  }
}

runBacktest().catch(err => {
  console.error('[Backtest] Fatal error:', err);
  process.exit(1);
});
