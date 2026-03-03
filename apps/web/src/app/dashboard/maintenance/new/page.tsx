'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceSchema, type MaintenanceFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import type { Vehicle, ServiceType } from '@fleetos/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'brake', label: 'Brake Service' },
  { value: 'clutch', label: 'Clutch Repair' },
  { value: 'battery', label: 'Battery' },
  { value: 'tyre', label: 'Tyre Service' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'body', label: 'Body Work' },
  { value: 'other', label: 'Other' },
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serverError, setServerError] = useState('');

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      cost: 0,
      odometer_at_service: 0,
      serviced_at: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedVehicleId = watch('vehicle_id');

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('vehicles').select('*').eq('is_active', true).order('registration_number');
    if (data) setVehicles(data as Vehicle[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (selectedVehicleId) {
      const v = vehicles.find((v) => v.id === selectedVehicleId);
      if (v) setValue('odometer_at_service', v.current_odometer_km);
    }
  }, [selectedVehicleId, vehicles, setValue]);

  async function onSubmit(data: MaintenanceFormData) {
    setServerError('');

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setServerError('Not authenticated'); return; }

    const { error } = await supabase.from('maintenance_records').insert({
      vehicle_id: data.vehicle_id,
      service_type: data.service_type,
      description: data.description || null,
      cost: data.cost,
      odometer_at_service: data.odometer_at_service,
      next_service_km: data.next_service_km || null,
      next_service_date: data.next_service_date || null,
      workshop_name: data.workshop_name || null,
      workshop_phone: data.workshop_phone || null,
      photos: [],
      serviced_at: data.serviced_at,
      created_by: session.session.user.id,
    });

    if (error) { setServerError(error.message); return; }

    // Recompute vehicle health score
    await supabase.rpc('compute_vehicle_health_score', { p_vehicle_id: data.vehicle_id });

    // Update vehicle odometer if service odometer is higher
    const v = vehicles.find((v) => v.id === data.vehicle_id);
    if (v && data.odometer_at_service > v.current_odometer_km) {
      await supabase.from('vehicles').update({ current_odometer_km: data.odometer_at_service }).eq('id', data.vehicle_id);
    }

    router.push('/dashboard/maintenance');
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/maintenance" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Add Service Entry</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Vehicle <span className="text-red-500">*</span></label>
              <select {...register('vehicle_id')} className={inputCls}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
              {errors.vehicle_id && <p className="mt-1 text-xs text-red-600">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Service Type <span className="text-red-500">*</span></label>
              <select {...register('service_type')} className={inputCls}>
                <option value="">Select type</option>
                {SERVICE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {errors.service_type && <p className="mt-1 text-xs text-red-600">{errors.service_type.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-dark">Description</label>
              <input {...register('description')} placeholder="e.g. Full engine oil replacement" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Cost (₹) <span className="text-red-500">*</span></label>
              <input {...register('cost')} type="number" step="1" className={inputCls} />
              {errors.cost && <p className="mt-1 text-xs text-red-600">{errors.cost.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Odometer (km) <span className="text-red-500">*</span></label>
              <input {...register('odometer_at_service')} type="number" className={inputCls} />
              {errors.odometer_at_service && <p className="mt-1 text-xs text-red-600">{errors.odometer_at_service.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Service Date <span className="text-red-500">*</span></label>
              <input {...register('serviced_at')} type="date" className={inputCls} />
              {errors.serviced_at && <p className="mt-1 text-xs text-red-600">{errors.serviced_at.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Next Service (km)</label>
              <input {...register('next_service_km')} type="number" placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Next Service Date</label>
              <input {...register('next_service_date')} type="date" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Workshop Name</label>
              <input {...register('workshop_name')} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Workshop Phone</label>
              <input {...register('workshop_phone')} placeholder="Optional" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Link href="/dashboard/maintenance" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Entry
          </button>
        </div>
      </form>
    </div>
  );
}
