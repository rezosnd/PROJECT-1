import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import {
  createSessionSchema,
  chatSchema,
  analyzeSchema,
  recommendSchema,
  emergencyCreateSchema,
  sessionIdParamSchema,
} from './ai.schema.js';

const router = Router();
const aiRate = rateLimiter({ max: 40, windowMs: 60_000, prefix: 'rl:ai' });

router.use(requireAuth, requireRole('PATIENT', 'CITY_ADMIN', 'DOCTOR'), aiRate);

router.post('/sessions', validate(createSessionSchema), aiController.createSession);
router.get('/sessions', aiController.listSessions);
router.get('/sessions/:id/messages', validate(sessionIdParamSchema), aiController.getMessages);

router.post('/chat', validate(chatSchema), aiController.chat);
router.post('/analyze-emergency', validate(analyzeSchema), aiController.analyze);
router.post('/recommend-hospitals', validate(recommendSchema), aiController.recommend);

router.post('/emergency', validate(emergencyCreateSchema), aiController.createEmergency);
router.get('/emergency/:id', validate(sessionIdParamSchema), aiController.getEmergency);

router.get('/medical-sources', aiController.medicalSources);

export default router;
