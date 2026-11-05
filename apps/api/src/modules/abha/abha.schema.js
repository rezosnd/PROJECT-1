import { z } from 'zod';

export const consentSchema = {
  body: z.object({
    purpose: z.string().min(3, 'Purpose must be at least 3 characters').max(500, 'Purpose cannot exceed 500 characters')
  })
};

export const createOtpSchema = {
  body: z.object({
    aadhaar: z.string().regex(/^\d{12}$/, 'Aadhaar must be a 12-digit number')
  })
};

export const createVerifySchema = {
  body: z.object({
    txnId: z.string().min(1, 'Transaction ID is required'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
    mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a 10-digit number to link with ABHA')
  })
};

export const addressSuggestionsSchema = {
  query: z.object({
    txnId: z.string().min(1, 'Transaction ID is required')
  })
};

export const createAddressSchema = {
  body: z.object({
    txnId: z.string().min(1, 'Transaction ID is required'),
    abhaAddress: z.string().min(3, 'ABHA address must be at least 3 characters').max(64, 'ABHA address cannot exceed 64 characters')
  })
};

export const linkInitSchema = {
  body: z.object({
    abhaNumberOrAddress: z.string().min(3, 'ABHA number or address is required').max(64)
  })
};

export const linkVerifySchema = {
  body: z.object({
    txnId: z.string().min(1, 'Transaction ID is required'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number')
  })
};

