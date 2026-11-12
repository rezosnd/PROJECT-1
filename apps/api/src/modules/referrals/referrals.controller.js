import { referralsService } from './referrals.service.js';

export const referralsController = {
  async myQr(req, res, next) {
    try {
      const data = await referralsService.getMyPatientQr(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async scan(req, res, next) {
    try {
      const data = await referralsService.scanPatient(req.body.qrPayload);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const data = await referralsService.createReferral(req.user, req.body);
      res.status(201).json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async listMine(req, res, next) {
    try {
      const data =
        req.user.role === 'DOCTOR'
          ? await referralsService.listMineAsDoctor(req.user.id)
          : await referralsService.listMineAsPatient(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await referralsService.getById(req.params.id, req.user);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async departments(req, res, next) {
    try {
      const data = await referralsService.listDepartments(req.params.hospitalId);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async hospitalInbox(req, res, next) {
    try {
      const hospitalId = req.hospitalId || req.params.hospitalId;
      const data = await referralsService.listForHospital(hospitalId);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },
};
