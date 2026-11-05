import { matchingService } from './matching.service.js';

export const matchingController = {
  async match(req, res, next) {
    try {
      const results = await matchingService.findMatches(req.body);
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }
};

