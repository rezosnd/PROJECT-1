import { adminService } from './admin.service.js';

export const adminController = {
  async preregisterStaff(req, res, next) {
    try {
      const { email, role, hospitalId } = req.body;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await adminService.preregisterStaff({
        email,
        role,
        hospitalId,
        actor: req.user,
        ip
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req, res, next) {
    try {
      const { page, limit, role, status, search } = req.query;

      const result = await adminService.listUsers({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        role,
        status,
        search
      });

      res.status(200).json({
        success: true,
        data: result.users,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async updateUserStatus(req, res, next) {
    try {
      const { id: targetUserId } = req.params;
      const { status } = req.body;
      const actorId = req.user.sub;
      const ip = req.ip || req.socket.remoteAddress;

      const updated = await adminService.updateUserStatus({
        targetUserId,
        status,
        actorId,
        ip
      });

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

