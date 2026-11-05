import express from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { validate } from '../../middleware/validate.js';
import { abhaController } from './abha.controller.js';
import {
  consentSchema,
  createOtpSchema,
  createVerifySchema,
  addressSuggestionsSchema,
  createAddressSchema,
  linkInitSchema,
  linkVerifySchema
} from './abha.schema.js';

const router = express.Router();

// Access Control: Patient citizens exclusively manage their personal ABHA health ID
router.use(requireAuth);
router.use(requireRole('PATIENT'));

// Rate limiting: strictly 5 requests per minute per IP / token
router.use(rateLimiter({
  max: 5,
  windowMs: 60000,
  prefix: 'rl:abha'
}));

// 1. Consent Lifecycle
router.post('/consent', validate(consentSchema), abhaController.grantConsent);
router.delete('/consent', abhaController.revokeConsent);

// 2. Enrollment / Creation Flow (Aadhaar OTP -> Verify -> Suggestions -> Register)
router.post('/create/otp', validate(createOtpSchema), abhaController.createOtp);
router.post('/create/verify', validate(createVerifySchema), abhaController.createVerify);
router.get('/create/address-suggestions', validate(addressSuggestionsSchema), abhaController.getAddressSuggestions);
router.post('/create/address', validate(createAddressSchema), abhaController.createAddress);

// 3. Existing ABHA Linkage Flow (Init -> Verify)
router.post('/link/init', validate(linkInitSchema), abhaController.linkInit);
router.post('/link/verify', validate(linkVerifySchema), abhaController.linkVerify);

// 4. Identity Profile and Unlink Governance
router.get('/me', abhaController.getMe);
router.delete('/me', abhaController.unlink);

export default router;

