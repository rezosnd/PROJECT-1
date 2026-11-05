import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Treat empty Vercel env overrides as unset so Zod defaults apply. */
function scrubEmptyEnv(env) {
  const out = { ...env };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string' && v.trim() === '') delete out[k];
  }
  return out;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),

  DATABASE_URL: z
    .string()
    .default(
      'postgres://cityhealth_user:cityhealth_secret_password@localhost:5432/cityhealth'
    ),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default('dev_access_secret_super_secure_random_change_in_production_1234567890'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default('dev_refresh_secret_super_secure_random_change_in_production_1234567890'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().default(7),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_WEB_CLIENT_ID: z
    .string()
    .default(process.env.GOOGLE_CLIENT_ID || 'mock-google-web-client-id.apps.googleusercontent.com'),
  GOOGLE_ANDROID_CLIENT_ID: z
    .string()
    .default(
      process.env.GOOGLE_ANDROID_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        'mock-google-android-client-id.apps.googleusercontent.com'
    ),
  GOOGLE_IOS_CLIENT_ID: z
    .string()
    .default(
      process.env.GOOGLE_IOS_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        'mock-google-ios-client-id.apps.googleusercontent.com'
    ),
  PUBLIC_API_ORIGIN: z.string().optional(),

  SEED_ADMIN_EMAIL: z.string().email().default('cityadmin.bhubaneswar@gmail.com'),
  ALLOW_DEV_TOKENS: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),

  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:5173,http://localhost:3000,https://project1-api.vercel.app'
    ),

  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  ABDM_MODE: z.enum(['mock', 'sandbox', 'production']).default('mock'),
  ABDM_BRIDGE_ID: z.string().default('OHPL_001'),
  ABDM_CLIENT_ID: z.string().default('mock-abdm-client-id'),
  ABDM_CLIENT_SECRET: z.string().default('mock-abdm-client-secret'),
  ABDM_SESSION_URL: z
    .string()
    .url()
    .default('https://api.eka.care/connect-auth/v1/account/login'),
  ABDM_CERT_URL: z.string().url().default('https://dev.abdm.gov.in/api/v1/auth/cert'),
  ABDM_ABHA_BASE_URL: z.string().url().default('https://api.eka.care'),
  ABHA_ENC_KEY: z.string().default('MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE='),

  CLOUDINARY_CLOUD_NAME: z.string().default('dum1lkao3'),
  CLOUDINARY_API_KEY: z.string().default('817787181634525'),
  CLOUDINARY_API_SECRET: z.string().default('8B-tgtrVOlogYCgoSeEOilGeW4k'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_EMAIL: z.string().default('veritasco.tech@gmail.com'),
  SMTP_PASSWORD: z.string().default('udmd fcse murp gmdg'),
  FROM_EMAIL: z.string().default('veritasco.tech@gmail.com'),
  FROM_NAME: z.string().default('LifeLink CityHealth'),
});

const parsed = envSchema.safeParse(scrubEmptyEnv(process.env));

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const config = {
  ...parsed.data,
  corsOriginsList: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  PUBLIC_API_ORIGIN: (() => {
    const raw =
      parsed.data.PUBLIC_API_ORIGIN ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      'https://project1-api.vercel.app';
    // Never advertise a LAN IP to Google OAuth
    if (/^(https?:\/\/)?(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(raw)) {
      return 'https://project1-api.vercel.app';
    }
    return String(raw).replace(/\/$/, '');
  })(),
};
