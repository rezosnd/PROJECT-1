import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import {
  googleAuthSchema,
  refreshTokenSchema,
  logoutSchema,
  completeProfileSchema,
  doctorProfileSchema,
} from './auth.schema.js';
import {
  renderGoogleMobileHtml,
  renderGoogleMobileCallbackHtml,
} from './google-mobile.html.js';
import {
  createMobileOAuthTicket,
  redeemMobileOAuthTicket,
  buildMobileDeepLinks,
} from './oauth-mobile-ticket.js';
import {
  createCodeVerifier,
  createCodeChallenge,
  createMobileOAuthSession,
  consumeMobileOAuthSession,
  publishMobileHandoff,
  takeMobileHandoff,
} from './oauth-mobile-session.js';
import { config } from '../../config/index.js';
import { logger } from '../../infra/logger.js';
import adminRoutes from '../admin/admin.routes.js';
import { GOOGLE_AUTH_PUBLIC_ORIGIN, resolveGoogleAuthOrigin } from './auth-origin.js';

const router = Router();
const authLimiter = rateLimiter({ max: 20, windowMs: 60000, prefix: 'rl:auth' });

const REDIRECT_PATH = '/api/v1/auth/google/mobile-callback';

/** Always the production alias for Google OAuth (never preview/LAN host). */
function publicApiOrigin() {
  return resolveGoogleAuthOrigin(config.PUBLIC_API_ORIGIN || GOOGLE_AUTH_PUBLIC_ORIGIN);
}

function googleClientId() {
  return config.GOOGLE_WEB_CLIENT_ID || config.GOOGLE_CLIENT_ID || '';
}

function exactRedirectUri() {
  return `${publicApiOrigin()}${REDIRECT_PATH}`;
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
  const clientId = googleClientId();
  const body = new URLSearchParams({
    code: String(code),
    client_id: String(clientId),
    redirect_uri: String(redirectUri),
    grant_type: 'authorization_code',
  });
  if (codeVerifier) body.set('code_verifier', String(codeVerifier));
  if (config.GOOGLE_CLIENT_SECRET) {
    body.set('client_secret', String(config.GOOGLE_CLIENT_SECRET));
  }

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

async function sendSuccessHandoff(res, { idToken, returnUrl, scheme, handoff = '' }) {
  const ticket = await createMobileOAuthTicket(idToken);
  if (handoff) {
    try {
      await publishMobileHandoff(handoff, ticket);
    } catch (err) {
      logger.warn({ err: err.message }, '[Google Mobile] handoff publish failed');
    }
  }
  const deepLinks = buildMobileDeepLinks({ returnUrl, scheme, ticket });
  return sendBridgeHtml(
    res,
    renderGoogleMobileCallbackHtml({
      redirectScheme: scheme,
      returnUrl,
      ticket,
      deepLinks,
    })
  );
}

function buildGoogleAuthorizeUrl({ clientId, redirectUri, challenge, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
    access_type: 'online',
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Diagnostic — confirms exact Google Console values the API uses.
 * Open: https://project1-api.vercel.app/api/v1/auth/google/mobile-config
 */
router.get('/google/mobile-config', (_req, res) => {
  const origin = publicApiOrigin();
  const clientId = googleClientId();
  const redirectUri = exactRedirectUri();
  res.json({
    success: true,
    data: {
      oauthClientType: 'Web application',
      clientId,
      javascriptOrigins: [origin],
      redirectUris: [redirectUri],
      exactRedirectUri: redirectUri,
      hasClientSecret: Boolean(config.GOOGLE_CLIENT_SECRET),
      publicApiOrigin: origin,
      ready: Boolean(clientId && config.GOOGLE_CLIENT_SECRET && !String(clientId).startsWith('mock-')),
      checklist: [
        'Google Cloud → APIs & Services → Credentials → your Web client',
        `Authorized JavaScript origins → add exactly: ${origin}`,
        `Authorized redirect URIs → add exactly: ${redirectUri}`,
        'OAuth consent screen → Audience/Testing → add your Gmail as Test user',
        'Vercel env GOOGLE_CLIENT_ID / GOOGLE_WEB_CLIENT_ID = that Web client ID',
        'Vercel env GOOGLE_CLIENT_SECRET = that Web client secret (required)',
        'Wait 1–5 minutes after saving Google Console, then retry',
      ],
    },
  });
});

/**
 * Expo Go entry — server builds PKCE, stores session, 302 → Google.
 * Avoids client-side state corruption that caused Google "Bad Request".
 */
router.get('/google/mobile-start', async (req, res) => {
  const clientId = googleClientId();
  const redirectUri = exactRedirectUri();
  const scheme = String(req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';
  const returnUrl =
    (typeof req.query.return_url === 'string' && req.query.return_url) ||
    (typeof req.query.returnUrl === 'string' && req.query.returnUrl) ||
    '';
  const handoff =
    typeof req.query.handoff === 'string' ? req.query.handoff.replace(/[^a-f0-9]/gi, '') : '';

  if (!clientId || String(clientId).startsWith('mock-')) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'missing_client_id',
        errorDetail:
          'GOOGLE_CLIENT_ID is missing on the API. Set the Web client ID on Vercel, then retry.',
      })
    );
  }

  if (!config.GOOGLE_CLIENT_SECRET) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'missing_client_secret',
        errorDetail:
          'GOOGLE_CLIENT_SECRET is missing on Vercel. Copy the Web client secret from Google Cloud → Credentials into Vercel env, redeploy, then retry.',
      })
    );
  }

  try {
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);
    const state = await createMobileOAuthSession({
      codeVerifier: verifier,
      returnUrl,
      scheme,
      handoff,
    });
    const url = buildGoogleAuthorizeUrl({
      clientId,
      redirectUri,
      challenge,
      state,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, url);
  } catch (err) {
    logger.warn({ err: err.message }, '[Google Mobile] start failed');
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'start_failed',
        errorDetail: err.message || 'Could not start Google sign-in.',
      })
    );
  }
});

