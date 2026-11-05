import { hospitalsService } from './hospitals.service.js';

export const hospitalsController = {
  async searchHospitals(req, res, next) {
    try {
      const { lat, lng, radiusKm, type, specialty, status, q, sort, page, limit } = req.query;

      const result = await hospitalsService.searchHospitals({
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        radiusMeters: radiusKm ? parseFloat(radiusKm) * 1000 : undefined,
        type,
        specialty,
        status,
        q,
        sort,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20
      });

      res.status(200).json({
        success: true,
        data: result.hospitals,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getHospitalById(req, res, next) {
    try {
      const { id } = req.params;
      const hospital = await hospitalsService.getHospitalById(id);

      res.status(200).json({
        success: true,
        data: hospital
      });
    } catch (err) {
      next(err);
    }
  },

  async createHospital(req, res, next) {
    try {
      const hospital = await hospitalsService.createHospital(req.body, req.user.sub);

      res.status(201).json({
        success: true,
        data: hospital
      });
    } catch (err) {
      next(err);
    }
  },

  async updateHospital(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await hospitalsService.updateHospital(id, req.body, req.user);

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyHospital(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await hospitalsService.verifyHospital(id, status, req.user.sub);

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async uploadPhoto(req, res, next) {
    try {
      const { id } = req.params;
      const { image, photoUrl } = req.body;
      const result = await hospitalsService.uploadHospitalPhoto(id, image || photoUrl, req.user);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async uploadAsset(req, res, next) {
    try {
      const { image, folder } = req.body;
      const result = await hospitalsService.uploadAsset(image, folder);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

