import { sosService } from './sos.service.js';
import { upsertPushToken } from '../push/push.service.js';

export const sosController = {
  async create(req, res, next) {
    try {
      const data = await sosService.createSos(req.user, req.body);
      res.status(201).json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await sosService.getById(req.params.id, req.user);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req, res, next) {
    try {
      const data = await sosService.listMine(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async listOffers(req, res, next) {
    try {
      const data = await sosService.listOffersForAmbulance(req.user);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async accept(req, res, next) {
    try {
      const data = await sosService.accept(req.user, req.params.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const data = await sosService.updateStatus(req.user, req.params.id, req.body);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const data = await sosService.cancel(req.user.id, req.params.id, req.body?.reason);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async myAmbulance(req, res, next) {
    try {
      const data = await sosService.getMyAmbulance(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async heartbeat(req, res, next) {
    try {
      const data = await sosService.heartbeat(req.user, req.body);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async hospitalInbox(req, res, next) {
    try {
      const hospitalId = req.hospitalId || req.params.hospitalId;
      const data = await sosService.listHospital(hospitalId);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async registerPush(req, res, next) {
    try {
      const data = await upsertPushToken(req.user.id, req.body);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },
};
