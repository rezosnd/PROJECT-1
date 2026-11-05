import { z } from 'zod';

export const listHospitalsSchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.5).max(100).default(25),
    type: z.enum(['GOVERNMENT', 'PRIVATE', 'TRUST']).optional(),
    specialty: z.string().trim().optional(),
    status: z.enum(['VERIFIED', 'PENDING', 'SUSPENDED', 'REJECTED', 'ALL']).optional(),
    q: z.string().trim().optional(),
    sort: z.enum(['distance', 'rating']).default('distance'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
});

export const getHospitalParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid hospital UUID required')
  })
});

export const createHospitalSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Hospital name is required'),
    type: z.enum(['GOVERNMENT', 'PRIVATE', 'TRUST']),
    registrationNo: z.string().min(3, 'Registration number is required'),
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2).default('Bhubaneswar'),
    pin: z.string().min(6).max(10),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().min(7),
    email: z.string().email(),
    emergency24x7: z.boolean().default(true),
    traumaLevel: z.number().int().min(0).max(3).default(0),
    specialties: z.array(z.string()).default([]),
    facilities: z.array(z.string()).default([])
  })
});

export const updateHospitalSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(7).optional(),
    address: z.string().min(5).optional(),
    emergency24x7: z.boolean().optional(),
    specialties: z.array(z.string()).optional(),
    facilities: z.array(z.string()).optional(),
    ratingAvg: z.number().min(0).max(5).optional()
  })
});

export const verifyHospitalSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['VERIFIED', 'SUSPENDED', 'PENDING'])
  })
});

