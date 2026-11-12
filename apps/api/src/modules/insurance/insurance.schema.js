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

const benefitItem = z.string().trim().min(1).max(160);

export const hospitalNetworkItemSchema = z.object({
  insurerId: z.string().uuid(),
  cashless: z.boolean().optional().default(true),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  benefits: z.array(benefitItem).max(24).optional().default([]),
  planLabel: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const saveHospitalNetworkSchema = z.object({
  params: z.object({
    hospitalId: z.string().uuid(),
  }),
  body: z.object({
    networks: z.array(hospitalNetworkItemSchema).max(40).default([]),
  }),
});

export const hospitalIdParamsSchema = z.object({
  params: z.object({
    hospitalId: z.string().uuid(),
  }),
});
