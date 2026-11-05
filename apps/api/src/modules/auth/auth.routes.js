import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { googleAuthSchema, refreshTokenSchema, logoutSchema, completeProfileSchema } from './auth.schema.js';
import {
  renderGoogleMobileHtml,
  renderGoogleMobileCallbackHtml,
  decodeGoogleMobileState,
} from './google-mobile.html.js';
import { config } from '../../config/index.js';
import { logger } from '../../infra/logger.js';
import adminRoutes from '../admin/admin.routes.js';

const router = Router();
const authLimiter = rateLimiter({ max: 20, windowMs: 60000, prefix: 'rl:auth' });

function publicApiOrigin(req) {
  if (
    config.PUBLIC_API_ORIGIN &&
    !/^(https?:\/\/)?(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(config.PUBLIC_API_ORIGIN)
  ) {
    return String(config.PUBLIC_API_ORIGIN).replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
    .toString()
    .split(',')[0]
    .trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || `localhost:${config.PORT}`).toString();
  if (/vercel\.app/i.test(host) || process.env.VERCEL) {
    return `https://${host.replace(/^https?:\/\//, '')}`;
  }
  return 'https://project1-api.vercel.app';
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

async function exchangeGoogleAuthCode({ code, codeVerifier, redirectUri }) {
  const clientId = config.GOOGLE_WEB_CLIENT_ID || config.GOOGLE_CLIENT_ID;
  const body = new URLSearchParams({
    code: String(code),
    client_id: String(clientId),
    redirect_uri: String(redirectUri),
    grant_type: 'authorization_code',
  });
  if (codeVerifier) body.set('code_verifier', String(codeVerifier));
  if (config.GOOGLE_CLIENT_SECRET) body.set('client_secret', String(config.GOOGLE_CLIENT_SECRET));

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    const msg = data.error_description || data.error || `Google token exchange failed (${tokenRes.status})`;
    const err = new Error(msg);
    err.payload = data;
    throw err;
  }
  return data;
}

// Expo Go bridge — starts auth-code + PKCE against HTTPS redirect URI
router.get('/google/mobile', (req, res) => {
  const origin = publicApiOrigin(req);
  const scheme = String(req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';
  const returnUrl = typeof req.query.return_url === 'string' ? req.query.return_url : '';
  const autoStart = req.query.auto !== '0';
  sendBridgeHtml(
    res,
    renderGoogleMobileHtml({
      clientId: config.GOOGLE_WEB_CLIENT_ID || config.GOOGLE_CLIENT_ID,
      redirectScheme: scheme,
      origin,
      returnUrl,
      autoStart,
    })
  );
});

/**
 * Google redirects here with ?code=&state=
 * Server exchanges code → id_token, then deep-links back to Expo Go.
 */
router.get('/google/mobile-callback', async (req, res) => {
  const origin = publicApiOrigin(req);
  const redirectUri = `${origin}/api/v1/auth/google/mobile-callback`;
  const state = decodeGoogleMobileState(req.query.state);
  const returnUrl = state?.return_url || (typeof req.query.return_url === 'string' ? req.query.return_url : '');
  const scheme = String(state?.scheme || req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';

  if (req.query.error) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: String(req.query.error),
        errorDetail: String(req.query.error_description || 'Google denied the sign-in request.'),
      })
    );
  }

  // Legacy: id_token already present (hash is handled client-side only)
  if (req.query.id_token || req.query.credential) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        idToken: req.query.id_token || req.query.credential,
      })
    );
  }

  const code = req.query.code;
  if (!code) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'missing_code',
        errorDetail: 'Google did not return an authorization code. Retry from the app.',
      })
    );
  }

  try {
    const tokens = await exchangeGoogleAuthCode({
      code,
      codeVerifier: state?.code_verifier,
      redirectUri,
    });
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new Error('Google token response did not include id_token');
    }
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        idToken,
      })
    );
  } catch (err) {
    logger.warn({ err: err.message, payload: err.payload }, '[Google Mobile] code exchange failed');
    const hint = !config.GOOGLE_CLIENT_SECRET
      ? ' Set GOOGLE_CLIENT_SECRET on Vercel (Web client secret from Google Cloud).'
      : '';
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'token_exchange_failed',
        errorDetail: `${err.message}.${hint} Also confirm redirect URI is exactly ${redirectUri}`,
      })
    );
  }
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

router.post('/google', authLimiter, validate(googleAuthSchema), authController.googleLogin);
router.post('/refresh', authLimiter, validate(refreshTokenSchema), authController.refresh);
router.post('/logout', requireAuth, validate(logoutSchema), authController.logout);
router.get('/users/me', requireAuth, authController.getMe);
router.put('/users/me/profile', requireAuth, validate(completeProfileSchema), authController.completeProfile);
router.use('/admin', adminRoutes);

export default router;
