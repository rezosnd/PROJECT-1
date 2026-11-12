import { bloodService } from './blood.service.js';

export const bloodController = {
  async catalog(req, res, next) {
    try {
      res.json({ success: true, data: bloodService.catalog(), traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async search(req, res, next) {
    try {
      const data = await bloodService.search(req.query);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async getHospital(req, res, next) {
    try {
      const data = await bloodService.getHospitalBloodBank(req.params.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req, res, next) {
    try {
      const data = await bloodService.updateSettings(req.params.id, req.body);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async upsertStock(req, res, next) {
    try {
      const data = await bloodService.upsertStock(req.params.id, req.body);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async bulkStock(req, res, next) {
    try {
      const data = await bloodService.bulkUpsertStock(req.params.id, req.body.rows || []);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async createRequest(req, res, next) {
    try {
      const idem = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || null;
      const data = await bloodService.createRequest(req.user.id, req.body, idem);
      res.status(201).json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async myRequests(req, res, next) {
    try {
      const data = await bloodService.listMine(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async hospitalQueue(req, res, next) {
    try {
      const hospitalId = req.hospitalId || req.params.id;
      const data = await bloodService.listHospitalQueue(hospitalId);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const data = await bloodService.cancel(req.params.id, req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async decide(req, res, next) {
    try {
      const data = await bloodService.decide(req.params.id, req.user, req.body);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },
};
