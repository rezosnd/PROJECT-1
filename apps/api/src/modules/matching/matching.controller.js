import { matchingService } from './matching.service.js';

export const matchingController = {
  async match(req, res, next) {
    try {
      const patientId =
        req.user?.role === 'PATIENT' ? req.user.id : req.body.patientId || null;
      const results = await matchingService.findMatches({
        ...req.body,
        patientId,
      });
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
};

