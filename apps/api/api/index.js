/**
 * Vercel serverless entry for the Express API.
 * Project Root Directory must be `apps/api`.
 *
 * Required Vercel env: DATABASE_URL (Neon), JWT_*, GOOGLE_WEB_CLIENT_ID,
 * PUBLIC_API_ORIGIN=https://project1-api.vercel.app
 */
import express from 'express';

function bootErrorApp(err) {
  const app = express();
  app.use((req, res) => {
    console.error('[Vercel boot error]', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'FUNCTION_BOOT_FAILED',
        message: err?.message || String(err),
      },
    });
  });
  return app;
}

let app;
try {
  const { createApp } = await import('../src/app.js');
  app = createApp();
} catch (err) {
  app = bootErrorApp(err);
}

export default app;
