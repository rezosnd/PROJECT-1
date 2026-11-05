import { z } from 'zod';

export const matchRequestSchema = z.object({
  conditionId: z.string().uuid().optional(),
  q: z.string().trim().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  radiusKm: z.coerce.number().positive().max(50).default(15),
  severity: z.union([
    z.coerce.number().int().min(1).max(5),
    z.enum(['NORMAL', 'URGENT', 'CRITICAL'])
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10)
}).refine(data => data.conditionId || data.q, {
  message: 'Either conditionId or q must be provided',
  path: ['conditionId']
});

