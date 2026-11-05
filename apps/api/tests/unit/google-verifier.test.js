import { jest } from '@jest/globals';
import { verifyGoogleIdToken } from '../../src/modules/auth/google-verifier.js';
import { config } from '../../src/config/index.js';

describe('Google Token Verifier Audience Configuration', () => {
  test('Configured GOOGLE_CLIENT_ID / GOOGLE_WEB_CLIENT_ID matches frontend expectations', () => {
    expect(config.GOOGLE_WEB_CLIENT_ID).toBeDefined();
    expect(config.GOOGLE_WEB_CLIENT_ID).not.toBe('mock-google-web-client-id.apps.googleusercontent.com');
    expect(config.GOOGLE_WEB_CLIENT_ID).toBe('1050173417910-28c0irqqh1nhaurmognqn01c9ocvo6pb.apps.googleusercontent.com');
  });

  test('Valid mock/dev token parses payload correctly', async () => {
    const profile = await verifyGoogleIdToken('mock-token:sub-123:test@gmail.com:Test User:verified', 'web');
    expect(profile.email).toBe('test@gmail.com');
    expect(profile.sub).toBe('sub-123');
    expect(profile.name).toBe('Test User');
  });

  test('Rejects non-Gmail addresses in verifyGoogleIdToken', async () => {
    await expect(
      verifyGoogleIdToken('mock-token:sub-123:user@yahoo.com:Test User:verified', 'web')
    ).rejects.toThrow('Only Gmail accounts (@gmail.com) are permitted to sign in');
  });
});

