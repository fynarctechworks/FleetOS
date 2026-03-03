'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lrSchema, type LRFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import { AddressSearch } from '@/components/address-search';
import { useAuthStore } from '@/lib/auth-store';
import type { Branch, AddressBook } from '@fleetos/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const GST_RATES = [0, 5, 12, 18];

const LOAD_TYPE_LABELS = {
  ftl: 'FTL — Full Truck Load',
  ltl: 'LTL — Part Load',
  parchutan: 'Parchutan — Per Article',
};

export default function NewLRPage() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [consignor, setConsignor] = useState<AddressBook | null>(null);
  const [consignee, setConsignee] = useState<AddressBook | null>(null);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LRFormData>({
    resolver: zodResolver(lrSchema),
    defaultValues: {
      gst_rate: 5,
      freight_amount: 0,
    },
  });

  // Watch freight and GST for live calculation
  const freightAmount = watch('freight_amount') || 0;
  const gstRate = watch('gst_rate') || 0;
  const gstAmount = Math.round(Number(freightAmount) * Number(gstRate)) / 100;
  const totalAmount = Number(freightAmount) + gstAmount;

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase
        .from('branches')
        .select('id, name, lr_prefix, lr_current_sequence, company_id, address, city, manager_user_id, is_active, created_at')
        .eq('is_active', true)
        .order('name');
      if (data) setBranches(data as Branch[]);
    }
    loadBranches();
  }, []);

  // Pre-select user's branch if assigned
  useEffect(() => {
    if (appUser?.branch_id) {
      setValue('branch_id', appUser.branch_id);
    }
  }, [appUser, setValue]);

  async function onSubmit(data: LRFormData) {
    setServerError('');

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setServerError('Not authenticated');
      return;
    }

    // Atomically generate LR number via RPC
    const { data: lrNumber, error: rpcError } = await supabase.rpc(
      'generate_lr_number',
      { p_branch_id: data.branch_id }
    );
    if (rpcError) {
      setServerError(`Failed to generate LR number: ${rpcError.message}`);
      return;
    }

    const computedGstAmount = Math.round(Number(data.freight_amount) * Number(data.gst_rate)) / 100;
    const computedTotal = Number(data.freight_amount) + computedGstAmount;

    const { data: inserted, error } = await supabase
      .from('lr_entries')
      .insert({
        branch_id: data.branch_id,
        lr_number: lrNumber as string,
        load_type: data.load_type,
        consignor_id: data.consignor_id,
        consignee_id: data.consignee_id,
        origin_city: data.origin_city,
        destination_city: data.destination_city,
        goods_description: data.goods_description || null,
        weight_kg: data.weight_kg || null,
        freight_amount: data.freight_amount,
        gst_rate: data.gst_rate,
        gst_amount: computedGstAmount,
        total_amount: computedTotal,
        ewb_number: data.ewb_number || null,
        ewb_expiry: data.ewb_expiry || null,
        notes: data.notes || null,
        status: 'booked',
        created_by: sessionData.session.user.id,
      })
      .select('id')
      .single();

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push(`/dashboard/lr/${inserted.id}/success`);
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/lr" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Create LR / Bilty</h2>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-3xl space-y-6"
      >
        {serverError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        {/* ── Section 1: Shipment Details ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Shipment Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Branch */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Branch <span className="text-red-500">*</span>
              </label>
              <select {...register('branch_id')} className={inputCls}>
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.lr_prefix})
                  </option>
                ))}
              </select>
              {errors.branch_id && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_id.message}</p>
              )}
            </div>

            {/* Load Type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Load Type <span className="text-red-500">*</span>
              </label>
              <select {...register('load_type')} className={inputCls}>
                <option value="">Select load type</option>
                {Object.entries(LOAD_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.load_type && (
                <p className="mt-1 text-xs text-red-600">{errors.load_type.message}</p>
              )}
            </div>

            {/* Origin City */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Origin City <span className="text-red-500">*</span>
              </label>
              <input
                {...register('origin_city')}
                placeholder="e.g. Vizag"
                className={inputCls}
              />
              {errors.origin_city && (
                <p className="mt-1 text-xs text-red-600">{errors.origin_city.message}</p>
              )}
            </div>

            {/* Destination City */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Destination City <span className="text-red-500">*</span>
              </label>
              <input
                {...register('destination_city')}
                placeholder="e.g. Hyderabad"
                className={inputCls}
              />
              {errors.destination_city && (
                <p className="mt-1 text-xs text-red-600">{errors.destination_city.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Parties ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Consignor & Consignee</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Consignor */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Consignor (Sender) <span className="text-red-500">*</span>
              </label>
              <Controller
                name="consignor_id"
                control={control}
                render={({ field }) => (
                  <AddressSearch
                    filterType="consignor"
                    placeholder="Search consignor (min 3 chars)..."
                    onSelect={(entry) => {
                      field.onChange(entry.id);
                      setConsignor(entry);
                    }}
                  />
                )}
              />
              {consignor && (
                <div className="mt-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                  {consignor.name}
                  {consignor.city ? ` · ${consignor.city}` : ''}
                  {consignor.gst_number ? ` · GST: ${consignor.gst_number}` : ''}
                </div>
              )}
              {errors.consignor_id && (
                <p className="mt-1 text-xs text-red-600">{errors.consignor_id.message}</p>
              )}
            </div>

            {/* Consignee */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Consignee (Receiver) <span className="text-red-500">*</span>
              </label>
              <Controller
                name="consignee_id"
                control={control}
                render={({ field }) => (
                  <AddressSearch
                    filterType="consignee"
                    placeholder="Search consignee (min 3 chars)..."
                    onSelect={(entry) => {
                      field.onChange(entry.id);
                      setConsignee(entry);
                    }}
                  />
                )}
              />
              {consignee && (
                <div className="mt-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs text-green-700">
                  {consignee.name}
                  {consignee.city ? ` · ${consignee.city}` : ''}
                  {consignee.gst_number ? ` · GST: ${consignee.gst_number}` : ''}
                </div>
              )}
              {errors.consignee_id && (
                <p className="mt-1 text-xs text-red-600">{errors.consignee_id.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 3: Cargo ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Cargo Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Goods Description
              </label>
              <input
                {...register('goods_description')}
                placeholder="e.g. Steel Pipes, 50 bundles"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Weight (kg)</label>
              <input
                {...register('weight_kg')}
                type="number"
                step="0.01"
                placeholder="1000"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── Section 4: Freight & GST ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Freight & GST</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Freight Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Freight Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('freight_amount')}
                type="number"
                step="0.01"
                placeholder="15000"
                className={inputCls}
              />
              {errors.freight_amount && (
                <p className="mt-1 text-xs text-red-600">{errors.freight_amount.message}</p>
              )}
            </div>

            {/* GST Rate */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                GST Rate <span className="text-red-500">*</span>
              </label>
              <select {...register('gst_rate')} className={inputCls}>
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-calculated totals */}
            <div className="sm:col-span-2 rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex justify-between text-sm text-text-muted">
                <span>Freight</span>
                <span>₹{Number(freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-text-muted mt-1">
                <span>GST ({gstRate}%)</span>
                <span>₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-text-dark">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 5: E-Way Bill (Optional) ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-1 text-base font-semibold text-text-dark">E-Way Bill</h3>
          <p className="mb-4 text-xs text-text-muted">Optional — enter if you have an EWB number</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">EWB Number</label>
              <input
                {...register('ewb_number')}
                placeholder="121234567890"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">EWB Expiry</label>
              <input {...register('ewb_expiry')} type="datetime-local" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Section 6: Notes ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Notes</h3>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any special instructions or notes..."
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Link
            href="/dashboard/lr"
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
            Create LR
          </button>
        </div>
      </form>
    </div>
  );
}
