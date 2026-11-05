import { z } from 'zod';

export const preregisterStaffSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address required'),
    role: z.enum(['HOSPITAL_ADMIN', 'HOSPITAL_STAFF'], {
      errorMap: () => ({ message: "Role must be 'HOSPITAL_ADMIN' or 'HOSPITAL_STAFF'" })
    }),
    hospitalId: z.string().uuid('Valid hospital UUID required')
  })
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    role: z.enum(['PATIENT', 'HOSPITAL_ADMIN', 'HOSPITAL_STAFF', 'CITY_ADMIN']).optional(),
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

