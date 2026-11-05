import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './infra/logger.js';
import { pool } from './infra/db.js';
import { redis } from './infra/redis.js';
import { initRealtime } from './modules/realtime/realtime.service.js';
import { startBedHoldExpiryJob, stopBedHoldExpiryJob } from './jobs/bed-hold-expiry.job.js';
import { startBedSnapshotJob, stopBedSnapshotJob } from './jobs/bed-snapshot.job.js';

const app = createApp();
const server = http.createServer(app);

// Mount Socket.IO realtime engine
initRealtime(server);

// Start periodic advisory-locked bed hold expiry background worker
startBedHoldExpiryJob();

// Start periodic advisory-locked bed snapshot background worker (5 min intervals)
startBedSnapshotJob();

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = config.PORT === 5000 ? 5001 : 5000;
    logger.warn({ port: config.PORT, fallbackPort }, `[CityHealth API] Port ${config.PORT} is already in use by another process. Binding to fallback port ${fallbackPort}...`);
    server.listen(fallbackPort, () => {
      logger.info(`[CityHealth API] Server active on http://0.0.0.0:${fallbackPort} (${config.NODE_ENV})`);
    });
  } else {
    logger.error({ err }, '[CityHealth API] Fatal server error');
    process.exit(1);
  }
});

server.listen(config.PORT, () => {
  logger.info(`[CityHealth API] Server active on http://0.0.0.0:${config.PORT} (${config.NODE_ENV})`);
});

/**
 * Distributed Systems Note: Graceful Shutdown Lifecycle.
 * In containerized deployments (Kubernetes/ECS), SIGTERM signals that the node is being replaced.
 * Graceful termination stops accepting new requests, terminates background lease workers,
 * drains active transactions, and closes connection pools without dropping in-flight reservations.
 */
async function handleShutdown(signal) {
  logger.info({ signal }, '[Shutdown] Initiating graceful termination...');

  // Stop background hold expiry worker
  stopBedHoldExpiryJob();
  stopBedSnapshotJob();

  // Stop HTTP listener
  server.close(async () => {
    logger.info('[Shutdown] HTTP listener closed');

    try {
      // Drain PostgreSQL Pool
      await pool.end();
      logger.info('[Shutdown] PostgreSQL connection pool drained');

      // Close Redis connection
      await redis.quit();
      logger.info('[Shutdown] Redis connection closed');

      process.exit(0);
    } catch (err) {
      logger.error({ err }, '[Shutdown] Error during resource cleanup');
      process.exit(1);
    }
  });

  // Force exit after 10s if connections refuse to drain
  setTimeout(() => {
    logger.error('[Shutdown] Forcefully terminating due to drain timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
