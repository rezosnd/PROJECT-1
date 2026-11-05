import { bedsService } from './beds.service.js';

export const bedsController = {
  async getHospitalBeds(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const { etag } = await bedsService.getHospitalBedsEtag(hospitalId);
      const clientTag =
        req.headers['if-none-match'] ||
        (typeof req.query.v === 'string' ? req.query.v : null);

      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');

      // Ultra-cheap live poll: unchanged inventory → 304 (almost no payload)
      if (clientTag && clientTag === etag) {
        return res.status(304).end();
      }

      const beds = await bedsService.getHospitalBeds(hospitalId);
      res.status(200).json({
        success: true,
        data: beds,
        meta: { etag, live: true }
      });
    } catch (err) {
      next(err);
    }
  },

  async adjustBedCounters(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const wardType = req.params.wardType;
      const actorId = req.user?.sub;
      const updated = await bedsService.adjustBedCounters(hospitalId, wardType, req.body, actorId);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async putBedCounters(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const wardType = req.params.wardType;
      const actorId = req.user?.sub;
      const updated = await bedsService.putBedCounters(hospitalId, wardType, req.body, actorId);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async addExpectedDischarges(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const wardType = req.params.wardType;
      const result = await bedsService.addExpectedDischarges(hospitalId, wardType, req.body.expectedAt);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async createBedRequest(req, res, next) {
    try {
      const patientId = req.user.sub;
      const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
      const request = await bedsService.createBedRequest({
        patientId,
        hospitalId: req.body.hospitalId,
        wardType: req.body.wardType,
        urgency: req.body.urgency,
        conditionId: req.body.conditionId,
        note: req.body.note,
        shareAbha: req.body.shareAbha,
        idempotencyKey
      });

      res.status(201).json({
        success: true,
        data: request
      });
    } catch (err) {
      next(err);
    }
  },

  async getPatientRequests(req, res, next) {
    try {
      const requests = await bedsService.getPatientRequests(req.user.sub);
      res.status(200).json({
        success: true,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  },

  async getHospitalRequests(req, res, next) {
    try {
      const hospitalId = req.params.id || req.params.hospitalId;
      const status = req.query.status || null;
      const requests = await bedsService.getHospitalRequests(hospitalId, status);
      res.status(200).json({
        success: true,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  },

  async decideBedRequest(req, res, next) {
    try {
      const requestId = req.params.id;
      const { decision, reason } = req.body;
      let updated;
      if (decision === 'ADMIT') {
        updated = await bedsService.admitBedRequest(requestId, req.user);
      } else if (decision === 'DISCHARGE') {
        updated = await bedsService.dischargeBedRequest(requestId, req.user, reason);
      } else {
        updated = await bedsService.decideBedRequest(requestId, decision, reason, req.user);
      }
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelBedRequest(req, res, next) {
    try {
      const requestId = req.params.id;
      const updated = await bedsService.cancelBedRequest(requestId, req.user.sub);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async admitBedRequest(req, res, next) {
    try {
      const requestId = req.params.id;
      const updated = await bedsService.admitBedRequest(requestId, req.user);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async getCitySummary(req, res, next) {
    try {
      const summary = await bedsService.getCitySummary();
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }
};

