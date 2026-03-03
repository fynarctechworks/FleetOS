'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { pdf } from '@react-pdf/renderer';
import { LRPdfDocument } from '@/components/lr-pdf';
import type { LREntry, AddressBook } from '@fleetos/shared';
import { CheckCircle, Download, MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';

interface LRWithParties extends LREntry {
  consignor: AddressBook;
  consignee: AddressBook;
}

export default function LRSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const lrId = params.id as string;
  const [lr, setLr] = useState<LRWithParties | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const qrRef = useRef<string>('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('lr_entries')
        .select(`
          *,
          consignor:consignor_id(*),
          consignee:consignee_id(*)
        `)
        .eq('id', lrId)
        .single();

      if (error || !data) {
        router.push('/dashboard/lr');
        return;
      }

      setLr(data as unknown as LRWithParties);

      // Generate QR code data URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const trackingUrl = `${appUrl}/track/${data.tracking_token}`;
      const qrDataUrl = await QRCode.toDataURL(trackingUrl, { width: 200, margin: 1 });
      qrRef.current = qrDataUrl;

      setLoading(false);

      // Fire WhatsApp template notification via Edge Function (non-blocking, RULE-002)
      supabase.functions.invoke('send-whatsapp', {
        body: {
          template: 'lr_booked_consignee',
          phone: data.consignee?.phone || data.consignee?.whatsapp,
          params: {
            lr_number: data.lr_number,
            consignor_name: data.consignor?.name,
            origin_city: data.origin_city,
            destination_city: data.destination_city,
            tracking_url: trackingUrl,
          },
        },
      }).catch(() => {
        // Non-blocking — template notification is best-effort
      });
    }
    load();
  }, [lrId, router]);

  async function handleDownloadPdf() {
    if (!lr) return;
    setGenerating(true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingUrl = `${appUrl}/track/${lr.tracking_token}`;

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
      consignor_address: [lr.consignor.address_line1, lr.consignor.city, lr.consignor.state]
        .filter(Boolean)
        .join(', '),
      consignor_gst: lr.consignor.gst_number || '',
      consignee_name: lr.consignee.name,
      consignee_address: [lr.consignee.address_line1, lr.consignee.city, lr.consignee.state]
        .filter(Boolean)
        .join(', '),
      consignee_gst: lr.consignee.gst_number || '',
      tracking_url: trackingUrl,
      qr_data_url: qrRef.current,
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

  function handleWhatsAppShare() {
    if (!lr) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingUrl = `${appUrl}/track/${lr.tracking_token}`;

    const message = [
      `📦 LR ${lr.lr_number} Created`,
      ``,
      `Goods: ${lr.goods_description || 'N/A'}`,
      `Route: ${lr.origin_city} → ${lr.destination_city}`,
      `Amount: ₹${lr.total_amount.toLocaleString('en-IN')}`,
      ``,
      `Track: ${trackingUrl}`,
    ].join('\n');

    const phone = (lr.consignee.whatsapp || lr.consignee.phone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = phone
      ? `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lr) return null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-text-dark">LR Created Successfully</h2>
        <p className="mb-1 text-lg font-mono font-semibold text-primary">{lr.lr_number}</p>
        <p className="mb-8 text-sm text-text-muted">
          {lr.origin_city} → {lr.destination_city} &middot; ₹{lr.total_amount.toLocaleString('en-IN')}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadPdf}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            Download PDF
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            <MessageCircle className="h-5 w-5" />
            Share via WhatsApp
          </button>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href={`/dashboard/lr/${lr.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View LR Details
          </Link>
          <Link
            href="/dashboard/lr/new"
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Create Another <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
