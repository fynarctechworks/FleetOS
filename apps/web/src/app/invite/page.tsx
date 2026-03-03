'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { inviteSchema, type InviteFormData } from '@/lib/validations';
import { UserPlus, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InvitePage() {
  const { appUser } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: '', phone: '', role: undefined, branchId: '' },
  });

  async function onSubmit(data: InviteFormData) {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (!appUser) return;

      const normalizedPhone = data.phone.startsWith('+91')
        ? data.phone
        : `+91${data.phone}`;

      // 1. Create the auth user via admin endpoint (Edge Function)
      // For now, we create the user record in our users table.
      // The invited user will sign in with OTP on their phone,
      // and set-custom-claims will link them to this company.

      // First check if user already exists in auth
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .eq('company_id', appUser.company_id)
        .maybeSingle();

      if (existingUser) {
        setError('A user with this phone number already exists in your company.');
        return;
      }

      // Create the invite via Edge Function that uses admin API
      const { data: session } = await supabase.auth.getSession();
      const { data: inviteResult, error: inviteError } = await supabase.functions.invoke(
        'invite-user',
        {
          body: {
            name: data.name,
            phone: normalizedPhone,
            role: data.role,
            company_id: appUser.company_id,
            branch_id: data.branchId || appUser.branch_id,
          },
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        }
      );

      if (inviteError) {
        setError('Failed to invite user: ' + inviteError.message);
        return;
      }

      if (inviteResult && !inviteResult.success) {
        setError(inviteResult.error || 'Failed to invite user');
        return;
      }

      setSuccess(`${data.name} has been invited as ${data.role}. They can log in with phone OTP.`);
      reset();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light p-6">
      <div className="mx-auto max-w-lg">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-dark">Invite Team Member</h1>
          <p className="mt-1 text-sm text-text-muted">
            Add a manager, accountant, or driver to your company
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-dark">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Suresh Reddy"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="invitePhone" className="mb-1.5 block text-sm font-medium text-text-dark">
                Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-text-muted">
                  +91
                </span>
                <input
                  id="invitePhone"
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
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-text-dark">
                Role
              </label>
              <select
                id="role"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('role')}
              >
                <option value="">Select a role</option>
                <option value="manager">Branch Manager</option>
                <option value="accountant">Accountant</option>
                <option value="driver">Driver</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-error">{errors.role.message}</p>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-sm text-success">{success}</p>
              </div>
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
                  <UserPlus className="h-5 w-5" />
                  Send Invite
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
