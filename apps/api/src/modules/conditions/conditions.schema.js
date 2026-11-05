import { z } from 'zod';

export const requirementSchema = z.object({
  kind: z.enum(['BED', 'EQUIPMENT', 'SPECIALTY', 'FACILITY'], {
    errorMap: () => ({ message: 'kind must be BED, EQUIPMENT, SPECIALTY, or FACILITY' })
  }),
  value: z.string().trim().min(1, 'value is required'),
  qty: z.coerce.number().int().min(1).default(1),
  mandatory: z.boolean().default(true),
  preferenceOrder: z.coerce.number().int().min(1).default(1)
});

export const searchConditionsQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional()
});

export const conditionIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Condition identifier is required')
});

export const createConditionSchema = z.object({
  code: z.string().trim().min(2).max(64).transform(val => val.toUpperCase()),
  name: z.string().trim().min(2).max(255),
  aliases: z.array(z.string().trim()).default([]),
  icd10: z.string().trim().max(32).optional().nullable(),
  category: z.string().trim().min(2).max(64),
  severityDefault: z.enum(['NORMAL', 'URGENT', 'CRITICAL'], {
    errorMap: () => ({ message: 'severityDefault must be NORMAL, URGENT, or CRITICAL' })
  }),
  requirements: z.array(requirementSchema).default([])
});

export const updateConditionSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  aliases: z.array(z.string().trim()).optional(),
  icd10: z.string().trim().max(32).optional().nullable(),
  category: z.string().trim().min(2).max(64).optional(),
  severityDefault: z.enum(['NORMAL', 'URGENT', 'CRITICAL']).optional(),
  requirements: z.array(requirementSchema).optional()
});

