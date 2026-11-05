import { z } from 'zod';

const STATUS_ENUM = z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'FAULTY', 'OFFLINE']);
const CRITICALITY_ENUM = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);

export const listHospitalEquipmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid hospital UUID required')
  }),
  query: z.object({
    type: z.string().optional(),
    status: STATUS_ENUM.optional(),
    criticality: CRITICALITY_ENUM.optional()
  }).optional()
});

export const getEquipmentParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid equipment UUID required')
  })
});

export const searchEquipmentSchema = z.object({
  query: z.object({
    type: z.string().optional(),
    status: STATUS_ENUM.default('AVAILABLE'),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.5).max(200).default(30),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const createEquipmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid hospital UUID required')
  }),
  body: z.object({
    type: z.string().min(2).max(64),
    name: z.string().min(2).max(255),
    model: z.string().max(128).optional(),
    serialNo: z.string().min(2).max(128),
    status: STATUS_ENUM.default('AVAILABLE'),
    criticality: CRITICALITY_ENUM.default('NORMAL'),
    availableAt: z.string().datetime().optional()
  })
});

export const updateEquipmentStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid equipment UUID required')
  }),
  body: z.object({
    status: STATUS_ENUM,
    availableAt: z.string().datetime().optional().nullable(),
    reason: z.string().max(255).optional()
  })
});

