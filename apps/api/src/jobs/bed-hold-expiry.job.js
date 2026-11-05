import { bedsService } from '../modules/beds/beds.service.js';
import { logger } from '../infra/logger.js';
import { config } from '../config/index.js';

let intervalTimer = null;
let isRunning = false;

/**
 * Distributed Systems Note: Autonomous Lease Reclamation via PostgreSQL Advisory Lock.
 * In a multi-replica API cluster, unconfirmed patient bed reservations (15-min hold) must be freed
 * exactly once without cross-replica race conditions.
 * Every 30 seconds, this job invokes bedsService.expireOverdueHolds(), which attempts to acquire
 * an advisory lock ('BED_HOLD_EXPIRY_JOB').
 * Only the single replica holding the lock executes the cleanup; other replicas immediately skip.
 */
export async function runHoldExpiryCycle() {
  if (isRunning) return;
  isRunning = true;

  try {
    const expiredCount = await bedsService.expireOverdueHolds();
    if (expiredCount && expiredCount > 0) {
      logger.info({ expiredCount }, '[Bed Hold Expiry Job] Released expired reservations');
    }
  } catch (err) {
    logger.error({ err: err.message }, '[Bed Hold Expiry Job] Error running expiry cycle');
  } finally {
    isRunning = false;
  }
}

export function startBedHoldExpiryJob(intervalMs = 30000) {
  if (intervalTimer) return;

  // Run initial pass after brief delay in non-test environments
  if (config.NODE_ENV !== 'test') {
    setTimeout(() => {
      runHoldExpiryCycle();
    }, 5000).unref();
  }

  intervalTimer = setInterval(() => {
    runHoldExpiryCycle();
  }, intervalMs);

  // Unref timer so it doesn't block node process shutdown
  if (intervalTimer.unref) {
    intervalTimer.unref();
  }

  logger.info({ intervalMs }, '[Bed Hold Expiry Job] Worker registered and active');
}

export function stopBedHoldExpiryJob() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    logger.info('[Bed Hold Expiry Job] Worker stopped');
  }
}