// Bridge page (GIS button + manual start) — Expo prefers /google/mobile-start
router.get('/google/mobile', (req, res) => {
  const origin = publicApiOrigin();
  const scheme = String(req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';
  const returnUrl = typeof req.query.return_url === 'string' ? req.query.return_url : '';
  const autoStart = req.query.auto === '1';
  sendBridgeHtml(
    res,
    renderGoogleMobileHtml({
      clientId: googleClientId(),
      redirectScheme: scheme,
      origin,
      returnUrl,
      autoStart,
      hasClientSecret: Boolean(config.GOOGLE_CLIENT_SECRET),
      startUrl: `${origin}/api/v1/auth/google/mobile-start`,
    })
  );
});

/**
 * Mint a short one-time ticket for the GIS button path (avoids huge deep-link URLs).
 */
router.post('/google/mobile-ticket', authLimiter, async (req, res) => {
  try {
    const idToken = req.body?.id_token || req.body?.credential || '';
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'id_token required' },
      });
    }
    const returnUrl = String(req.body?.return_url || '');
    const scheme =
      String(req.body?.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') || 'lifelink';
    const ticket = await createMobileOAuthTicket(idToken);
    const deepLinks = buildMobileDeepLinks({ returnUrl, scheme, ticket });
    return res.json({
      success: true,
      data: {
        ticket,
        open_url: deepLinks[0] || null,
        deep_links: deepLinks,
      },
    });
  } catch (err) {
    logger.warn({ err: err.message }, '[Google Mobile] ticket mint failed');
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Could not create ticket' },
    });
  }
});

/** App redeems ticket → id_token (one-time). */
router.get('/google/mobile-ticket/:ticket', authLimiter, async (req, res) => {
  try {
    const idToken = await redeemMobileOAuthTicket(req.params.ticket);
    if (!idToken) {
      return res.status(404).json({
        success: false,
        error: { message: 'Ticket expired or already used. Tap Continue with Google again.' },
      });
    }
    return res.json({ success: true, data: { idToken } });
  } catch (err) {
    logger.warn({ err: err.message }, '[Google Mobile] ticket redeem failed');
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Could not redeem ticket' },
    });
  }
});

/**
 * Expo polls this while the browser is open. Works when "Open GetMyHospital"
 * deep links are blocked by Chrome Custom Tabs.
 */
