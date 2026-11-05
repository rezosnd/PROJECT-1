import { Router } from 'express';
import { handleSSE } from './realtime.service.js';

const router = Router();

// Server-Sent Events (SSE) Fallback Stream
router.get('/', handleSSE);

export default router;

