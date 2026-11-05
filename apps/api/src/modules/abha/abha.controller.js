import { abhaService } from './abha.service.js';

export const abhaController = {
  async grantConsent(req, res, next) {
    try {
      const data = await abhaService.recordConsent({
        userId: req.user.id || req.user.sub,
        purpose: req.body.purpose,
        ip: req.ip
      });
      res.status(201).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async revokeConsent(req, res, next) {
    try {
      const data = await abhaService.revokeConsent({
        userId: req.user.id || req.user.sub,
        ip: req.ip
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async createOtp(req, res, next) {
    try {
      const data = await abhaService.requestCreateOtp({
        userId: req.user.id || req.user.sub,
        aadhaar: req.body.aadhaar,
        ip: req.ip
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async createVerify(req, res, next) {
    try {
      const data = await abhaService.verifyCreateOtp({
        userId: req.user.id || req.user.sub,
        txnId: req.body.txnId,
        otp: req.body.otp,
        mobile: req.body.mobile,
        ip: req.ip
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getAddressSuggestions(req, res, next) {
    try {
      const data = await abhaService.getAddressSuggestions({
        userId: req.user.id || req.user.sub,
        txnId: req.query.txnId
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async createAddress(req, res, next) {
    try {
      const data = await abhaService.confirmCreateAddress({
        userId: req.user.id || req.user.sub,
        txnId: req.body.txnId,
        abhaAddress: req.body.abhaAddress,
        ip: req.ip
      });
      res.status(201).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async linkInit(req, res, next) {
    try {
      const data = await abhaService.initLink({
        userId: req.user.id || req.user.sub,
        abhaNumberOrAddress: req.body.abhaNumberOrAddress,
        ip: req.ip
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async linkVerify(req, res, next) {
    try {
      const data = await abhaService.verifyLink({
        userId: req.user.id || req.user.sub,
        txnId: req.body.txnId,
        otp: req.body.otp,
        ip: req.ip
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const data = await abhaService.getMe(req.user.id || req.user.sub);
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async unlink(req, res, next) {
    try {
      const data = await abhaService.unlink({
        userId: req.user.id || req.user.sub,
        ip: req.ip
      });
      res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }
};
