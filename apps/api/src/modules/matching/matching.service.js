import { matchingRepository } from './matching.repository.js';
import { conditionsService } from '../conditions/conditions.service.js';
import { scoreHospitalCandidate } from './scoring/index.js';
import { forecastService } from '../forecast/forecast.service.js';
import { insuranceRepository } from '../insurance/insurance.repository.js';
import { redis, isRedisAvailable } from '../../infra/redis.js';
import { AppError } from '../../middleware/error-handler.js';
import { logger } from '../../infra/logger.js';

const MATCH_CACHE_TTL_SECONDS = 10;
const MANDATORY_DISCLAIMER = 'Not a medical device; In an emergency call 112';

export const matchingService = {
  /**
   * Evaluates condition-based hospital matching with PostGIS spatial radius,
   * hard capability filters, dynamic multi-attribute scoring, and Poisson forecasting.
   * Also ranks by patient insurance empanelment when available.
   */
  async findMatches({
    conditionId,
    q,
    lat,
    lng,
    radiusKm = 25,
    severity = null,
    limit = 10,
    patientId = null,
    insurerIds = null,
  }) {
    // 1. Resolve clinical condition and requirements
    let condition = null;
    if (conditionId) {
      condition = await conditionsService.getConditionByIdOrCode(conditionId).catch(() => null);
    }
    
    if (!condition && q) {
      const searchResults = await conditionsService.searchConditions({ q, limit: 1 });
      if (searchResults.length > 0) {
        condition = searchResults[0];
      } else {
        // Search by individual keywords if full phrase doesn't match
        const words = q.split(/[\s,+/_-]+/).filter(w => w.length > 2);
        for (const word of words) {
          const wordMatches = await conditionsService.searchConditions({ q: word, limit: 1 });
          if (wordMatches.length > 0) {
            condition = wordMatches[0];
            break;
          }
        }
      }
    }

    // Resilient fallback: If condition not specified or not found, fall back to citywide acute trauma intake
    if (!condition) {
      const traumaConditions = await conditionsService.searchConditions({ q: 'Trauma', limit: 1 });
      condition = traumaConditions[0] || (await conditionsService.searchConditions({ limit: 1 }))[0] || null;
    }

    if (!condition) {
      throw new AppError('Clinical condition catalog is not configured', 503, 'CONDITIONS_UNAVAILABLE');
    }

    const effectiveSeverity = severity || condition.severity_default || 'NORMAL';

    let patientInsurerIds = Array.isArray(insurerIds) ? insurerIds.map(String) : [];
    if ((!patientInsurerIds.length) && patientId) {
      try {
        const policies = await insuranceRepository.listPatientInsurance(undefined, patientId);
        patientInsurerIds = policies.map((p) => String(p.insurer_id));
      } catch (err) {
        logger.warn({ err: err.message }, '[Matching Engine] Could not load patient insurance');
      }
    }

    const insuranceKey = patientInsurerIds.slice().sort().join(',') || 'none';
    const cacheKey = `match:${condition.id}:${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}:${radiusKm}:${effectiveSeverity}:${limit}:${insuranceKey}`;

    // 2. Check 10-second Redis cache
    if (isRedisAvailable()) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug({ cacheKey }, '[Matching Engine] Cache hit for matching query');
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.warn({ err: err.message }, '[Matching Engine] Redis cache read failed; bypassing cache');
      }
    }

    // 3. PostGIS candidate discovery within radius
    const radiusMeters = radiusKm * 1000;
    const candidates = await matchingRepository.findCandidatesWithinRadius(undefined, {
      lat,
      lng,
      radiusMeters,
      maxCandidates: 100
    });

    const matches = [];
    const excluded = [];

    // 4. Evaluate each candidate hospital against clinical requirements
    for (const hospital of candidates) {
      hospital.acceptedInsurerIds = hospital.accepted_insurer_ids || [];
      const networkList = Array.isArray(hospital.insurance_network)
        ? hospital.insurance_network
        : [];
      const networkMap = new Map();
      for (const n of networkList) {
        if (!n?.insurerId) continue;
        networkMap.set(String(n.insurerId), {
          cashless: Boolean(n.cashless),
          discountPercent: Number(n.discountPercent) || 0,
          benefits: Array.isArray(n.benefits) ? n.benefits : [],
          planLabel: n.planLabel || null,
        });
      }
      hospital.insuranceNetworkMap = networkMap;
      const scoreResult = scoreHospitalCandidate(hospital, condition.requirements, {
        distanceMeters: Number(hospital.distance_meters || 0),
        severity: effectiveSeverity,
        bedsNeeded: 1,
        patientInsurerIds,
      });

      if (!scoreResult.eligible) {
        excluded.push({
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          distanceKm: Math.round((Number(hospital.distance_meters) / 1000) * 10) / 10,
          reasons: scoreResult.reasons
        });
      } else {
        matches.push({
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          type: hospital.type,
          address: hospital.address,
          phone: hospital.phone,
          ratingAvg: Number(hospital.rating_avg || 4.5),
          traumaLevel: Number(hospital.trauma_level || 1),
          emergency24x7: hospital.emergency_24x7 !== undefined ? Boolean(hospital.emergency_24x7) : true,
          photoUrl: hospital.photo_url || null,
          distanceKm: scoreResult.distanceKm,
          etaMinutes: scoreResult.etaMinutes,
          matchScore: Math.round(scoreResult.totalScore * 100),
          totalScore: scoreResult.totalScore,
          breakdown: scoreResult.breakdown,
          explanation: scoreResult.explanation,
          allocatedWard: scoreResult.selectedWard,
          freeBedsNow: scoreResult.freeCount,
          insuranceCoverage: scoreResult.insuranceCoverage || null,
          insuranceDiscountPercent: scoreResult.insuranceDiscountPercent || 0,
          insuranceBenefits: scoreResult.insuranceBenefits || [],
          insuranceCashless: Boolean(scoreResult.insuranceCashless),
          location: {
            latitude: Number(hospital.latitude),
            longitude: Number(hospital.longitude)
          }
        });
      }
    }

    // 5. Rank matches by composite score descending
    matches.sort((a, b) => b.totalScore - a.totalScore);
    const topMatches = matches.slice(0, limit);

    // 6. Enrich top matches with forecasts in PARALLEL (sequential was 15s+ and killed mobile).
    // Lightweight mode skips 28-day history scans; hospital detail still uses full model.
    await Promise.all(
      topMatches.map(async (match) => {
        if (!match.allocatedWard) return;
        try {
          const forecast = await forecastService.getWardForecast(
            match.hospitalId,
            match.allocatedWard,
            [1, 3, 6],
            { lightweight: true }
          );
          match.forecast = {
            confidence: forecast.confidence,
            '1h': forecast.horizons['1h'],
            '3h': forecast.horizons['3h'],
            '6h': forecast.horizons['6h']
          };
        } catch (err) {
          const freeRatio = Math.min(1, Number(match.freeBedsNow || 0) / 5);
          const p = Math.max(0.15, Math.min(0.95, 0.35 + freeRatio * 0.5));
          match.forecast = {
            confidence: 'LOW',
            '1h': { expectedFree: match.freeBedsNow, probabilityAtLeastOneFree: Math.min(0.99, p + 0.05) },
            '3h': { expectedFree: match.freeBedsNow, probabilityAtLeastOneFree: p },
            '6h': { expectedFree: match.freeBedsNow, probabilityAtLeastOneFree: Math.max(0.1, p - 0.05) }
          };
          logger.warn({ hospitalId: match.hospitalId, err: err.message }, '[Matching Engine] Forecast fallback applied');
        }
      })
    );

    const responsePayload = {
      condition: {
        id: condition.id,
        code: condition.code,
        name: condition.name,
        category: condition.category,
        severity: effectiveSeverity
      },
      searchRadiusKm: radiusKm,
      totalCandidatesWithinRadius: candidates.length,
      matchesCount: topMatches.length,
      excludedCount: excluded.length,
      matches: topMatches,
      excluded,
      disclaimer: MANDATORY_DISCLAIMER,
      timestamp: new Date().toISOString()
    };

    // 7. Store in Redis with 10s TTL
    if (isRedisAvailable()) {
      try {
        await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', MATCH_CACHE_TTL_SECONDS);
      } catch (err) {
        logger.warn({ err: err.message }, '[Matching Engine] Redis cache write failed');
      }
    }

    return responsePayload;
  },

  /**
   * Invalidate matching caches on bed inventory or equipment status mutations
   */
  async invalidateMatchingCache() {
    if (!isRedisAvailable()) return;
    try {
      const keys = await redis.keys('match:*');
      if (keys && keys.length > 0) {
        await redis.del(...keys);
        logger.debug({ count: keys.length }, '[Matching Engine] Invalidated matching cache keys');
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[Matching Engine] Cache invalidation error');
    }
  }
};

