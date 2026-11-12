import { insuranceService } from './insurance.service.js';

export const insuranceController = {
  async listInsurers(req, res, next) {
    try {
      const data = await insuranceService.listInsurers();
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async getMine(req, res, next) {
    try {
      const data = await insuranceService.getMyInsurance(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async saveMine(req, res, next) {
    try {
      const data = await insuranceService.saveMyInsurance(req.user.id, req.body.policies || []);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async hospitalInsurers(req, res, next) {
    try {
      const data = await insuranceService.getHospitalInsurers(req.params.hospitalId || req.params.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },
};
