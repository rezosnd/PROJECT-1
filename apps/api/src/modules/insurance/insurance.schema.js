import { z } from 'zod';

export const savePatientInsuranceSchema = z.object({
  body: z.object({
    policies: z
      .array(
        z.object({
          insurerId: z.string().uuid(),
          policyNumber: z.string().max(120).optional().nullable(),
          memberId: z.string().max(120).optional().nullable(),
          planName: z.string().max(255).optional().nullable(),
          validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
          isPrimary: z.boolean().optional().default(false),
        })
      )
      .max(12)
      .default([]),
  }),
});
