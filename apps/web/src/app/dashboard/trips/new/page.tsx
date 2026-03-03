'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tripSchema, type TripFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import type { Branch, Vehicle, Driver } from '@fleetos/shared';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NewTripPage() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      stopovers: [],
      odometer_start: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stopovers',
  });

  const selectedVehicleId = watch('vehicle_id');

  // Auto-fill odometer from selected vehicle
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (vehicle) {
        setValue('odometer_start', vehicle.current_odometer_km);
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  const loadData = useCallback(async () => {
    const [branchRes, vehicleRes, driverRes] = await Promise.all([
      supabase.from('branches').select('*').eq('is_active', true).order('name'),
      supabase.from('vehicles').select('*').eq('is_active', true).order('registration_number'),
      supabase.from('drivers').select('*').eq('is_active', true).order('name'),
    ]);
    if (branchRes.data) setBranches(branchRes.data as Branch[]);
    if (vehicleRes.data) setVehicles(vehicleRes.data as Vehicle[]);
    if (driverRes.data) setDrivers(driverRes.data as Driver[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (appUser?.branch_id) {
      setValue('branch_id', appUser.branch_id);
    }
  }, [appUser, setValue]);

  async function onSubmit(data: TripFormData) {
    setServerError('');

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setServerError('Not authenticated');
      return;
    }

    // Get company_id from JWT
    const companyId = sessionData.session.user.user_metadata?.company_id
      || (sessionData.session as unknown as { access_token: string }).access_token;

    // Generate trip number atomically
    const { data: tripNumber, error: rpcError } = await supabase.rpc(
      'generate_trip_number',
      { p_company_id: sessionData.session.user.user_metadata?.company_id }
    );
    if (rpcError) {
      setServerError(`Failed to generate trip number: ${rpcError.message}`);
      return;
    }

    const { data: inserted, error } = await supabase
      .from('trips')
      .insert({
        branch_id: data.branch_id,
        trip_number: tripNumber as string,
        status: 'planned',
        vehicle_id: data.vehicle_id,
        driver_id: data.driver_id,
        origin_city: data.origin_city,
        destination_city: data.destination_city,
        stopovers: data.stopovers,
        planned_departure: data.planned_departure,
        odometer_start: data.odometer_start,
        total_revenue: 0,
        total_diesel_cost: 0,
        total_toll_cost: 0,
        total_driver_allowance: 0,
        total_loading_cost: 0,
        total_misc_cost: 0,
        net_profit: 0,
        is_loss_flagged: false,
        created_by: sessionData.session.user.id,
      })
      .select('id')
      .single();

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push(`/dashboard/trips/${inserted.id}`);
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/trips" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Create Trip</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        {/* Section 1: Route */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Route Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Branch <span className="text-red-500">*</span>
              </label>
              <select {...register('branch_id')} className={inputCls}>
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.branch_id && <p className="mt-1 text-xs text-red-600">{errors.branch_id.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Planned Departure <span className="text-red-500">*</span>
              </label>
              <input {...register('planned_departure')} type="datetime-local" className={inputCls} />
              {errors.planned_departure && <p className="mt-1 text-xs text-red-600">{errors.planned_departure.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Origin City <span className="text-red-500">*</span>
              </label>
              <input {...register('origin_city')} placeholder="e.g. Vizag" className={inputCls} />
              {errors.origin_city && <p className="mt-1 text-xs text-red-600">{errors.origin_city.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Destination City <span className="text-red-500">*</span>
              </label>
              <input {...register('destination_city')} placeholder="e.g. Hyderabad" className={inputCls} />
              {errors.destination_city && <p className="mt-1 text-xs text-red-600">{errors.destination_city.message}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Stopovers */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-dark">Stopovers</h3>
            <button
              type="button"
              onClick={() => append({ city: '', expected_arrival: '' })}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add Stop
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-text-muted">No stopovers — direct route.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <input
                      {...register(`stopovers.${index}.city`)}
                      placeholder="City name"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      {...register(`stopovers.${index}.expected_arrival`)}
                      type="datetime-local"
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-1.5 rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Vehicle & Driver */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Vehicle & Driver</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select {...register('vehicle_id')} className={inputCls}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} ({v.vehicle_type})
                  </option>
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
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
              {errors.driver_id && <p className="mt-1 text-xs text-red-600">{errors.driver_id.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Odometer Start (km) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('odometer_start')}
                type="number"
                step="1"
                className={inputCls}
              />
              {errors.odometer_start && <p className="mt-1 text-xs text-red-600">{errors.odometer_start.message}</p>}
              {selectedVehicleId && (
                <p className="mt-1 text-xs text-text-muted">
                  Auto-filled from vehicle's current odometer
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Link
            href="/dashboard/trips"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Trip
          </button>
        </div>
      </form>
    </div>
  );
}
