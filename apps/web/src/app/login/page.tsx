'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { phoneSchema, otpSchema } from '@/lib/validations';
import { Truck, ArrowRight, Loader2 } from 'lucide-react';

const phoneFormSchema = z.object({ phone: phoneSchema });
const otpFormSchema = z.object({ otp: otpSchema });

type PhoneForm = z.infer<typeof phoneFormSchema>;
type OtpForm = z.infer<typeof otpFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: '' },
  });

  async function handleSendOtp(data: PhoneForm) {
    setError('');
    setIsLoading(true);

    // Normalize phone to +91 format
    const normalizedPhone = data.phone.startsWith('+91')
      ? data.phone
      : `+91${data.phone}`;

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setPhone(normalizedPhone);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(data: OtpForm) {
    setError('');
    setIsLoading(true);

    try {
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: data.otp,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      if (!authData.user) {
        setError('Verification failed. Please try again.');
        return;
      }

      // Call set-custom-claims to inject company_id, role, branch_id
      const { data: session } = await supabase.auth.getSession();
      const claimsResp = await supabase.functions.invoke('set-custom-claims', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (claimsResp.data?.data?.needs_onboarding) {
        router.push('/onboarding');
      } else {
        // Refresh the session to pick up the new claims
        await supabase.auth.refreshSession();
        router.push('/dashboard');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary">FleetOS</h1>
          <p className="mt-1 text-text-muted">Transport Management System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {step === 'phone' ? (
            <>
              <h2 className="mb-1 text-xl font-semibold text-text-dark">
                Log in to your account
              </h2>
              <p className="mb-6 text-sm text-text-muted">
                Enter your phone number to receive a one-time password
              </p>

              <form onSubmit={phoneForm.handleSubmit(handleSendOtp)}>
                <div className="mb-4">
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-text-dark"
                  >
                    Phone Number
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-text-muted">
                      +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      className="w-full rounded-r-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...phoneForm.register('phone')}
                    />
                  </div>
                  {phoneForm.formState.errors.phone && (
                    <p className="mt-1 text-sm text-error">
                      {phoneForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-text-muted">
                New fleet operator?{' '}
                <a
                  href="/onboarding"
                  className="font-medium text-accent hover:underline"
                >
                  Register your company
                </a>
              </p>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-xl font-semibold text-text-dark">
                Enter OTP
              </h2>
              <p className="mb-6 text-sm text-text-muted">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-text-dark">{phone}</span>
              </p>

              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)}>
                <div className="mb-4">
                  <label
                    htmlFor="otp"
                    className="mb-1.5 block text-sm font-medium text-text-dark"
                  >
                    One-Time Password
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...otpForm.register('otp')}
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="mt-1 text-sm text-error">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Login
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError('');
                  otpForm.reset();
                }}
                className="mt-4 w-full text-center text-sm text-text-muted hover:text-primary"
              >
                ← Change phone number
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
