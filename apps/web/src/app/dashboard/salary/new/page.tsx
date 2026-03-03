'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { salarySchema, type SalaryFormData } from '@/lib/validations';
import { calculateNetSalary, getCurrentMonth } from '@fleetos/shared';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface DriverOption {
  id: string;
  name: string;
  phone: string;
  fixed_salary: number;
}

export default function NewSalaryPage() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [serverError, setServerError] = useState('');
  const [liveNet, setLiveNet] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SalaryFormData>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      month: getCurrentMonth(),
      fixed_pay: 0,
      trip_allowances: 0,
      advances_deducted: 0,
      other_deductions: 0,
    },
  });

  // Watch all salary fields for live net calculation
  const watchedFields = watch(['fixed_pay', 'trip_allowances', 'advances_deducted', 'other_deductions']);
  useEffect(() => {
    const [fp, ta, ad, od] = watchedFields;
    setLiveNet(calculateNetSalary({
      fixed_pay: fp || 0,
      trip_allowances: ta || 0,
      advances_deducted: ad || 0,
      other_deductions: od || 0,
    }));
  }, [watchedFields]);

  // Fetch drivers
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('drivers')
        .select('id, name, phone, fixed_salary')
        .eq('is_active', true)
        .order('name');
      setDrivers((data as DriverOption[]) ?? []);
    }
    load();
  }, []);

  // When driver changes, auto-fill fixed_pay
  const selectedDriverId = watch('driver_id');
  useEffect(() => {
    if (selectedDriverId) {
      const driver = drivers.find((d) => d.id === selectedDriverId);
      if (driver) {
        setValue('fixed_pay', driver.fixed_salary);
      }
    }
  }, [selectedDriverId, drivers, setValue]);

  // Auto-calculate trip allowances from completed trips
  const selectedMonth = watch('month');
  useEffect(() => {
    if (!selectedDriverId || !selectedMonth) return;
    async function fetchAllowances() {
      const startDate = `${selectedMonth}-01`;
      const endParts = selectedMonth.split('-');
      const year = Number(endParts[0]);
      const month = Number(endParts[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data } = await supabase
        .from('trips')
        .select('total_driver_allowance')
        .eq('driver_id', selectedDriverId)
        .eq('status', 'completed')
        .gte('completed_at', `${startDate}T00:00:00`)
        .lte('completed_at', `${endDate}T23:59:59`);

      const total = (data ?? []).reduce(
        (sum: number, t: { total_driver_allowance: number }) => sum + (t.total_driver_allowance || 0),
        0
      );
      setValue('trip_allowances', total);
    }
    fetchAllowances();
  }, [selectedDriverId, selectedMonth, setValue]);

  async function onSubmit(data: SalaryFormData) {
    setServerError('');

    const { error } = await supabase.from('driver_salary_entries').insert({
      company_id: appUser?.company_id,
      driver_id: data.driver_id,
      month: data.month,
      fixed_pay: data.fixed_pay,
      trip_allowances: data.trip_allowances,
      advances_deducted: data.advances_deducted,
      other_deductions: data.other_deductions,
      status: 'draft',
    });

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setServerError('A salary entry already exists for this driver for this month.');
      } else {
        setServerError(error.message);
      }
      return;
    }

    router.push('/dashboard/salary');
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/salary" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">Create Salary Entry</h2>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
        {/* Driver & Month */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Driver & Period</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                {...register('driver_id')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
              {errors.driver_id && <p className="mt-1 text-xs text-red-500">{errors.driver_id.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Month <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                {...register('month')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.month && <p className="mt-1 text-xs text-red-500">{errors.month.message}</p>}
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Earnings</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Fixed Pay (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                {...register('fixed_pay')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-muted">Auto-filled from driver&apos;s fixed salary</p>
              {errors.fixed_pay && <p className="mt-1 text-xs text-red-500">{errors.fixed_pay.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Trip Allowances (₹)</label>
              <input
                type="number"
                step="1"
                {...register('trip_allowances')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-muted">Auto-calculated from completed trips this month</p>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Deductions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Advances Deducted (₹)</label>
              <input
                type="number"
                step="1"
                {...register('advances_deducted')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Other Deductions (₹)</label>
              <input
                type="number"
                step="1"
                {...register('other_deductions')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Live Net Salary */}
        <div className={`rounded-xl border-2 p-6 text-center ${liveNet >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Net Salary</p>
          <p className={`mt-1 text-3xl font-bold ${liveNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{liveNet.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-text-muted">Fixed Pay + Allowances − Deductions</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save as Draft
        </button>
      </form>
    </div>
  );
}
