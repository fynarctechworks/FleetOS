// send-whatsapp — Edge Function
// Sends WhatsApp messages via Meta Cloud API with logging.
// If META_WHATSAPP_TOKEN is 'test' or missing, operates in stub/mock mode.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  to: string;
  template_name?: string;
  template_params?: string[];
  body?: string;
  company_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { to, template_name, template_params, body, company_id } =
      (await req.json()) as WhatsAppRequest;

    if (!to || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing "to" or "company_id"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN');
    const META_PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID');

    // Mock/stub mode — when token is missing or set to 'test'
    if (!META_WHATSAPP_TOKEN || META_WHATSAPP_TOKEN === 'test' || !META_PHONE_NUMBER_ID) {
      console.log(`[STUB] WhatsApp to ${to}:`, { template_name, template_params, body });

      await adminClient.from('whatsapp_send_log').insert({
        company_id,
        to_phone: to,
        template_name: template_name ?? null,
        message_body: body ?? null,
        status: 'stub_sent',
        meta_message_id: `stub_${Date.now()}`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: { message_id: `stub_${Date.now()}`, status: 'stub_sent' },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real Meta Cloud API call
    const metaUrl = `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`;

    let messagePayload: Record<string, unknown>;

    if (template_name) {
      messagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template_name,
          language: { code: 'en' },
          components: template_params
            ? [
                {
                  type: 'body',
                  parameters: template_params.map((p) => ({ type: 'text', text: p })),
                },
              ]
            : [],
        },
      };
    } else {
      messagePayload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: body ?? 'Hello from FleetOS' },
      };
    }

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      // Log failure
      await adminClient.from('whatsapp_send_log').insert({
        company_id,
        to_phone: to,
        template_name: template_name ?? null,
        message_body: body ?? null,
        status: 'failed',
        error_message: metaData.error?.message ?? 'Meta API error',
      });

      return new Response(
        JSON.stringify({ success: false, error: metaData.error?.message ?? 'Meta API error' }),
        { status: metaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageId = metaData.messages?.[0]?.id ?? null;

    // Log success
    await adminClient.from('whatsapp_send_log').insert({
      company_id,
      to_phone: to,
      template_name: template_name ?? null,
      message_body: body ?? null,
      status: 'sent',
      meta_message_id: messageId,
    });

    return new Response(
      JSON.stringify({ success: true, data: { message_id: messageId, status: 'sent' } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
