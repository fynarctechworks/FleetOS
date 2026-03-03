'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dieselEntrySchema, type DieselEntryFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { validateOdometer } from '@fleetos/shared';
import type { Vehicle, Driver, Trip } from '@fleetos/shared';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';

export default function NewDieselEntryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <NewDieselEntryForm />
    </Suspense>
  );
}

function NewDieselEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [serverError, setServerError] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const prefilledTripId = searchParams.get('trip_id') || '';
  const prefilledVehicleId = searchParams.get('vehicle_id') || '';
  const prefilledDriverId = searchParams.get('driver_id') || '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DieselEntryFormData>({
    resolver: zodResolver(dieselEntrySchema),
    defaultValues: {
      trip_id: prefilledTripId,
      vehicle_id: prefilledVehicleId,
      driver_id: prefilledDriverId,
      litres: 0,
      price_per_litre: 0,
      odometer_at_fill: 0,
      filled_at: new Date().toISOString().slice(0, 16),
    },
  });

  const selectedVehicleId = watch('vehicle_id');
  const litres = watch('litres') || 0;
  const pricePerLitre = watch('price_per_litre') || 0;
  const totalCost = Math.round(Number(litres) * Number(pricePerLitre) * 100) / 100;

  const loadData = useCallback(async () => {
    const [vehicleRes, driverRes, tripRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('is_active', true).order('registration_number'),
      supabase.from('drivers').select('*').eq('is_active', true).order('name'),
      supabase.from('trips').select('*').in('status', ['planned', 'departed', 'in_transit']).order('created_at', { ascending: false }),
    ]);
    if (vehicleRes.data) setVehicles(vehicleRes.data as Vehicle[]);
    if (driverRes.data) setDrivers(driverRes.data as Driver[]);
    if (tripRes.data) setTrips(tripRes.data as Trip[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-fill odometer from vehicle
  useEffect(() => {
    if (selectedVehicleId && !prefilledVehicleId) {
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (vehicle) {
        setValue('odometer_at_fill', vehicle.current_odometer_km);
      }
    }
  }, [selectedVehicleId, vehicles, setValue, prefilledVehicleId]);

  async function onSubmit(data: DieselEntryFormData) {
    setServerError('');

    // Validate odometer
    const vehicle = vehicles.find((v) => v.id === data.vehicle_id);
    if (vehicle && !validateOdometer(data.odometer_at_fill, vehicle.current_odometer_km)) {
      setServerError(`Odometer reading (${data.odometer_at_fill}) cannot be less than vehicle's current odometer (${vehicle.current_odometer_km})`);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setServerError('Not authenticated');
      return;
    }

    let receiptUrl: string | null = null;

    // Upload receipt photo if provided
    if (receiptFile) {
      setUploading(true);
      const ext = receiptFile.name.split('.').pop();
      const path = `diesel-receipts/${data.trip_id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, receiptFile, { upsert: false });

      if (uploadError) {
        setServerError(`Receipt upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      receiptUrl = urlData.publicUrl;
      setUploading(false);
    }

    const computedTotal = Math.round(Number(data.litres) * Number(data.price_per_litre) * 100) / 100;

    const { error } = await supabase.from('diesel_entries').insert({
      trip_id: data.trip_id,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      litres: data.litres,
      price_per_litre: data.price_per_litre,
      total_cost: computedTotal,
      station_name: data.station_name || null,
      odometer_at_fill: data.odometer_at_fill,
      receipt_photo_url: receiptUrl,
      filled_at: data.filled_at,
      entered_by: sessionData.session.user.id,
      is_theft_flagged: false,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    // Update vehicle's current_odometer_km
    if (vehicle && data.odometer_at_fill > vehicle.current_odometer_km) {
      await supabase
        .from('vehicles')
        .update({ current_odometer_km: data.odometer_at_fill })
        .eq('id', data.vehicle_id);
    }

    // Navigate back to trip detail or diesel list
    if (prefilledTripId) {
      router.push(`/dashboard/trips/${prefilledTripId}`);
    } else {
      router.push('/dashboard/diesel');
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/diesel" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Add Diesel Entry</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        {/* Section 1: Assignment */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Assignment</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Trip <span className="text-red-500">*</span>
              </label>
              <select {...register('trip_id')} className={inputCls}>
                <option value="">Select trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trip_number} ({t.origin_city} → {t.destination_city})
                  </option>
                ))}
              </select>
              {errors.trip_id && <p className="mt-1 text-xs text-red-600">{errors.trip_id.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select {...register('vehicle_id')} className={inputCls}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration_number}</option>
                ))}
              </select>
              {errors.vehicle_id && <p className="mt-1 text-xs text-red-600">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Driver <span className="text-red-500">*</span>
              </label>
              <select {...register('driver_id')} className={inputCls}>
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.driver_id && <p className="mt-1 text-xs text-red-600">{errors.driver_id.message}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Fill Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Fill Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Litres <span className="text-red-500">*</span>
              </label>
              <input {...register('litres')} type="number" step="0.01" placeholder="50" className={inputCls} />
              {errors.litres && <p className="mt-1 text-xs text-red-600">{errors.litres.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Price per Litre (₹) <span className="text-red-500">*</span>
              </label>
              <input {...register('price_per_litre')} type="number" step="0.01" placeholder="89.50" className={inputCls} />
              {errors.price_per_litre && <p className="mt-1 text-xs text-red-600">{errors.price_per_litre.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Odometer at Fill (km) <span className="text-red-500">*</span>
              </label>
              <input {...register('odometer_at_fill')} type="number" step="1" className={inputCls} />
              {errors.odometer_at_fill && <p className="mt-1 text-xs text-red-600">{errors.odometer_at_fill.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Station Name</label>
              <input {...register('station_name')} placeholder="e.g. HP Petrol Pump, NH16" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Fill Date & Time <span className="text-red-500">*</span>
              </label>
              <input {...register('filled_at')} type="datetime-local" className={inputCls} />
              {errors.filled_at && <p className="mt-1 text-xs text-red-600">{errors.filled_at.message}</p>}
            </div>

            {/* Total Cost (computed) */}
            <div className="flex items-end">
              <div className="w-full rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-text-muted">Total Cost</p>
                <p className="text-lg font-bold text-text-dark">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Receipt Photo */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Receipt Photo</h3>
          <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-primary hover:bg-blue-50">
            <Upload className="mb-2 h-8 w-8 text-text-muted" />
            <span className="text-sm text-text-muted">
              {receiptFile ? receiptFile.name : 'Click to upload receipt photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Link
            href={prefilledTripId ? `/dashboard/trips/${prefilledTripId}` : '/dashboard/diesel'}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {(isSubmitting || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Diesel Entry
          </button>
        </div>
      </form>
    </div>
  );
}
