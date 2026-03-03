'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { pdf } from '@react-pdf/renderer';
import { SalarySlipPdfDocument } from '@/components/salary-slip-pdf';
import type { DriverSalaryEntry, SalaryStatus } from '@fleetos/shared';
import { formatSalaryMonth } from '@fleetos/shared';
import {
  ArrowLeft, Loader2, Download, Share2, CheckCircle2,
  DollarSign, Clock,
} from 'lucide-react';

type SalaryWithDriver = DriverSalaryEntry & {
  driver: { name: string; phone: string } | null;
};

const STATUS_BADGE: Record<SalaryStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700' },
  paid: { bg: 'bg-green-100', text: 'text-green-700' },
};

export default function SalaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<SalaryWithDriver | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchEntry = useCallback(async () => {
    const { data } = await supabase
      .from('driver_salary_entries')
      .select('*, driver:driver_id(name, phone)')
      .eq('id', id)
      .single();

    if (data) {
      setEntry(data as SalaryWithDriver);
      // Fetch company name for PDF
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', data.company_id)
        .single();
      if (company) setCompanyName(company.name);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  async function handleApprove() {
    if (!entry) return;
    setSaving(true);
    await supabase
      .from('driver_salary_entries')
      .update({ status: 'approved' })
      .eq('id', id);
    setEntry({ ...entry, status: 'approved' });
    setSaving(false);
  }

  async function handleMarkPaid() {
    if (!entry) return;
    setSaving(true);
    const paidAt = new Date().toISOString();
    await supabase
      .from('driver_salary_entries')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', id);
    setEntry({ ...entry, status: 'paid', paid_at: paidAt });
    setSaving(false);
  }

  async function handleDownloadPdf() {
    if (!entry) return;
    setGenerating(true);

    const pdfData = {
      company_name: companyName,
      driver_name: entry.driver?.name ?? 'Unknown',
      driver_phone: entry.driver?.phone ?? '',
      month_display: formatSalaryMonth(entry.month),
      fixed_pay: entry.fixed_pay,
      trip_allowances: entry.trip_allowances,
      advances_deducted: entry.advances_deducted,
      other_deductions: entry.other_deductions,
      net_salary: entry.net_salary,
      status: entry.status,
      paid_at: entry.paid_at,
    };

    const blob = await pdf(<SalarySlipPdfDocument data={pdfData} />).toBlob();

    // Upload to Supabase Storage if not already
    if (!entry.slip_pdf_url) {
      const storagePath = `salary-slips/${entry.company_id}/${entry.driver_id}/${entry.month}.pdf`;
      await supabase.storage
        .from('documents')
        .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

      await supabase
        .from('driver_salary_entries')
        .update({ slip_pdf_url: urlData.publicUrl })
        .eq('id', id);

      setEntry({ ...entry, slip_pdf_url: urlData.publicUrl });
    }

    // Download locally
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Salary-${entry.driver?.name ?? 'driver'}-${entry.month}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
  }

  function handleShareWhatsApp() {
    if (!entry?.driver) return;
    const phone = entry.driver.phone.replace(/\D/g, '');
    const text = `Hi ${entry.driver.name}, your salary slip for ${formatSalaryMonth(entry.month)} is ready.\n\nNet Salary: Rs. ${entry.net_salary.toLocaleString('en-IN')}\nFixed Pay: Rs. ${entry.fixed_pay.toLocaleString('en-IN')}\nAllowances: Rs. ${entry.trip_allowances.toLocaleString('en-IN')}\nDeductions: Rs. ${(entry.advances_deducted + entry.other_deductions).toLocaleString('en-IN')}\n\nStatus: ${entry.status.toUpperCase()}`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entry) {
    return <div className="p-6 text-center text-text-muted">Salary entry not found.</div>;
  }

  const grossEarnings = entry.fixed_pay + entry.trip_allowances;
  const totalDeductions = entry.advances_deducted + entry.other_deductions;
  const badge = STATUS_BADGE[entry.status];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/salary" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-text-dark">
              {entry.driver?.name ?? 'Driver'} — {formatSalaryMonth(entry.month)}
            </h2>
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badge.bg} ${badge.text}`}>
              {entry.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Earnings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Earnings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Fixed Pay</span>
              <span className="font-medium text-text-dark">₹{entry.fixed_pay.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Trip Allowances</span>
              <span className="font-medium text-text-dark">₹{entry.trip_allowances.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Gross Earnings</span>
              <span className="text-green-600">₹{grossEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-text-dark">Deductions</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Advances Deducted</span>
              <span className="font-medium text-red-600">-₹{entry.advances_deducted.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Other Deductions</span>
              <span className="font-medium text-red-600">-₹{entry.other_deductions.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total Deductions</span>
              <span className="text-red-600">-₹{totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="rounded-xl border-2 border-primary bg-[#1A3C6E] p-6 text-center text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">Net Salary</p>
          <p className="mt-1 text-4xl font-bold">₹{entry.net_salary.toLocaleString('en-IN')}</p>
          {entry.paid_at && (
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-white/70">
              <Clock className="h-3 w-3" />
              Paid on {new Date(entry.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {entry.status === 'draft' && (
          <button
            onClick={handleApprove}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve Salary
          </button>
        )}

        {entry.status === 'approved' && (
          <button
            onClick={handleMarkPaid}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Mark as Paid
          </button>
        )}
      </div>
    </div>
  );
}
