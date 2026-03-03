'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { vendorSchema, type VendorFormData } from '@/lib/validations';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function NewVendorPage() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      rate_per_km: 0,
      rate_per_trip: 0,
    },
  });

  async function onSubmit(data: VendorFormData) {
    setServerError('');

    const { error } = await supabase.from('vendors').insert({
      company_id: appUser?.company_id,
      name: data.name,
      phone: data.phone || null,
      vehicle_number: data.vehicle_number || null,
      vehicle_type: data.vehicle_type || null,
      route_specialisation: data.route_specialisation || null,
      rate_per_km: data.rate_per_km || null,
      rate_per_trip: data.rate_per_trip || null,
      balance_due: 0,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push('/dashboard/vendors');
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/vendors" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Add Vendor</h2>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Vendor Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Sharma Transport"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Phone</label>
              <input
                {...register('phone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Vehicle Number</label>
              <input
                {...register('vehicle_number')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="AP09AB1234"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Vehicle Type</label>
              <select
                {...register('vehicle_type', { setValueAs: (v: string) => v === '' ? undefined : v })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select type</option>
                <option value="truck">Truck</option>
                <option value="tempo">Tempo</option>
                <option value="trailer">Trailer</option>
                <option value="tanker">Tanker</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Route Specialisation</label>
              <input
                {...register('route_specialisation')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Mumbai-Delhi"
              />
            </div>
          </div>
        </div>

        {/* Rates */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Rates</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Rate per KM (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('rate_per_km')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Rate per Trip (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('rate_per_trip')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Vendor
        </button>
      </form>
    </div>
  );
}
