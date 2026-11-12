import { aiService } from './ai.service.js';

export const aiController = {
  async createSession(req, res, next) {
    try {
      const data = await aiService.createSession(req.user.id, req.body || {});
      res.status(201).json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async listSessions(req, res, next) {
    try {
      const data = await aiService.listSessions(req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req, res, next) {
    try {
      const data = await aiService.getMessages(req.params.id, req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async chat(req, res, next) {
    try {
      const data = await aiService.chat({
        userId: req.user.id,
        sessionId: req.body.sessionId,
        message: req.body.message,
        language: req.body.language || 'en',
        lat: req.body.latitude ?? null,
        lng: req.body.longitude ?? null,
      });
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async analyze(req, res, next) {
    try {
      const data = await aiService.analyzeOnly(req.body.text);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async recommend(req, res, next) {
    try {
      const data = await aiService.recommendHospitals({
        ...req.body,
        patientId: req.user?.id,
      });
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async createEmergency(req, res, next) {
    try {
      const data = await aiService.createEmergency({
        userId: req.user.id,
        sessionId: req.body.sessionId,
        text: req.body.text,
        lat: req.body.latitude,
        lng: req.body.longitude,
      });
      res.status(201).json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async getEmergency(req, res, next) {
    try {
      const data = await aiService.getEmergency(req.params.id, req.user.id);
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },

  async medicalSources(req, res, next) {
    try {
      const data = await aiService.listMedicalSources();
      res.json({ success: true, data, traceId: req.traceId });
    } catch (err) {
      next(err);
    }
  },
};
