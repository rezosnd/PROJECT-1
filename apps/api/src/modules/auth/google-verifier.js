import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/error-handler.js';

const client = new OAuth2Client();

let customVerifier = null;

/**
 * Dependency injection hook for test environments (NODE_ENV=test)
 */
export function setCustomGoogleVerifier(fn) {
  customVerifier = fn;
}

export function resetCustomGoogleVerifier() {
  customVerifier = null;
}

/**
 * Verifies a Google ID token using google-auth-library against client IDs.
 * Enforces email_verified === true.
 */
export async function verifyGoogleIdToken(idToken, clientType = 'web') {
  let profile = null;

  // 1. Check for custom dependency-injected test verifier
  if (customVerifier) {
    profile = await customVerifier(idToken, clientType);
  } else {
    // 2. Map client type to configured Google OAuth Client ID(s)
    let expectedAudience;
    switch (clientType) {
      case 'android':
        expectedAudience = [config.GOOGLE_ANDROID_CLIENT_ID, config.GOOGLE_WEB_CLIENT_ID, config.GOOGLE_CLIENT_ID].filter(Boolean);
        break;
      case 'ios':
        expectedAudience = [config.GOOGLE_IOS_CLIENT_ID, config.GOOGLE_WEB_CLIENT_ID, config.GOOGLE_CLIENT_ID].filter(Boolean);
        break;
      case 'web':
      default:
        expectedAudience = [config.GOOGLE_WEB_CLIENT_ID, config.GOOGLE_CLIENT_ID].filter(Boolean);
        break;
    }

    // Deduplicate audiences and unpack single element if applicable
    expectedAudience = Array.from(new Set(expectedAudience));
    if (expectedAudience.length === 1) {
      expectedAudience = expectedAudience[0];
    }

    // 3. Simulated tokens ONLY when explicitly allowed (tests / local harness)
    const allowDevTokens =
      config.ALLOW_DEV_TOKENS === true || config.NODE_ENV === 'test';
    if (
      allowDevTokens &&
      (idToken.startsWith('mock-token:') || idToken.startsWith('dev-token:'))
    ) {
      const parts = idToken.split(':');
      const sub = parts[1] || 'google-sub-mock-12345';
      const email = parts[2] || 'testuser@gmail.com';
      const name = parts[3] || 'Test User';
      const verified = parts[4] !== 'unverified';

      if (!verified) {
        throw new AppError('Google email address must be verified by Google', 401, 'EMAIL_NOT_VERIFIED');
      }

      profile = {
        sub,
        email: email.toLowerCase(),
        name,
        picture: 'https://lh3.googleusercontent.com/mock-avatar.jpg'
      };
    } else if (idToken.startsWith('mock-token:') || idToken.startsWith('dev-token:')) {
      throw new AppError(
        'Demo/dev Google tokens are disabled. Sign in with a real Google account.',
        401,
        'DEV_TOKEN_DISABLED'
      );
    } else {
      try {
        const ticket = await client.verifyIdToken({
          idToken,
          audience: expectedAudience
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new AppError('Failed to parse Google ID token payload', 401, 'INVALID_GOOGLE_TOKEN');
        }

        if (!payload.email_verified) {
          throw new AppError('Google email address must be verified by Google', 401, 'EMAIL_NOT_VERIFIED');
        }

        profile = {
          sub: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture || null
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(`Google token verification failed: ${err.message}`, 401, 'INVALID_GOOGLE_TOKEN');
      }
    }
  }

  // 4. Strict check: Google (Gmail) sign-in ONLY
  if (!profile.email || !profile.email.toLowerCase().endsWith('@gmail.com')) {
    throw new AppError('Only Gmail accounts (@gmail.com) are permitted to sign in', 401, 'GMAIL_REQUIRED');
  }

  return profile;
}

