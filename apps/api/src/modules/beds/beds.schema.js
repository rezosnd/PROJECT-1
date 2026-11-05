import { z } from 'zod';

const WARD_ENUM = z.enum([
  'ICU', 'NICU', 'PICU', 'HDU', 'CCU',
  'GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'EMERGENCY', 'ISOLATION'
]);

export const getBedsParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid hospital UUID required')
  })
});

export const adjustBedCountersSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    wardType: WARD_ENUM
  }),
  body: z.object({
    total: z.number().int().optional(),
    occupied: z.number().int().optional(),
    reserved: z.number().int().optional(),
    cleaning: z.number().int().optional(),
    maintenance: z.number().int().optional(),
    reason: z.string().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one counter delta or reason must be specified'
  })
});

export const putBedCountersSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    wardType: WARD_ENUM
  }),
  body: z.object({
    total: z.number().int().min(0),
    occupied: z.number().int().min(0),
    reserved: z.number().int().min(0),
    cleaning: z.number().int().min(0),
    maintenance: z.number().int().min(0),
    hasVentilatorBeds: z.number().int().min(0).optional(),
    reason: z.string().optional()
  })
});

export const expectedDischargesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    wardType: WARD_ENUM
  }),
  body: z.object({
    expectedAt: z.array(z.string().datetime({ message: 'Each expected discharge must be an ISO-8601 UTC timestamp' })).min(1)
  })
});

export const createBedRequestSchema = z.object({
  body: z.object({
    hospitalId: z.string().uuid('Valid hospital UUID required'),
    wardType: WARD_ENUM,
    urgency: z.preprocess((val) => {
      if (typeof val === 'string') {
        const u = val.toUpperCase().trim();
        if (u === 'IMMEDIATE' || u === 'CRITICAL') return 'CRITICAL';
        if (u === 'HIGH' || u === 'URGENT') return 'URGENT';
        if (u === 'MODERATE' || u === 'NORMAL' || u === 'LOW') return 'NORMAL';
      }
      return val;
    }, z.enum(['NORMAL', 'URGENT', 'CRITICAL'])).default('NORMAL'),
    conditionId: z.string().uuid('Valid condition UUID required').nullish().or(z.literal('')),
    note: z.string().max(1000).nullish().or(z.literal('')),
    shareAbha: z.preprocess((v) => {
      if (typeof v === 'string') return v.toLowerCase() === 'true';
      return Boolean(v);
    }, z.boolean()).default(false),
    idempotencyKey: z.string().optional()
  })
});

export const decideBedRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid request UUID required')
  }),
  body: z.object({
    decision: z.preprocess((val) => {
      if (typeof val !== 'string') return val;
      const u = val.toUpperCase().trim();
      if (u === 'APPROVED' || u === 'APPROVE') return 'APPROVE';
      if (u === 'REJECTED' || u === 'REJECT') return 'REJECT';
      if (u === 'ADMITTED' || u === 'ADMIT') return 'ADMIT';
      if (u === 'DISCHARGED' || u === 'DISCHARGE' || u === 'LEFT' || u === 'LEAVE') return 'DISCHARGE';
      return u;
    }, z.enum(['APPROVE', 'REJECT', 'ADMIT', 'DISCHARGE'])),
    reason: z.string().max(255).optional()
  })
});

export const bedRequestParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid request UUID required')
  })
});

