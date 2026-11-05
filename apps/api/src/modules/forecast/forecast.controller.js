import { forecastService } from './forecast.service.js';

export const forecastController = {
  async getWardForecast(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const wardType = req.query.wardType || 'ICU';
      const horizons = req.query.horizons
        ? req.query.horizons.split(',').map(h => Number(h.trim())).filter(n => !isNaN(n) && n > 0)
        : [1, 3, 6];

      const forecast = await forecastService.getWardForecast(hospitalId, wardType, horizons);
      res.status(200).json({
        success: true,
        data: forecast
      });
    } catch (err) {
      next(err);
    }
  },

  async getEquipmentForecast(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const type = req.query.type || null;

      const forecast = await forecastService.getEquipmentForecast(hospitalId, type);
      res.status(200).json({
        success: true,
        data: forecast
      });
    } catch (err) {
      next(err);
    }
  },

  async getBatchForecast(req, res, next) {
    try {
      const { requests = [], horizons = [1, 3, 6] } = req.body;
      const forecasts = await forecastService.getBatchForecast(requests, horizons);
      res.status(200).json({
        success: true,
        data: forecasts
      });
    } catch (err) {
      next(err);
    }
  }
};

