import { authService } from './auth.service.js';

export const authController = {
  async googleLogin(req, res, next) {
    try {
      const { idToken, clientType, requestedRole, hospitalId } = req.body;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await authService.loginWithGoogle({
        idToken,
        clientType,
        ip,
        requestedRole,
        hospitalId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await authService.refreshSession({ refreshToken, ip });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const userId = req.user?.sub || null;
      const refreshToken = req.body?.refreshToken || null;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await authService.logout({ userId, refreshToken, ip });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const userId = req.user.sub;
      const user = await authService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  async completeProfile(req, res, next) {
    try {
      const userId = req.user.sub;
      const ip = req.ip || req.socket.remoteAddress;
      const user = await authService.completePatientProfile(userId, req.body, ip);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  async completeDoctorProfile(req, res, next) {
    try {
      const userId = req.user.sub;
      const ip = req.ip || req.socket.remoteAddress;
      const user = await authService.completeDoctorProfile(userId, req.body, ip);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },
};

