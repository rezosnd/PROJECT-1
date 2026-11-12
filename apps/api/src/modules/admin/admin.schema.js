import { z } from 'zod';

export const preregisterStaffSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address required'),
    role: z.enum(['HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'DOCTOR', 'AMBULANCE'], {
      errorMap: () => ({ message: "Role must be 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'DOCTOR', or 'AMBULANCE'" })
    }),
    hospitalId: z.string().uuid('Valid hospital UUID required').optional().nullable(),
    specialty: z.string().max(120).optional().nullable(),
    licenseNo: z.string().max(64).optional().nullable(),
  }).superRefine((data, ctx) => {
    if (data.role !== 'DOCTOR' && !data.hospitalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'hospitalId is required for hospital staff',
        path: ['hospitalId'],
      });
    }
  })
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    role: z.enum(['PATIENT', 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN', 'DOCTOR']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    search: z.string().trim().optional()
  }).optional()
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid user UUID required')
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED'], {
      errorMap: () => ({ message: "Status must be 'ACTIVE' or 'SUSPENDED'" })
    })
  })
});

