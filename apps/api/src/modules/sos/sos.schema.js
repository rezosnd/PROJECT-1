import { z } from 'zod';

export const createSosSchema = z.object({
  body: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    note: z.string().max(500).optional(),
    patientPhone: z.string().max(32).optional(),
    addressText: z.string().max(500).optional(),
    severity: z.enum(['URGENT', 'CRITICAL']).optional(),
    radiusM: z.coerce.number().min(1000).max(50000).optional(),
  }),
});

export const sosIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const acceptSosSchema = sosIdParamSchema;

export const updateSosStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED']),
    destinationHospitalId: z.string().uuid().optional(),
  }),
});

export const cancelSosSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().max(300).optional(),
  }),
});

export const heartbeatSchema = z.object({
  body: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    status: z.enum(['AVAILABLE', 'BUSY', 'EN_ROUTE', 'OFFLINE']).optional(),
  }),
});

export const pushTokenSchema = z.object({
  body: z.object({
    token: z.string().min(8).max(512),
    provider: z.enum(['EXPO', 'FCM', 'APNS']).optional(),
    platform: z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']).optional(),
    appSlug: z.string().max(64).optional(),
  }),
});
