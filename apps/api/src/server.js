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

/** Vercel runs the Express app via `api/index.js` — do not listen or start workers there. */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!isServerless) {
  const server = http.createServer(app);

  initRealtime(server);
  startBedHoldExpiryJob();
  startBedSnapshotJob();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = config.PORT === 5000 ? 5001 : 5000;
      logger.warn(
        { port: config.PORT, fallbackPort },
        `[CityHealth API] Port ${config.PORT} is already in use by another process. Binding to fallback port ${fallbackPort}...`
      );
      server.listen(fallbackPort, () => {
        logger.info(
          `[CityHealth API] Server active on http://0.0.0.0:${fallbackPort} (${config.NODE_ENV})`
        );
      });
    } else {
      logger.error({ err }, '[CityHealth API] Fatal server error');
      process.exit(1);
    }
  });

  server.listen(config.PORT, () => {
    logger.info(
      `[CityHealth API] Server active on http://0.0.0.0:${config.PORT} (${config.NODE_ENV})`
    );
  });

  async function handleShutdown(signal) {
    logger.info({ signal }, '[Shutdown] Initiating graceful termination...');
    stopBedHoldExpiryJob();
    stopBedSnapshotJob();

    server.close(async () => {
      logger.info('[Shutdown] HTTP listener closed');
      try {
        await pool.end();
        logger.info('[Shutdown] PostgreSQL connection pool drained');
        await redis.quit();
        logger.info('[Shutdown] Redis connection closed');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, '[Shutdown] Error during resource cleanup');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('[Shutdown] Forcefully terminating due to drain timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
