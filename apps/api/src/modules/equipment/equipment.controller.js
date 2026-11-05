import { equipmentService } from './equipment.service.js';

export const equipmentController = {
  async listHospitalEquipment(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const equipment = await equipmentService.listHospitalEquipment(hospitalId, req.query);
      res.status(200).json({
        success: true,
        data: equipment
      });
    } catch (err) {
      next(err);
    }
  },

  async getHospitalEquipmentSummary(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const summary = await equipmentService.getHospitalEquipmentSummary(hospitalId);
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  },

  async getEquipmentById(req, res, next) {
    try {
      const equipment = await equipmentService.getEquipmentById(req.params.id);
      res.status(200).json({
        success: true,
        data: equipment
      });
    } catch (err) {
      next(err);
    }
  },

  async searchEquipment(req, res, next) {
    try {
      const result = await equipmentService.searchEquipment(req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        meta: result.pagination
      });
    } catch (err) {
      next(err);
    }
  },

  async createEquipment(req, res, next) {
    try {
      const hospitalId = req.params.id;
      const eq = await equipmentService.createEquipment(hospitalId, req.body, req.user);
      res.status(201).json({
        success: true,
        data: eq
      });
    } catch (err) {
      next(err);
    }
  },

  async updateEquipmentStatus(req, res, next) {
    try {
      const equipmentId = req.params.id;
      const updated = await equipmentService.updateEquipmentStatus(equipmentId, req.body, req.user);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

