'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { complianceDocSchema, type ComplianceDocFormData } from '@/lib/validations';
import { supabase } from '@/lib/supabase';
import type { Vehicle, Driver, DocType } from '@fleetos/shared';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'puc', label: 'PUC' },
  { value: 'fitness', label: 'Fitness Certificate' },
  { value: 'national_permit', label: 'National Permit' },
  { value: 'state_permit', label: 'State Permit' },
  { value: 'driver_licence', label: 'Driver Licence' },
];

export default function NewComplianceDocPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ComplianceDocForm />
    </Suspense>
  );
}

function ComplianceDocForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serverError, setServerError] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComplianceDocFormData>({
    resolver: zodResolver(complianceDocSchema),
  });

  const entityType = watch('entity_type');

  const loadData = useCallback(async () => {
    const [vRes, dRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('is_active', true).order('registration_number'),
      supabase.from('drivers').select('*').eq('is_active', true).order('name'),
    ]);
    if (vRes.data) setVehicles(vRes.data as Vehicle[]);
    if (dRes.data) setDrivers(dRes.data as Driver[]);

    // Load existing document for edit
    if (editId) {
      const { data: doc } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('id', editId)
        .single();
      if (doc) {
        reset({
          entity_type: doc.entity_type,
          entity_id: doc.entity_id,
          doc_type: doc.doc_type,
          doc_number: doc.doc_number ?? '',
          issued_date: doc.issued_date ?? '',
          expiry_date: doc.expiry_date,
        });
      }
    }
  }, [editId, reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onSubmit(data: ComplianceDocFormData) {
    setServerError('');

    let documentUrl: string | null = null;

    if (docFile) {
      const ext = docFile.name.split('.').pop();
      const path = `compliance/${data.entity_id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('compliance-docs')
        .upload(path, docFile, { upsert: false });

      if (uploadError) {
        setServerError(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from('compliance-docs').getPublicUrl(path);
      documentUrl = urlData.publicUrl;
    }

    if (editId) {
      // Update existing
      const updates: Record<string, unknown> = {
        expiry_date: data.expiry_date,
        doc_number: data.doc_number || null,
        issued_date: data.issued_date || null,
        renewal_status: 'renewed',
        alert_sent_30: false,
        alert_sent_15: false,
        alert_sent_7: false,
      };
      if (documentUrl) updates.document_url = documentUrl;

      const { error } = await supabase
        .from('compliance_documents')
        .update(updates)
        .eq('id', editId);

      if (error) { setServerError(error.message); return; }
    } else {
      // Insert new
      const { error } = await supabase.from('compliance_documents').insert({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        doc_type: data.doc_type,
        doc_number: data.doc_number || null,
        issued_date: data.issued_date || null,
        expiry_date: data.expiry_date,
        status: 'valid',
        renewal_status: 'none',
        document_url: documentUrl,
        alert_sent_30: false,
        alert_sent_15: false,
        alert_sent_7: false,
      });

      if (error) { setServerError(error.message); return; }
    }

    router.push('/dashboard/compliance');
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/compliance" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <h2 className="text-2xl font-bold text-text-dark">
          {editId ? 'Edit Document' : 'Add Compliance Document'}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Entity Type <span className="text-red-500">*</span>
              </label>
              <select {...register('entity_type')} className={inputCls} disabled={!!editId}>
                <option value="">Select type</option>
                <option value="vehicle">Vehicle</option>
                <option value="driver">Driver</option>
              </select>
              {errors.entity_type && <p className="mt-1 text-xs text-red-600">{errors.entity_type.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                {entityType === 'driver' ? 'Driver' : 'Vehicle'} <span className="text-red-500">*</span>
              </label>
              <select {...register('entity_id')} className={inputCls} disabled={!!editId}>
                <option value="">Select {entityType === 'driver' ? 'driver' : 'vehicle'}</option>
                {entityType === 'driver'
                  ? drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                  : vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)
                }
              </select>
              {errors.entity_id && <p className="mt-1 text-xs text-red-600">{errors.entity_id.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select {...register('doc_type')} className={inputCls} disabled={!!editId}>
                <option value="">Select type</option>
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.doc_type && <p className="mt-1 text-xs text-red-600">{errors.doc_type.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Document Number</label>
              <input {...register('doc_number')} placeholder="e.g. INS-123456" className={inputCls} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">Issued Date</label>
              <input {...register('issued_date')} type="date" className={inputCls} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-dark">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input {...register('expiry_date')} type="date" className={inputCls} />
              {errors.expiry_date && <p className="mt-1 text-xs text-red-600">{errors.expiry_date.message}</p>}
            </div>
          </div>

          {/* Document Upload */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-text-dark">Document File</label>
            <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-primary hover:bg-blue-50">
              <Upload className="mb-1 h-6 w-6 text-text-muted" />
              <span className="text-sm text-text-muted">
                {docFile ? docFile.name : 'Click to upload document'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Link
            href="/dashboard/compliance"
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
            {editId ? 'Update Document' : 'Add Document'}
          </button>
        </div>
      </form>
    </div>
  );
}
