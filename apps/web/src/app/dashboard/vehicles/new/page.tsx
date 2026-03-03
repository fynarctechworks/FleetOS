'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema, type VehicleFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewVehiclePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      fuel_type: 'diesel',
      baseline_mileage_kmpl: 4,
      current_odometer_km: 0,
    },
  });

  async function onSubmit(data: VehicleFormData) {
    setServerError('');

    // Check unique registration
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('registration_number', data.registration_number)
      .maybeSingle();

    if (existing) {
      setServerError('A vehicle with this registration number already exists.');
      return;
    }

    const { error } = await supabase.from('vehicles').insert({
      registration_number: data.registration_number,
      make: data.make || null,
      model: data.model || null,
      year: data.year || null,
      vehicle_type: data.vehicle_type,
      capacity_kg: data.capacity_kg || null,
      fuel_type: data.fuel_type,
      baseline_mileage_kmpl: data.baseline_mileage_kmpl,
      current_odometer_km: data.current_odometer_km,
      health_score: 100,
      is_active: true,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push('/dashboard/vehicles');
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/vehicles" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Add Vehicle</h2>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6"
      >
        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Registration Number */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              {...register('registration_number')}
              placeholder="AP09AB1234"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.registration_number && (
              <p className="mt-1 text-xs text-red-600">{errors.registration_number.message}</p>
            )}
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('vehicle_type')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select type</option>
              <option value="truck">Truck</option>
              <option value="tempo">Tempo</option>
              <option value="trailer">Trailer</option>
              <option value="tanker">Tanker</option>
            </select>
            {errors.vehicle_type && (
              <p className="mt-1 text-xs text-red-600">{errors.vehicle_type.message}</p>
            )}
          </div>

          {/* Fuel Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Fuel Type</label>
            <select
              {...register('fuel_type')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="diesel">Diesel</option>
              <option value="petrol">Petrol</option>
              <option value="cng">CNG</option>
            </select>
          </div>

          {/* Make */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Make</label>
            <input
              {...register('make')}
              placeholder="Tata, Ashok Leyland, etc."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Model */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Model</label>
            <input
              {...register('model')}
              placeholder="e.g. 407, 2518"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Year */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Year</label>
            <input
              {...register('year')}
              type="number"
              placeholder="2022"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
          </div>

          {/* Capacity */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">Capacity (kg)</label>
            <input
              {...register('capacity_kg')}
              type="number"
              placeholder="9000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Baseline Mileage */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Baseline Mileage (km/L) <span className="text-red-500">*</span>
            </label>
            <input
              {...register('baseline_mileage_kmpl')}
              type="number"
              step="0.1"
              placeholder="4.0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.baseline_mileage_kmpl && (
              <p className="mt-1 text-xs text-red-600">{errors.baseline_mileage_kmpl.message}</p>
            )}
          </div>

          {/* Current Odometer */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-dark">
              Current Odometer (km)
            </label>
            <input
              {...register('current_odometer_km')}
              type="number"
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/dashboard/vehicles"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Vehicle
          </button>
        </div>
      </form>
    </div>
  );
}
