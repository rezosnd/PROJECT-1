import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    language: z.enum(['en', 'hi', 'or']).default('en'),
    title: z.string().max(255).optional().nullable(),
  }),
});

export const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(4000),
    sessionId: z.string().uuid().optional().nullable(),
    language: z.enum(['en', 'hi', 'or']).default('en'),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  }),
});

export const analyzeSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(4000),
  }),
});

export const recommendSchema = z.object({
  body: z.object({
    q: z.string().min(1).max(500),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive().max(50).default(25),
    severity: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).optional(),
  }),
});

export const emergencyCreateSchema = z.object({
  body: z.object({
    text: z.string().min(1).max(4000),
    sessionId: z.string().uuid().optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
