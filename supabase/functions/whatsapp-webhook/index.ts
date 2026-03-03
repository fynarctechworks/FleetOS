// whatsapp-webhook — Edge Function
// Receives incoming WhatsApp messages from Meta webhook.
// Handles: DEPART, ARRIVE, DONE text commands + photo (POD) uploads.
// Security: Verifies X-Hub-Signature-256 HMAC-SHA256 signature.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── HMAC-SHA256 Signature Verification ───

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expected = `sha256=${hex}`;
  return expected === signature;
}

// ─── Helper: Send WhatsApp via internal Edge Function call ───

async function sendWhatsApp(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  params: { to: string; body?: string; template_name?: string; template_params?: string[]; company_id: string }
) {
  // Call send-whatsapp Edge Function internally
  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  return res.json();
}

serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
  const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN') ?? '';

  // ─── GET: Webhook Verification (Meta sends this to activate webhook) ───
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WEBHOOK_SECRET) {
      console.log('[WEBHOOK] Verification successful');
      return new Response(challenge, { status: 200 });
    }

    console.log('[WEBHOOK] Verification failed — invalid token');
    return new Response('Forbidden', { status: 403 });
  }

  // ─── OPTIONS: CORS ───
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ─── POST: Incoming Messages ───
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();

    // Verify signature
    const signature = req.headers.get('x-hub-signature-256') ?? '';
    if (WEBHOOK_SECRET && WEBHOOK_SECRET !== 'test') {
      const valid = await verifySignature(rawBody, signature, WEBHOOK_SECRET);
      if (!valid) {
        console.log('[WEBHOOK] Invalid signature — rejecting request');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Meta webhook payload structure
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value;
        if (!value?.messages) continue;

        const contacts = value.contacts ?? [];
        const messages = value.messages ?? [];

        for (const message of messages) {
          const senderPhone = message.from; // E.164 without +
          const messageType = message.type; // 'text' or 'image'

          // Find driver by phone — normalize to last 10 digits
          const phone10 = senderPhone.slice(-10);
          const { data: driver } = await adminClient
            .from('drivers')
            .select('id, company_id, name, phone')
            .or(`phone.eq.${senderPhone},phone.eq.+${senderPhone},phone.ilike.%${phone10}`)
            .eq('is_active', true)
            .limit(1)
            .single();

          if (!driver) {
            console.log(`[WEBHOOK] Unknown sender: ${senderPhone}`);
            continue; // Unknown number — skip
          }

          // Find active trip for this driver
          const { data: activeTrip } = await adminClient
            .from('trips')
            .select('*')
            .eq('driver_id', driver.id)
            .in('status', ['planned', 'departed', 'in_transit', 'arrived'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (messageType === 'text') {
            const text = (message.text?.body ?? '').trim().toUpperCase();
            await handleTextCommand(
              adminClient, supabaseUrl, supabaseServiceKey,
              text, senderPhone, driver, activeTrip
            );
          } else if (messageType === 'image') {
            const mediaId = message.image?.id;
            if (mediaId && activeTrip) {
              await handleImageMessage(
                adminClient, supabaseUrl, supabaseServiceKey,
                mediaId, senderPhone, driver, activeTrip, META_WHATSAPP_TOKEN
              );
            }
          }
        }
      }
    }

    // Meta requires 200 response to acknowledge receipt
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[WEBHOOK] Error:', (err as Error).message);
    return new Response('OK', { status: 200 }); // Always 200 to prevent Meta retries
  }
});

// ─── Text Command Handler ───

interface DriverInfo {
  id: string;
  company_id: string;
  name: string;
  phone: string;
}

