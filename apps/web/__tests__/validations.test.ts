import { describe, it, expect } from 'vitest';
import { phoneSchema, otpSchema, onboardingSchema, inviteSchema } from '../src/lib/validations';

describe('phoneSchema', () => {
  it('accepts valid 10-digit Indian phone numbers', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(true);
    expect(phoneSchema.safeParse('6000000000').success).toBe(true);
    expect(phoneSchema.safeParse('7999999999').success).toBe(true);
    expect(phoneSchema.safeParse('8123456789').success).toBe(true);
  });

  it('accepts phone with +91 prefix', () => {
    expect(phoneSchema.safeParse('+919876543210').success).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(phoneSchema.safeParse('1234567890').success).toBe(false); // starts with 1
    expect(phoneSchema.safeParse('5555555555').success).toBe(false); // starts with 5
    expect(phoneSchema.safeParse('987654321').success).toBe(false);  // 9 digits
    expect(phoneSchema.safeParse('98765432101').success).toBe(false); // 11 digits
    expect(phoneSchema.safeParse('').success).toBe(false);
    expect(phoneSchema.safeParse('abcdefghij').success).toBe(false);
  });
});

describe('otpSchema', () => {
  it('accepts valid 6-digit OTPs', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
    expect(otpSchema.safeParse('000000').success).toBe(true);
    expect(otpSchema.safeParse('999999').success).toBe(true);
  });

  it('rejects invalid OTPs', () => {
    expect(otpSchema.safeParse('12345').success).toBe(false);   // 5 digits
    expect(otpSchema.safeParse('1234567').success).toBe(false);  // 7 digits
    expect(otpSchema.safeParse('abcdef').success).toBe(false);   // letters
    expect(otpSchema.safeParse('').success).toBe(false);
  });
});

describe('onboardingSchema', () => {
  const validData = {
    companyName: 'Sri Sai Transport',
    ownerName: 'Ramesh Kumar',
    phone: '9876543210',
    gstNumber: '37AABCU9603R1ZM',
    branchName: 'Head Office',
    branchCity: 'Visakhapatnam',
    lrPrefix: 'VZG',
  };

  it('accepts valid onboarding data', () => {
    expect(onboardingSchema.safeParse(validData).success).toBe(true);
  });

  it('accepts empty GST number (optional)', () => {
    expect(onboardingSchema.safeParse({ ...validData, gstNumber: '' }).success).toBe(true);
  });

  it('rejects missing company name', () => {
    expect(onboardingSchema.safeParse({ ...validData, companyName: '' }).success).toBe(false);
  });

  it('rejects invalid GST number format', () => {
    expect(onboardingSchema.safeParse({ ...validData, gstNumber: 'INVALID' }).success).toBe(false);
  });

  it('rejects lowercase LR prefix', () => {
    expect(onboardingSchema.safeParse({ ...validData, lrPrefix: 'vzg' }).success).toBe(false);
  });

  it('rejects LR prefix > 5 chars', () => {
    expect(onboardingSchema.safeParse({ ...validData, lrPrefix: 'VIZAGX' }).success).toBe(false);
  });

  it('rejects LR prefix < 2 chars', () => {
    expect(onboardingSchema.safeParse({ ...validData, lrPrefix: 'V' }).success).toBe(false);
  });
});

describe('inviteSchema', () => {
  const validInvite = {
    name: 'Suresh Reddy',
    phone: '9876543210',
    role: 'driver' as const,
  };

  it('accepts valid invite data', () => {
    expect(inviteSchema.safeParse(validInvite).success).toBe(true);
  });

  it('accepts all valid roles', () => {
    expect(inviteSchema.safeParse({ ...validInvite, role: 'manager' }).success).toBe(true);
    expect(inviteSchema.safeParse({ ...validInvite, role: 'accountant' }).success).toBe(true);
    expect(inviteSchema.safeParse({ ...validInvite, role: 'driver' }).success).toBe(true);
  });

  it('rejects owner role (only owner via onboarding)', () => {
    expect(inviteSchema.safeParse({ ...validInvite, role: 'owner' }).success).toBe(false);
  });

  it('rejects missing name', () => {
    expect(inviteSchema.safeParse({ ...validInvite, name: '' }).success).toBe(false);
  });

  it('rejects invalid phone', () => {
    expect(inviteSchema.safeParse({ ...validInvite, phone: '1234' }).success).toBe(false);
  });
});
