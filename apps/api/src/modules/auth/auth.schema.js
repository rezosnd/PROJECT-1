import { z } from 'zod';

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
    clientType: z.enum(['web', 'android', 'ios']).default('web'),
    requestedRole: z.enum(['PATIENT', 'HOSPITAL_STAFF', 'HOSPITAL_ADMIN', 'CITY_ADMIN', 'DOCTOR', 'AMBULANCE']).optional(),
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
    preferredLanguage: z.enum(['en', 'hi', 'or']).optional().default('en'),
    insurancePolicies: z
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
      .optional()
      .default([])
  })
});

export const doctorProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(255).optional(),
    doctorSpecialty: z.string().min(2).max(120),
    doctorQualification: z.string().min(2).max(255),
    doctorDegrees: z.string().max(500).optional().nullable(),
    doctorLicenseNo: z.string().min(2).max(64).optional().nullable(),
    doctorExperienceYears: z.coerce.number().int().min(0).max(60).optional().nullable(),
    doctorBio: z.string().max(2000).optional().nullable(),
    doctorPhone: z.string().min(10).max(32).optional().nullable(),
    doctorClinicName: z.string().max(255).optional().nullable(),
    doctorConsultationFee: z.coerce.number().min(0).max(100000).optional().nullable(),
    hospitalId: z.string().uuid().optional().nullable(),
  }),
});

