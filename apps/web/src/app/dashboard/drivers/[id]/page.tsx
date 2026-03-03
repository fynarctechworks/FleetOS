'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverSchema, type DriverFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditDriverPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: { fixed_salary: 0 },
  });

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error || !data) {
        router.push('/dashboard/drivers');
        return;
      }

      reset({
        name: data.name,
        phone: data.phone,
        aadhaar_last4: data.aadhaar_last4 || '',
        licence_number: data.licence_number || '',
        licence_expiry: data.licence_expiry || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        bank_account_number: '', // Never show encrypted value — user re-enters if changing
        bank_ifsc: data.bank_ifsc || '',
        fixed_salary: data.fixed_salary,
      });
      setLoading(false);
    }
    load();
  }, [driverId, reset, router]);

  async function onSubmit(data: DriverFormData) {
    setServerError('');

    const { error } = await supabase
      .from('drivers')
      .update({
        name: data.name,
        phone: data.phone,
        aadhaar_last4: data.aadhaar_last4 || null,
        licence_number: data.licence_number || null,
        licence_expiry: data.licence_expiry || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        bank_ifsc: data.bank_ifsc || null,
        fixed_salary: data.fixed_salary,
      })
      .eq('id', driverId);

    if (error) {
      setServerError(error.message);
      return;
    }

    // Encrypt bank account if provided
    if (data.bank_account_number) {
      await supabase.functions.invoke('encrypt-bank-account', {
        body: { driver_id: driverId, account_number: data.bank_account_number },
      });
    }

    router.push('/dashboard/drivers');
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/drivers" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Edit Driver</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
        {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-dark">Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className={inputCls} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Phone <span className="text-red-500">*</span></label>
            <input {...register('phone')} className={inputCls} />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Aadhaar (last 4 digits)</label>
            <input {...register('aadhaar_last4')} maxLength={4} className={inputCls} />
            {errors.aadhaar_last4 && <p className="mt-1 text-xs text-red-600">{errors.aadhaar_last4.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Licence Number</label>
            <input {...register('licence_number')} className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Licence Expiry</label>
            <input {...register('licence_expiry')} type="date" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Emergency Contact Name</label>
            <input {...register('emergency_contact_name')} className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Emergency Contact Phone</label>
            <input {...register('emergency_contact_phone')} className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Bank Account Number <span className="ml-1 text-xs text-text-muted">(leave blank to keep current)</span>
            </label>
            <input {...register('bank_account_number')} placeholder="Enter to update" className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">IFSC Code</label>
            <input {...register('bank_ifsc')} className={inputCls} />
            {errors.bank_ifsc && <p className="mt-1 text-xs text-red-600">{errors.bank_ifsc.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Fixed Monthly Salary (₹)</label>
            <input {...register('fixed_salary')} type="number" className={inputCls} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/drivers" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
