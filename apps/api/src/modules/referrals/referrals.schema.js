import { z } from 'zod';

export const scanPatientSchema = z.object({
  body: z.object({
    qrPayload: z.string().min(1).max(4000),
  }),
});

export const createReferralSchema = z.object({
  body: z.object({
    patientId: z.string().uuid(),
    toHospitalId: z.string().uuid(),
    toDepartmentId: z.string().uuid().optional().nullable(),
    conditionId: z.string().uuid().optional().nullable(),
    urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).default('NORMAL'),
    reason: z.string().max(2000).optional().nullable(),
    clinicalNotes: z.string().max(4000).optional().nullable(),
    recommendedWard: z.string().max(32).optional().nullable(),
    createHold: z.boolean().optional().default(true),
    shareAbha: z.boolean().optional().default(false),
  }),
});

export const referralIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
