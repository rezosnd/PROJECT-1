import { forecastRepository } from './forecast.repository.js';
import { exactPoissonConvolution } from './forecast.math.js';
import { AppError } from '../../middleware/error-handler.js';
import { logger } from '../../infra/logger.js';

// Default static priors when cold-starting with no telemetry
const WARD_FALLBACK_PRIORS = {
  ICU: { admissionsPerHour: 0.35, dischargesPerHour: 0.30 },
  NICU: { admissionsPerHour: 0.25, dischargesPerHour: 0.20 },
  PICU: { admissionsPerHour: 0.25, dischargesPerHour: 0.20 },
  HDU: { admissionsPerHour: 0.50, dischargesPerHour: 0.45 },
  CCU: { admissionsPerHour: 0.40, dischargesPerHour: 0.35 },
  EMERGENCY: { admissionsPerHour: 1.50, dischargesPerHour: 1.40 },
  GENERAL: { admissionsPerHour: 2.00, dischargesPerHour: 2.10 },
  SEMI_PRIVATE: { admissionsPerHour: 0.80, dischargesPerHour: 0.85 },
  PRIVATE: { admissionsPerHour: 0.60, dischargesPerHour: 0.65 },
  ISOLATION: { admissionsPerHour: 0.30, dischargesPerHour: 0.30 }
};