router.get('/google/mobile-handoff/:handoff', authLimiter, async (req, res) => {
  try {
    const ticket = await takeMobileHandoff(req.params.handoff);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        pending: true,
        error: { message: 'waiting' },
      });
    }
    return res.json({ success: true, data: { ticket } });
  } catch (err) {
    logger.warn({ err: err.message }, '[Google Mobile] handoff poll failed');
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Could not poll handoff' },
    });
  }
});

/**
 * Google redirects here with ?code=&state=
 * Server exchanges code → id_token, stores short ticket, deep-links back to Expo Go.
 */
router.get('/google/mobile-callback', async (req, res) => {
  const redirectUri = exactRedirectUri();
  const stateId = typeof req.query.state === 'string' ? req.query.state : '';
  const session = stateId ? await consumeMobileOAuthSession(stateId) : null;
  const returnUrl =
    session?.returnUrl ||
    (typeof req.query.return_url === 'string' ? req.query.return_url : '');
  const scheme =
    String(session?.scheme || req.query.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') ||
    'lifelink';
  const handoff = session?.handoff || '';

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

  if (req.query.id_token || req.query.credential) {
    try {
      return await sendSuccessHandoff(res, {
        idToken: req.query.id_token || req.query.credential,
        returnUrl,
        scheme,
        handoff,
      });
    } catch (err) {
      return sendBridgeHtml(
        res,
        renderGoogleMobileCallbackHtml({
          redirectScheme: scheme,
          returnUrl,
          error: 'ticket_failed',
          errorDetail: err.message || 'Could not prepare app handoff.',
        })
      );
    }
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

  if (!session?.codeVerifier) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'session_expired',
        errorDetail:
          'Sign-in session expired or was already used. Close the browser and tap Continue with Google again.',
      })
    );
  }

  if (!config.GOOGLE_CLIENT_SECRET) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'missing_client_secret',
        errorDetail:
          'GOOGLE_CLIENT_SECRET is missing on Vercel. Add the Web client secret, redeploy, then retry.',
      })
    );
  }

  try {
    const tokens = await exchangeGoogleAuthCode({
      code,
      codeVerifier: session.codeVerifier,
      redirectUri,
    });
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new Error('Google token response did not include id_token');
    }
    return await sendSuccessHandoff(res, { idToken, returnUrl, scheme, handoff });
  } catch (err) {
    logger.warn({ err: err.message, payload: err.payload }, '[Google Mobile] code exchange failed');
    const detail = [
      err.message || 'Token exchange failed',
      `Redirect URI must be exactly: ${redirectUri}`,
      'Confirm Web client secret matches GOOGLE_CLIENT_SECRET on Vercel.',
      'Add your Gmail as a Test user on the OAuth consent screen.',
    ].join(' ');
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'token_exchange_failed',
        errorDetail: detail,
      })
    );
  }
});

router.post('/google/mobile-callback', async (req, res) => {
  const idToken = req.body?.credential || req.body?.id_token || '';
  const returnUrl = String(req.body?.return_url || req.query?.return_url || '');
  const scheme =
    String(req.body?.scheme || req.query?.scheme || 'lifelink').replace(/[^a-z0-9.-]/gi, '') ||
    'lifelink';
  if (!idToken) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'missing_token',
        errorDetail: 'No Google credential posted.',
      })
    );
  }
  try {
    return await sendSuccessHandoff(res, { idToken, returnUrl, scheme });
  } catch (err) {
    return sendBridgeHtml(
      res,
      renderGoogleMobileCallbackHtml({
        redirectScheme: scheme,
        returnUrl,
        error: 'ticket_failed',
        errorDetail: err.message || 'Could not prepare app handoff.',
      })
    );
  }
});

router.post('/google', authLimiter, validate(googleAuthSchema), authController.googleLogin);
router.post('/refresh', authLimiter, validate(refreshTokenSchema), authController.refresh);
router.post('/logout', requireAuth, validate(logoutSchema), authController.logout);
router.get('/users/me', requireAuth, authController.getMe);
router.put('/users/me/profile', requireAuth, validate(completeProfileSchema), authController.completeProfile);
router.put(
  '/users/me/doctor-profile',
  requireAuth,
  requireRole('DOCTOR'),
  validate(doctorProfileSchema),
  authController.completeDoctorProfile
);
router.use('/admin', adminRoutes);

export default router;
