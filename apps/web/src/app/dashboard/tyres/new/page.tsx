'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tyreSchema, type TyreFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import type { Vehicle, TyrePosition } from '@fleetos/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const POSITION_OPTIONS: { value: TyrePosition; label: string }[] = [
  { value: 'fl', label: 'Front Left' },
  { value: 'fr', label: 'Front Right' },
  { value: 'rl', label: 'Rear Left' },
  { value: 'rr', label: 'Rear Right' },
  { value: 'spare', label: 'Spare' },
];

export default function NewTyrePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serverError, setServerError] = useState('');

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<TyreFormData>({
    resolver: zodResolver(tyreSchema),
    defaultValues: {
      odometer_at_fitment: 0,
      expected_life_km: 50000,
      is_retreaded: false,
      fitment_date: new Date().toISOString().slice(0, 10),
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
      if (v) setValue('odometer_at_fitment', v.current_odometer_km);
    }
  }, [selectedVehicleId, vehicles, setValue]);

  async function onSubmit(data: TyreFormData) {
    setServerError('');

    const { error } = await supabase.from('tyre_records').insert({
      vehicle_id: data.vehicle_id,
      brand: data.brand || null,
      serial_number: data.serial_number || null,
      position: data.position,
      fitment_date: data.fitment_date,
      odometer_at_fitment: data.odometer_at_fitment,
      expected_life_km: data.expected_life_km,
      current_km: 0,
      is_retreaded: data.is_retreaded,
      purchase_cost: data.purchase_cost || null,
      status: 'active',
    });

    if (error) { setServerError(error.message); return; }
    router.push('/dashboard/tyres');
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/tyres" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Add Tyre</h2>
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
              <label className="mb-1 block text-sm font-medium text-text-dark">Position <span className="text-red-500">*</span></label>
              <select {...register('position')} className={inputCls}>
                <option value="">Select position</option>
                {POSITION_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {errors.position && <p className="mt-1 text-xs text-red-600">{errors.position.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Brand</label>
              <input {...register('brand')} placeholder="e.g. MRF, CEAT" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Serial Number</label>
              <input {...register('serial_number')} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Fitment Date <span className="text-red-500">*</span></label>
              <input {...register('fitment_date')} type="date" className={inputCls} />
              {errors.fitment_date && <p className="mt-1 text-xs text-red-600">{errors.fitment_date.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Odometer at Fitment (km) <span className="text-red-500">*</span></label>
              <input {...register('odometer_at_fitment')} type="number" className={inputCls} />
              {errors.odometer_at_fitment && <p className="mt-1 text-xs text-red-600">{errors.odometer_at_fitment.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Expected Life (km) <span className="text-red-500">*</span></label>
              <input {...register('expected_life_km')} type="number" className={inputCls} />
              {errors.expected_life_km && <p className="mt-1 text-xs text-red-600">{errors.expected_life_km.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Purchase Cost (₹)</label>
              <input {...register('purchase_cost')} type="number" placeholder="Optional" className={inputCls} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input {...register('is_retreaded')} type="checkbox" id="is_retreaded" className="h-4 w-4 rounded border-gray-300" />
              <label htmlFor="is_retreaded" className="text-sm text-text-dark">This is a retreaded tyre</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Link href="/dashboard/tyres" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-gray-50">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Tyre
          </button>
        </div>
      </form>
    </div>
  );
}
