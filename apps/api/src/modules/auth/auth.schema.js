import { z } from 'zod';

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
    clientType: z.enum(['web', 'android', 'ios']).default('web'),
    requestedRole: z.enum(['PATIENT', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN']).optional(),
    hospitalId: z.string().uuid().optional().nullable()
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional()
  }).optional()
});

export const completeProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(255).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional().nullable(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN']).optional(),
    ageYears: z.coerce.number().int().min(0).max(120).optional().nullable(),
    addressLine: z.string().min(3).max(500).optional(),
    cityName: z.string().min(2).max(120).optional().default('Bhubaneswar'),
    pinCode: z.string().min(4).max(12).optional().nullable(),
    emergencyContactName: z.string().min(2).max(255).optional(),
    emergencyContactPhone: z.string().min(10).max(20).optional(),
    mobilePhone: z.string().min(10).max(20).optional().nullable(),
    allergies: z.string().max(1000).optional().nullable(),
    medicalNotes: z.string().max(2000).optional().nullable(),
    preferredLanguage: z.enum(['en', 'hi', 'or']).optional().default('en')
  })
});

