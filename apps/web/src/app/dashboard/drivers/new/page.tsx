'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverSchema, type DriverFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewDriverPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: { fixed_salary: 0 },
  });

  async function onSubmit(data: DriverFormData) {
    setServerError('');

    // Separate bank account for encryption
    const bankAccountRaw = data.bank_account_number;

    const { data: inserted, error } = await supabase
      .from('drivers')
      .insert({
        name: data.name,
        phone: data.phone,
        aadhaar_last4: data.aadhaar_last4 || null,
        licence_number: data.licence_number || null,
        licence_expiry: data.licence_expiry || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        bank_ifsc: data.bank_ifsc || null,
        fixed_salary: data.fixed_salary,
        performance_score: 100,
        is_active: true,
        // bank_account_number set separately via Edge Function
      })
      .select('id')
      .single();

    if (error) {
      setServerError(error.message);
      return;
    }

    // Encrypt bank account via Edge Function if provided
    if (bankAccountRaw && inserted?.id) {
      const { error: encryptError } = await supabase.functions.invoke(
        'encrypt-bank-account',
        { body: { driver_id: inserted.id, account_number: bankAccountRaw } }
      );
      if (encryptError) {
        console.error('Bank encryption failed:', encryptError);
        // Non-blocking — driver is created, encryption can be retried
      }
    }

    router.push('/dashboard/drivers');
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/drivers" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Add Driver</h2>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6"
      >
        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Name <span className="text-red-500">*</span>
            </label>
            <input {...register('name')} placeholder="Driver full name" className={inputCls} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Phone <span className="text-red-500">*</span>
            </label>
            <input {...register('phone')} placeholder="9876543210" className={inputCls} />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          {/* Aadhaar last 4 — RULE-001: max 4 digits only */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Aadhaar (last 4 digits)
            </label>
            <input
              {...register('aadhaar_last4')}
              placeholder="1234"
              maxLength={4}
              className={inputCls}
            />
            {errors.aadhaar_last4 && (
              <p className="mt-1 text-xs text-red-600">{errors.aadhaar_last4.message}</p>
            )}
          </div>

          {/* Licence Number */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Licence Number</label>
            <input {...register('licence_number')} placeholder="AP-1234567890" className={inputCls} />
          </div>

          {/* Licence Expiry */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Licence Expiry</label>
            <input {...register('licence_expiry')} type="date" className={inputCls} />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Emergency Contact Name</label>
            <input {...register('emergency_contact_name')} className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Emergency Contact Phone</label>
            <input {...register('emergency_contact_phone')} className={inputCls} />
          </div>

          {/* Bank Account — encrypted via Edge Function */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Bank Account Number
              <span className="ml-1 text-xs text-text-muted">(encrypted)</span>
            </label>
            <input {...register('bank_account_number')} placeholder="Account number" className={inputCls} />
          </div>

          {/* IFSC */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">IFSC Code</label>
            <input {...register('bank_ifsc')} placeholder="SBIN0001234" className={inputCls} />
            {errors.bank_ifsc && <p className="mt-1 text-xs text-red-600">{errors.bank_ifsc.message}</p>}
          </div>

          {/* Fixed Salary */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Fixed Monthly Salary (₹)</label>
            <input {...register('fixed_salary')} type="number" placeholder="15000" className={inputCls} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/drivers" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Driver
          </button>
        </div>
      </form>
    </div>
  );
}
