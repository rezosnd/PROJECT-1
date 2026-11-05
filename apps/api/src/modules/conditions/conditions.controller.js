import { conditionsService } from './conditions.service.js';

export const conditionsController = {
  async search(req, res, next) {
    try {
      const { q, limit, category } = req.query;
      const conditions = await conditionsService.searchConditions({
        q,
        limit: limit ? Number(limit) : 20,
        category
      });
      res.status(200).json({
        success: true,
        data: conditions
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const condition = await conditionsService.getConditionByIdOrCode(req.params.id);
      res.status(200).json({
        success: true,
        data: condition
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const created = await conditionsService.createCondition(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: created
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const updated = await conditionsService.updateCondition(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await conditionsService.deleteCondition(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

