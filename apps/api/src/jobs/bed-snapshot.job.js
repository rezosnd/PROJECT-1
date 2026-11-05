import { forecastRepository } from '../modules/forecast/forecast.repository.js';
import { withAdvisoryLock } from '../infra/db.js';
import { logger } from '../infra/logger.js';
import { config } from '../config/index.js';

let intervalTimer = null;
let isRunning = false;

/**
 * Distributed Systems Note: Time-Series Bed Snapshots via PostgreSQL Advisory Lock.
 * In a multi-replica cluster, point-in-time bed state must be captured periodically
 * without duplicate entries.
 * Exactly one replica acquires 'BED_SNAPSHOT_JOB' lock and records the current state of all
 * active hospital wards into bed_snapshots for forecasting and historical analysis.
 */
export async function runSnapshotCycle() {
  if (isRunning) return;
  isRunning = true;

  try {
    const inserted = await withAdvisoryLock('BED_SNAPSHOT_JOB', async (client) => {
      const activeWards = await forecastRepository.getAllActiveWardInventories(client);
      if (activeWards.length === 0) return 0;

      const count = await forecastRepository.insertSnapshots(client, activeWards);
      logger.info({ count }, '[Bed Snapshot Job] Captured periodic bed inventory snapshots');
      return count;
    });

    return inserted;
  } catch (err) {
    logger.error({ err: err.message }, '[Bed Snapshot Job] Error capturing snapshots');
  } finally {
    isRunning = false;
  }
}

export function startBedSnapshotJob(intervalMs = 300000) { // 5 minutes default
  if (intervalTimer) return;

  // Run initial pass after 10s in non-test environments
  if (config.NODE_ENV !== 'test') {
    setTimeout(() => {
      runSnapshotCycle();
    }, 10000).unref();
  }

  intervalTimer = setInterval(() => {
    runSnapshotCycle();
  }, intervalMs);

  if (intervalTimer.unref) {
    intervalTimer.unref();
  }

  logger.info({ intervalMs }, '[Bed Snapshot Job] Worker registered and active');
}

export function stopBedSnapshotJob() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    logger.info('[Bed Snapshot Job] Worker stopped');
  }
}