async function handleTextCommand(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  command: string,
  senderPhone: string,
  driver: DriverInfo,
  activeTrip: Record<string, unknown> | null
) {
  if (!activeTrip) {
    await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
      to: senderPhone,
      body: `Hi ${driver.name}, you don't have an active trip assigned. Contact your fleet owner.`,
      company_id: driver.company_id,
    });
    return;
  }

  const tripId = activeTrip.id as string;
  const tripNumber = activeTrip.trip_number as string;

  switch (command) {
    case 'DEPART': {
      await adminClient
        .from('trips')
        .update({
          status: 'departed',
          actual_departure: new Date().toISOString(),
        })
        .eq('id', tripId);

      await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
        to: senderPhone,
        template_name: 'trip_departed_driver',
        template_params: [tripNumber, activeTrip.destination_city as string],
        company_id: driver.company_id,
      });

      console.log(`[WEBHOOK] Trip ${tripNumber} DEPARTED by ${driver.name}`);
      break;
    }

    case 'ARRIVE': {
      await adminClient
        .from('trips')
        .update({
          status: 'arrived',
          actual_arrival: new Date().toISOString(),
        })
        .eq('id', tripId);

      await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
        to: senderPhone,
        template_name: 'trip_arrived_driver',
        template_params: [tripNumber, activeTrip.destination_city as string],
        company_id: driver.company_id,
      });

      console.log(`[WEBHOOK] Trip ${tripNumber} ARRIVED by ${driver.name}`);
      break;
    }

    case 'DONE': {
      await adminClient
        .from('trips')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      // Trigger P&L calculation
      await fetch(`${supabaseUrl}/functions/v1/calculate-trip-pl`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trip_id: tripId }),
      });

      // Trigger diesel theft detection for each diesel entry
      const { data: dieselEntries } = await adminClient
        .from('diesel_entries')
        .select('id')
        .eq('trip_id', tripId);

      for (const entry of dieselEntries ?? []) {
        await fetch(`${supabaseUrl}/functions/v1/detect-diesel-theft`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ diesel_entry_id: entry.id }),
        });
      }

      // Send confirmation to driver
      await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
        to: senderPhone,
        template_name: 'trip_completed_driver',
        template_params: [tripNumber],
        company_id: driver.company_id,
      });

      // Send delivery notification to consignees of linked LRs
      const { data: linkedLRs } = await adminClient
        .from('lr_entries')
        .select('id, lr_number, consignee_id')
        .eq('trip_id', tripId);

      for (const lr of linkedLRs ?? []) {
        const { data: consignee } = await adminClient
          .from('address_book')
          .select('whatsapp, name')
          .eq('id', lr.consignee_id)
          .single();

        if (consignee?.whatsapp) {
          await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
            to: consignee.whatsapp,
            template_name: 'lr_delivered',
            template_params: [lr.lr_number, consignee.name],
            company_id: driver.company_id,
          });

          // Update LR status to delivered
          await adminClient
            .from('lr_entries')
            .update({ status: 'delivered' })
            .eq('id', lr.id);
        }
      }

      console.log(`[WEBHOOK] Trip ${tripNumber} COMPLETED by ${driver.name}`);
      break;
    }

    default: {
      await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
        to: senderPhone,
        body: `Hi ${driver.name}! Reply with:\nDEPART — to start your trip\nARRIVE — when you reach destination\nDONE — when delivery is complete\n\nOr send a photo of the POD (Proof of Delivery).`,
        company_id: driver.company_id,
      });
      break;
    }
  }
}

// ─── Image (POD) Handler ───

async function handleImageMessage(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  mediaId: string,
  senderPhone: string,
  driver: DriverInfo,
  activeTrip: Record<string, unknown>,
  metaToken: string
) {
  const tripId = activeTrip.id as string;
  const companyId = activeTrip.company_id as string;

  try {
    let imageBuffer: ArrayBuffer;

    if (metaToken && metaToken !== 'test') {
      // Step 1: Get media URL from Meta
      const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${metaToken}` },
      });
      const mediaData = await mediaRes.json();
      const mediaUrl = mediaData.url;

      if (!mediaUrl) {
        console.log(`[WEBHOOK] Failed to get media URL for ${mediaId}`);
        return;
      }

      // Step 2: Download the image
      const imageRes = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${metaToken}` },
      });
      imageBuffer = await imageRes.arrayBuffer();
    } else {
      // Mock mode — create a tiny placeholder
      imageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).buffer;
      console.log(`[STUB] Mock image download for media ${mediaId}`);
    }

    // Step 3: Upload to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `${companyId}/${tripId}/${timestamp}.jpg`;

    const { error: uploadError } = await adminClient.storage
      .from('pod-photos')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.log(`[WEBHOOK] Storage upload failed: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = adminClient.storage
      .from('pod-photos')
      .getPublicUrl(storagePath);

    const podUrl = urlData.publicUrl;

    // Step 4: Find and update the linked LR
    const { data: linkedLR } = await adminClient
      .from('lr_entries')
      .select('id, lr_number')
      .eq('trip_id', tripId)
      .is('pod_photo_url', null) // First LR without POD
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (linkedLR) {
      await adminClient
        .from('lr_entries')
        .update({
          pod_photo_url: podUrl,
          pod_uploaded_at: new Date().toISOString(),
          status: 'pod_uploaded',
        })
        .eq('id', linkedLR.id);

      // Send confirmation
      await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
        to: senderPhone,
        body: `POD received and attached to LR ${linkedLR.lr_number}. Thank you!`,
        company_id: companyId,
      });

      console.log(`[WEBHOOK] POD uploaded for LR ${linkedLR.lr_number} by ${driver.name}`);
    } else {
      await sendWhatsApp(adminClient, supabaseUrl, supabaseServiceKey, {
        to: senderPhone,
        body: 'Photo received but no pending LR found to attach it to.',
        company_id: companyId,
      });
    }
  } catch (err) {
    console.error(`[WEBHOOK] Image handler error: ${(err as Error).message}`);
  }
}
