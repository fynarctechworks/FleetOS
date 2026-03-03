'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pdf } from '@react-pdf/renderer';
import { LRPdfDocument } from '@/components/lr-pdf';
import type { LREntry, AddressBook, LRStatus } from '@fleetos/shared';
import {
  ArrowLeft,
  Loader2,
  Download,
  MessageCircle,
  Upload,
  Camera,
  CheckCircle,
  Copy,
  Share2,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

interface LRWithParties extends LREntry {
  consignor: AddressBook;
  consignee: AddressBook;
}

const ALL_STATUSES: { key: LRStatus; label: string }[] = [
  { key: 'booked', label: 'Booked' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'pod_uploaded', label: 'POD Uploaded' },
  { key: 'billed', label: 'Billed' },
  { key: 'payment_received', label: 'Paid' },
];

function StatusTimeline({ currentStatus }: { currentStatus: LRStatus }) {
  const currentIdx = ALL_STATUSES.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {ALL_STATUSES.map((status, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={status.key} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium ${
                  isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 bg-white text-text-muted'
                } ${isCurrent ? 'ring-2 ring-green-200' : ''}`}
              >
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`mt-1 whitespace-nowrap text-[10px] font-medium ${
                  isCurrent ? 'text-green-700' : isCompleted ? 'text-green-600' : 'text-text-muted'
                }`}
              >
                {status.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < ALL_STATUSES.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-8 ${
                  idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lrId = params.id as string;
  const [lr, setLr] = useState<LRWithParties | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('lr_entries')
        .select(`*, consignor:consignor_id(*), consignee:consignee_id(*)`)
        .eq('id', lrId)
        .single();

      if (error || !data) {
        router.push('/dashboard/lr');
        return;
      }
      setLr(data as unknown as LRWithParties);
      setLoading(false);
    }
    load();
  }, [lrId, router]);

  async function handleUploadPOD(e: React.ChangeEvent<HTMLInputElement>) {
    if (!lr || !e.target.files?.[0]) return;
    setUploading(true);

    const file = e.target.files[0];
    const filePath = `pod/${lr.company_id}/${lr.id}.${file.name.split('.').pop()}`;

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

    await supabase
      .from('lr_entries')
      .update({
        pod_photo_url: urlData.publicUrl,
        pod_uploaded_at: new Date().toISOString(),
        status: 'pod_uploaded',
      })
      .eq('id', lr.id);

    setLr({
      ...lr,
      pod_photo_url: urlData.publicUrl,
      pod_uploaded_at: new Date().toISOString(),
      status: 'pod_uploaded',
    });
    setUploading(false);
  }

  async function handleDownloadPdf() {
    if (!lr) return;
    setGenerating(true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingUrl = `${appUrl}/track/${lr.tracking_token}`;
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 200, margin: 1 });

    const pdfData = {
      lr_number: lr.lr_number,
      load_type: lr.load_type,
      origin_city: lr.origin_city,
      destination_city: lr.destination_city,
      goods_description: lr.goods_description,
      weight_kg: lr.weight_kg,
      freight_amount: lr.freight_amount,
      gst_rate: lr.gst_rate,
      gst_amount: lr.gst_amount,
      total_amount: lr.total_amount,
      ewb_number: lr.ewb_number,
      notes: lr.notes,
      created_at: lr.created_at,
      consignor_name: lr.consignor.name,
      consignor_address: [lr.consignor.address_line1, lr.consignor.city, lr.consignor.state].filter(Boolean).join(', '),
      consignor_gst: lr.consignor.gst_number || '',
      consignee_name: lr.consignee.name,
      consignee_address: [lr.consignee.address_line1, lr.consignee.city, lr.consignee.state].filter(Boolean).join(', '),
      consignee_gst: lr.consignee.gst_number || '',
      tracking_url: trackingUrl,
      qr_data_url: qrDataUrl,
    };

    const blob = await pdf(<LRPdfDocument data={pdfData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LR-${lr.lr_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
  }

  function getTrackingUrl() {
    if (!lr) return '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${appUrl}/track/${lr.tracking_token}`;
  }

  async function handleCopyLink() {
    const url = getTrackingUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareWhatsApp() {
    if (!lr) return;
    const url = getTrackingUrl();
    const text = `Track your shipment LR ${lr.lr_number} (${lr.origin_city} → ${lr.destination_city}): ${url}`;
    const consigneePhone = lr.consignee?.whatsapp || lr.consignee?.phone || '';
    const phone = consigneePhone.replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lr) return null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/lr" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-text-dark">LR {lr.lr_number}</h2>
            <p className="text-sm text-text-muted">
              Created {new Date(lr.created_at).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Share2 className="h-4 w-4" />
            WhatsApp
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-text-muted hover:bg-gray-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </button>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <StatusTimeline currentStatus={lr.status} />
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Party Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Consignor (Sender)</h4>
            <p className="font-semibold text-text-dark">{lr.consignor.name}</p>
            {lr.consignor.city && <p className="text-sm text-text-muted">{lr.consignor.city}</p>}
            {lr.consignor.gst_number && <p className="mt-1 font-mono text-xs text-text-muted">GST: {lr.consignor.gst_number}</p>}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Consignee (Receiver)</h4>
            <p className="font-semibold text-text-dark">{lr.consignee.name}</p>
            {lr.consignee.city && <p className="text-sm text-text-muted">{lr.consignee.city}</p>}
            {lr.consignee.gst_number && <p className="mt-1 font-mono text-xs text-text-muted">GST: {lr.consignee.gst_number}</p>}
          </div>
        </div>

        {/* Shipment Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Shipment Details</h4>
          <div className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <span className="text-text-muted">Load Type</span>
              <p className="font-medium uppercase text-text-dark">{lr.load_type}</p>
            </div>
            <div>
              <span className="text-text-muted">Route</span>
              <p className="font-medium text-text-dark">{lr.origin_city} → {lr.destination_city}</p>
            </div>
            {lr.goods_description && (
              <div>
                <span className="text-text-muted">Goods</span>
                <p className="font-medium text-text-dark">{lr.goods_description}</p>
              </div>
            )}
            {lr.weight_kg && (
              <div>
                <span className="text-text-muted">Weight</span>
                <p className="font-medium text-text-dark">{lr.weight_kg} kg</p>
              </div>
            )}
            {lr.ewb_number && (
              <div>
                <span className="text-text-muted">E-Way Bill</span>
                <p className="font-medium text-text-dark">{lr.ewb_number}</p>
              </div>
            )}
            <div>
              <span className="text-text-muted">Tracking Token</span>
              <p className="font-mono text-xs font-medium text-primary">{lr.tracking_token}</p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Amount</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Freight</span>
              <span className="font-medium">₹{lr.freight_amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">GST ({lr.gst_rate}%)</span>
              <span className="font-medium">₹{lr.gst_amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">₹{lr.total_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* POD Photo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Proof of Delivery (POD)</h4>
          {lr.pod_photo_url ? (
            <div>
              <img
                src={lr.pod_photo_url}
                alt="POD"
                className="max-h-64 rounded-lg border border-gray-200 object-contain"
              />
              <p className="mt-2 text-xs text-text-muted">
                Uploaded {lr.pod_uploaded_at ? new Date(lr.pod_uploaded_at).toLocaleString('en-IN') : ''}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 py-10">
              <Camera className="mb-2 h-10 w-10 text-text-muted" />
              <p className="mb-3 text-sm text-text-muted">No POD uploaded yet</p>
              {(lr.status === 'delivered' || lr.status === 'in_transit') && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload POD
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadPOD}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {lr.notes && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Notes</h4>
            <p className="text-sm text-text-dark">{lr.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
