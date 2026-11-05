import pino from 'pino';
import { config } from '../config/index.js';

// Distributed Systems Note: In high-throughput distributed architectures, centralized log aggregation
// (e.g. OpenSearch/Loki) must be protected against PII/PHI leaks.
// Sensitive medical identities (Aadhaar, ABHA, OTPs) and auth secrets are redacted at the logger level.
export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : (config.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.idToken',
      'req.body.refreshToken',
      'req.body.aadhaar',
      'req.body.otp',
      'req.body.abhaNumber',
      '*.aadhaar',
      '*.aadhaarNumber',
      '*.aadhaar_number',
      '*.otp',
      '*.abhaNumber',
      '*.abha_number',
      '*.idToken',
      '*.id_token',
      '*.refreshToken',
      '*.refresh_token'
    ],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

