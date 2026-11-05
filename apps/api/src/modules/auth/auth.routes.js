import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { googleAuthSchema, refreshTokenSchema, logoutSchema, completeProfileSchema } from './auth.schema.js';
import { renderGoogleMobileHtml, renderGoogleMobileCallbackHtml } from './google-mobile.html.js';
import { config } from '../../config/index.js';
import adminRoutes from '../admin/admin.routes.js';

const router = Router();

// Auth rate limiter: 20 attempts per minute
const authLimiter = rateLimiter({ max: 20, windowMs: 60000, prefix: 'rl:auth' });

function publicApiOrigin(req) {
  if (config.PUBLIC_API_ORIGIN) {
    return String(config.PUBLIC_API_ORIGIN).replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || `localhost:${config.PORT}`).toString();
  return `${proto}://${host}`;
}

function sendBridgeHtml(res, html) {
  res.removeHeader('Content-Security-Policy');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "frame-src https://accounts.google.com",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
    ].join('; ')
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
}

// Mobile Google Sign-In bridge — GIS JS callback (no OAuth redirect_uri / no auth.expo.io)
router.get('/google/mobile', (req, res) => {
  const origin = publicApiOrigin(req);
  const scheme = String(req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';
  const returnUrl = typeof req.query.return_url === 'string' ? req.query.return_url : '';
  const html = renderGoogleMobileHtml({
    clientId: config.GOOGLE_WEB_CLIENT_ID || config.GOOGLE_CLIENT_ID,
    redirectScheme: scheme,
    origin,
    returnUrl,
  });
  sendBridgeHtml(res, html);
});

// Optional helper if a credential is forwarded
router.get('/google/mobile-callback', (req, res) => {
  sendBridgeHtml(
    res,
    renderGoogleMobileCallbackHtml({
      redirectScheme: String(req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink',
      idToken: req.query.id_token || req.query.credential || '',
      returnUrl: typeof req.query.return_url === 'string' ? req.query.return_url : '',
    })
  );
});

router.post('/google/mobile-callback', (req, res) => {
  const idToken = req.body?.credential || req.body?.id_token || '';
  sendBridgeHtml(
    res,
    renderGoogleMobileCallbackHtml({
      redirectScheme: String(req.body?.scheme || req.query?.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink',
      idToken,
      returnUrl: String(req.body?.return_url || req.query?.return_url || ''),
    })
  );
});

// Google (Gmail) OAuth sign-in
router.post(
  '/google',
  authLimiter,
  validate(googleAuthSchema),
  authController.googleLogin
);

// Refresh token rotation with reuse detection
router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  authController.refresh
);

// Revoke session on logout
router.post(
  '/logout',
  requireAuth,
  validate(logoutSchema),
  authController.logout
);

// Current user profile
router.get(
  '/users/me',
  requireAuth,
  authController.getMe
);

// First-login clinical intake (patients only)
router.put(
  '/users/me/profile',
  requireAuth,
  validate(completeProfileSchema),
  authController.completeProfile
);

// Mount Admin endpoints directly under /api/v1/auth/admin
router.use('/admin', adminRoutes);

export default router;

