import { z } from 'zod';
import { BLOOD_GROUPS, BLOOD_COMPONENTS } from './blood.constants.js';

const bloodGroup = z.enum(BLOOD_GROUPS);
const component = z.enum(BLOOD_COMPONENTS.map((c) => c.code));

export const searchBloodBanksSchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive().max(50).default(25),
    bloodGroup: bloodGroup.optional(),
    component: component.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const hospitalIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const upsertStockSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    bloodGroup,
    component: component.default('PRBC'),
    unitsTotal: z.coerce.number().int().min(0).max(5000),
    unitsReserved: z.coerce.number().int().min(0).max(5000).optional(),
    unitsQuarantine: z.coerce.number().int().min(0).max(5000).optional(),
    expiringWithin7d: z.coerce.number().int().min(0).max(5000).optional(),
  }),
});

export const bulkStockSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    rows: z
      .array(
        z.object({
          bloodGroup,
          component: component.default('PRBC'),
          unitsTotal: z.coerce.number().int().min(0).max(5000),
          unitsReserved: z.coerce.number().int().min(0).optional(),
          unitsQuarantine: z.coerce.number().int().min(0).optional(),
          expiringWithin7d: z.coerce.number().int().min(0).optional(),
        })
      )
      .min(1)
      .max(80),
  }),
});

export const bloodBankSettingsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    hasBloodBank: z.boolean(),
    bloodBankPhone: z.string().max(32).optional().nullable(),
    bloodBankHours: z.string().max(120).optional().nullable(),
  }),
});

export const createBloodRequestSchema = z.object({
  body: z.object({
    hospitalId: z.string().uuid(),
    bloodGroup,
    component: component.default('PRBC'),
    unitsRequested: z.coerce.number().int().min(1).max(20).default(1),
    urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).default('NORMAL'),
    reason: z.string().max(1000).optional().nullable(),
    doctorName: z.string().max(255).optional().nullable(),
    note: z.string().max(2000).optional().nullable(),
  }),
});

export const decideBloodRequestSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    decision: z.enum(['APPROVE', 'REJECT', 'ISSUE']),
    reason: z.string().max(1000).optional().nullable(),
  }),
});

export const bloodRequestIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
