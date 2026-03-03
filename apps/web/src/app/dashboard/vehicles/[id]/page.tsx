'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema, type VehicleFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error || !data) {
        router.push('/dashboard/vehicles');
        return;
      }

      reset({
        registration_number: data.registration_number,
        make: data.make || '',
        model: data.model || '',
        year: data.year || 0,
        vehicle_type: data.vehicle_type,
        capacity_kg: data.capacity_kg || undefined,
        fuel_type: data.fuel_type,
        baseline_mileage_kmpl: data.baseline_mileage_kmpl,
        current_odometer_km: data.current_odometer_km,
      });
      setLoading(false);
    }
    load();
  }, [vehicleId, reset, router]);

  async function onSubmit(data: VehicleFormData) {
    setServerError('');

    // Check unique reg (excluding current)
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('registration_number', data.registration_number)
      .neq('id', vehicleId)
      .maybeSingle();

    if (existing) {
      setServerError('A vehicle with this registration number already exists.');
      return;
    }

    const { error } = await supabase
      .from('vehicles')
      .update({
        registration_number: data.registration_number,
        make: data.make || null,
        model: data.model || null,
        year: data.year || null,
        vehicle_type: data.vehicle_type,
        capacity_kg: data.capacity_kg || null,
        fuel_type: data.fuel_type,
        baseline_mileage_kmpl: data.baseline_mileage_kmpl,
        current_odometer_km: data.current_odometer_km,
      })
      .eq('id', vehicleId);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push('/dashboard/vehicles');
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/vehicles" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Edit Vehicle</h2>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6"
      >
        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              {...register('registration_number')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.registration_number && (
              <p className="mt-1 text-xs text-red-600">{errors.registration_number.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Vehicle Type <span className="text-red-500">*</span></label>
            <select {...register('vehicle_type')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="truck">Truck</option>
              <option value="tempo">Tempo</option>
              <option value="trailer">Trailer</option>
              <option value="tanker">Tanker</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Fuel Type</label>
            <select {...register('fuel_type')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="diesel">Diesel</option>
              <option value="petrol">Petrol</option>
              <option value="cng">CNG</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Make</label>
            <input {...register('make')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Model</label>
            <input {...register('model')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Year</label>
            <input {...register('year')} type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Capacity (kg)</label>
            <input {...register('capacity_kg')} type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Baseline Mileage (km/L) <span className="text-red-500">*</span></label>
            <input {...register('baseline_mileage_kmpl')} type="number" step="0.1" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            {errors.baseline_mileage_kmpl && <p className="mt-1 text-xs text-red-600">{errors.baseline_mileage_kmpl.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Current Odometer (km)</label>
            <input {...register('current_odometer_km')} type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/vehicles" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