export const forecastService = {
  /**
   * Evaluates historical rates from bed_flow_hourly using recency-weighted hours
   */
  estimateHourlyRates(flowHistory, targetHourOffset, now = new Date()) {
    const targetDate = new Date(now.getTime() + targetHourOffset * 3600 * 1000);
    const targetDayOfWeek = targetDate.getUTCDay();
    const targetHourOfDay = targetDate.getUTCHours();

    // 1. Group records by exact hour-of-week
    const sameHourOfWeek = flowHistory.filter(f => {
      const d = new Date(f.hour_start);
      return d.getUTCDay() === targetDayOfWeek && d.getUTCHours() === targetHourOfDay;
    });

    if (sameHourOfWeek.length > 0) {
      // Sort newest first
      const sorted = [...sameHourOfWeek].sort((a, b) => new Date(b.hour_start) - new Date(a.hour_start));
      const weights = [0.4, 0.3, 0.2, 0.1];
      let sumWeights = 0;
      let weightedAdm = 0;
      let weightedDis = 0;

      for (let i = 0; i < Math.min(sorted.length, weights.length); i++) {
        const w = weights[i];
        weightedAdm += Number(sorted[i].admissions || 0) * w;
        weightedDis += Number(sorted[i].discharges || 0) * w;
        sumWeights += w;
      }

      if (sumWeights > 0) {
        return {
          admissions: weightedAdm / sumWeights,
          discharges: weightedDis / sumWeights,
          source: 'hour_of_week'
        };
      }
    }

    // 2. Fallback to same hour of day across all days
    const sameHourOfDay = flowHistory.filter(f => {
      const d = new Date(f.hour_start);
      return d.getUTCHours() === targetHourOfDay;
    });

    if (sameHourOfDay.length >= 3) {
      const totalAdm = sameHourOfDay.reduce((acc, r) => acc + Number(r.admissions || 0), 0);
      const totalDis = sameHourOfDay.reduce((acc, r) => acc + Number(r.discharges || 0), 0);
      return {
        admissions: totalAdm / sameHourOfDay.length,
        discharges: totalDis / sameHourOfDay.length,
        source: 'hour_of_day'
      };
    }

    // 3. Fallback to overall ward average across historical window
    if (flowHistory.length > 0) {
      const totalAdm = flowHistory.reduce((acc, r) => acc + Number(r.admissions || 0), 0);
      const totalDis = flowHistory.reduce((acc, r) => acc + Number(r.discharges || 0), 0);
      return {
        admissions: totalAdm / flowHistory.length,
        discharges: totalDis / flowHistory.length,
        source: 'ward_historical_mean'
      };
    }

    return null;
  },

  /**
   * Assesses dataset confidence level based on history volume and event count
   */
  assessConfidence(flowHistory) {
    if (!flowHistory || flowHistory.length === 0) {
      return 'LOW';
    }

    const distinctDays = new Set(
      flowHistory.map(f => new Date(f.hour_start).toISOString().split('T')[0])
    ).size;

    const totalEvents = flowHistory.reduce(
      (sum, f) => sum + Number(f.admissions || 0) + Number(f.discharges || 0), 0
    );

    if (distinctDays >= 14 && totalEvents >= 100) {
      return 'HIGH';
    }
    if (distinctDays >= 7 && totalEvents >= 30) {
      return 'MEDIUM';
    }
    return 'LOW';
  },

  /**
   * Computes ward availability prediction for requested horizons.
   * options.lightweight=true: use 7-day sample + single scheduled-discharge query (for /match).
   */
  async getWardForecast(hospitalId, wardType, horizons = [1, 3, 6], options = {}) {
    const lightweight = Boolean(options.lightweight);
    const wardUpper = wardType.toUpperCase();
    const inventory = await forecastRepository.getWardInventory(undefined, hospitalId, wardUpper);

    if (!inventory) {
      throw new AppError('WARD_NOT_FOUND', `Ward ${wardUpper} not found for hospital ${hospitalId}`, 404);
    }

    const currentFree = Number(inventory.free || 0);
    const capacity = Math.max(1, Number(inventory.total || 0) - Number(inventory.maintenance || 0));
    const defaultPrior = WARD_FALLBACK_PRIORS[wardUpper] || { admissionsPerHour: 0.5, dischargesPerHour: 0.5 };

    // Lightweight path (used by /match): priors + current free only — no 28-day history scan.
    // Full path keeps historical Poisson model for hospital detail pages.
    let flowHistory = [];
    let confidence = 'LOW';
    if (!lightweight) {
      flowHistory = await forecastRepository.getHourlyFlowHistory(
        undefined,
        hospitalId,
        wardUpper,
        28
      );
      confidence = this.assessConfidence(flowHistory);
    } else {
      confidence = currentFree > 0 ? 'MEDIUM' : 'LOW';
    }

    const horizonProjections = {};

    for (const h of horizons) {
      const horizonHours = Number(h);
      let cumulativeLambdaA = 0;
      let cumulativeLambdaD = 0;

      for (let step = 1; step <= horizonHours; step++) {
        const rates = lightweight ? null : this.estimateHourlyRates(flowHistory, step);
        if (rates) {
          cumulativeLambdaA += rates.admissions;
          cumulativeLambdaD += rates.discharges;
        } else {
          cumulativeLambdaA += defaultPrior.admissionsPerHour;
          cumulativeLambdaD += defaultPrior.dischargesPerHour;
        }
      }

      const scheduledForHorizon = lightweight
        ? 0
        : await forecastRepository.getScheduledDischarges(
            undefined, hospitalId, wardUpper, horizonHours
          );

      const effectiveLambdaD = Math.max(cumulativeLambdaD, scheduledForHorizon);
      const projection = exactPoissonConvolution(currentFree, capacity, cumulativeLambdaA, effectiveLambdaD);

      horizonProjections[`${horizonHours}h`] = {
        horizonHours,
        expectedFree: projection.expectedFree,
        p10: projection.p10,
        p90: projection.p90,
        probabilityAtLeastOneFree: projection.probabilityAtLeastOneFree,
        lambdaArrivals: Number(cumulativeLambdaA.toFixed(2)),
        lambdaDischarges: Number(effectiveLambdaD.toFixed(2)),
        scheduledDischargesCount: scheduledForHorizon
      };
    }

    return {
      hospitalId,
      wardType: wardUpper,
      currentFree,
      capacity,
      confidence,
      generatedAt: new Date().toISOString(),
      horizons: horizonProjections
    };
  },

  /**
   * Forecasts availability for in-use and operational equipment
   */
  async getEquipmentForecast(hospitalId, equipmentType = null) {
    const { equipment, avgUsageMinutes } = await forecastRepository.getEquipmentWithHistory(
      undefined, hospitalId, equipmentType
    );

    const now = Date.now();
    const items = equipment.map(item => {
      const isAvailable = item.status === 'AVAILABLE';
      let estimatedAvailableInMinutes = 0;
      let predictedAvailableAt = null;

      if (!isAvailable) {
        if (item.available_at) {
          const availMs = new Date(item.available_at).getTime();
          estimatedAvailableInMinutes = Math.max(0, Math.round((availMs - now) / 60000));
          predictedAvailableAt = item.available_at;
        } else {
          const updatedAtMs = new Date(item.updated_at).getTime();
          const elapsedMinutes = Math.max(0, (now - updatedAtMs) / 60000);
          estimatedAvailableInMinutes = Math.max(5, Math.round(avgUsageMinutes - elapsedMinutes));
          predictedAvailableAt = new Date(now + estimatedAvailableInMinutes * 60000).toISOString();
        }
      }

      return {
        id: item.id,
        type: item.type,
        name: item.name,
        model: item.model,
        serialNo: item.serial_no,
        status: item.status,
        criticality: item.criticality,
        isAvailable,
        estimatedAvailableInMinutes,
        predictedAvailableAt
      };
    });

    return {
      hospitalId,
      equipmentType: equipmentType ? equipmentType.toUpperCase() : null,
      averageUsageDurationMinutes: avgUsageMinutes,
      items
    };
  },

  /**
   * Batch forecasting for matching pipelines
   */
  async getBatchForecast(requests = [], horizons = [1, 3, 6]) {
    const results = [];
    for (const req of requests) {
      try {
        const res = await this.getWardForecast(req.hospitalId, req.wardType, horizons);
        results.push(res);
      } catch (err) {
        logger.warn({ hospitalId: req.hospitalId, wardType: req.wardType, err: err.message }, '[Forecast] Batch item skipped');
      }
    }
    return results;
  }
};

