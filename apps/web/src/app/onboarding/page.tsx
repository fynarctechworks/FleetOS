'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { onboardingSchema, type OnboardingFormData } from '@/lib/validations';
import Link from 'next/link';
import { Building2, Loader2, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [dpdpConsent, setDpdpConsent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      ownerName: '',
      phone: '',
      gstNumber: '',
      branchName: '',
      branchCity: '',
      lrPrefix: '',
    },
  });

  async function onSubmit(data: OnboardingFormData) {
    setError('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const normalizedPhone = data.phone.startsWith('+91')
        ? data.phone
        : `+91${data.phone}`;

      // 1. Create the company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: data.companyName,
          owner_name: data.ownerName,
          phone: normalizedPhone,
          whatsapp_phone: normalizedPhone,
          gst_number: data.gstNumber || null,
        })
        .select('id')
        .single();

      if (companyError) {
        setError('Failed to create company: ' + companyError.message);
        return;
      }

      // 2. Create the default branch
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .insert({
          company_id: company.id,
          name: data.branchName,
          city: data.branchCity,
          lr_prefix: data.lrPrefix,
        })
        .select('id')
        .single();

      if (branchError) {
        setError('Failed to create branch: ' + branchError.message);
        return;
      }

      // 3. Create the user record (links auth.users to our users table)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          company_id: company.id,
          branch_id: branch.id,
          name: data.ownerName,
          phone: normalizedPhone,
          role: 'owner',
        });

      if (userError) {
        setError('Failed to create user record: ' + userError.message);
        return;
      }

      // 4. Call set-custom-claims to inject company_id + role into JWT
      const { data: session } = await supabase.auth.getSession();
      await supabase.functions.invoke('set-custom-claims', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      // 5. Refresh session to pick up new claims
      await supabase.auth.refreshSession();

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-dark">
            Set up your fleet company
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            This takes under a minute. You can add details later.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Company Details */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                Company Details
              </legend>

              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-text-dark">
                    Company / Fleet Name
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="Sri Sai Transport"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...register('companyName')}
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-error">{errors.companyName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ownerName" className="mb-1.5 block text-sm font-medium text-text-dark">
                    Owner Name
                  </label>
                  <input
                    id="ownerName"
                    type="text"
                    placeholder="Ramesh Kumar"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...register('ownerName')}
                  />
                  {errors.ownerName && (
                    <p className="mt-1 text-sm text-error">{errors.ownerName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text-dark">
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
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-error">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="gstNumber" className="mb-1.5 block text-sm font-medium text-text-dark">
                    GST Number <span className="text-text-muted">(optional)</span>
                  </label>
                  <input
                    id="gstNumber"
                    type="text"
                    placeholder="37AABCU9603R1ZM"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...register('gstNumber')}
                  />
                  {errors.gstNumber && (
                    <p className="mt-1 text-sm text-error">{errors.gstNumber.message}</p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Branch Details */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                First Branch / Office
              </legend>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="branchName" className="mb-1.5 block text-sm font-medium text-text-dark">
                      Branch Name
                    </label>
                    <input
                      id="branchName"
                      type="text"
                      placeholder="Head Office"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...register('branchName')}
                    />
                    {errors.branchName && (
                      <p className="mt-1 text-sm text-error">{errors.branchName.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="branchCity" className="mb-1.5 block text-sm font-medium text-text-dark">
                      City
                    </label>
                    <input
                      id="branchCity"
                      type="text"
                      placeholder="Visakhapatnam"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...register('branchCity')}
                    />
                    {errors.branchCity && (
                      <p className="mt-1 text-sm text-error">{errors.branchCity.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="lrPrefix" className="mb-1.5 block text-sm font-medium text-text-dark">
                    LR Number Prefix
                  </label>
                  <input
                    id="lrPrefix"
                    type="text"
                    placeholder="VZG"
                    maxLength={5}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...register('lrPrefix')}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Your LR numbers will look like: VZG-000001, VZG-000002, etc.
                  </p>
                  {errors.lrPrefix && (
                    <p className="mt-1 text-sm text-error">{errors.lrPrefix.message}</p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* DPDP Consent */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                id="dpdpConsent"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="dpdpConsent" className="text-xs leading-relaxed text-text-muted">
                I consent to the collection and processing of my personal data as described in the{' '}
                <Link href="/privacy" target="_blank" className="text-primary underline">
                  Privacy Policy
                </Link>{' '}
                in accordance with the Digital Personal Data Protection Act, 2023. I also agree to the{' '}
                <Link href="/terms" target="_blank" className="text-primary underline">
                  Terms of Service
                </Link>.
              </label>
            </div>

            {error && (
              <p className="rounded-lg bg-error/10 p-3 text-sm text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !dpdpConsent}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-base font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Company & Start
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
