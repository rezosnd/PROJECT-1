import { Router } from 'express';
import { forecastController } from './forecast.controller.js';

const router = Router();

// Batch predictive availability projection
router.post('/batch', forecastController.getBatchForecast);

export default router;

