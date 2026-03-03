import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find LRs with EWB expiring within 6 hours whose trip is not completed
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: expiringLRs } = await supabase
      .from('lr_entries')
      .select('id, lr_number, ewb_number, ewb_expiry, origin_city, destination_city, company_id, trip_id')
      .not('ewb_number', 'is', null)
      .not('ewb_expiry', 'is', null)
      .gt('ewb_expiry', now)
      .lte('ewb_expiry', sixHoursFromNow);

    if (!expiringLRs || expiringLRs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No expiring EWBs found', alerts_sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let alertsSent = 0;

    // Group by company to send one alert per company
    const byCompany = new Map<string, typeof expiringLRs>();
    for (const lr of expiringLRs) {
      // Skip if trip is already completed
      if (lr.trip_id) {
        const { data: trip } = await supabase
          .from('trips')
          .select('status')
          .eq('id', lr.trip_id)
          .single();
        if (trip?.status === 'completed') continue;
      }

      const existing = byCompany.get(lr.company_id) ?? [];
      existing.push(lr);
      byCompany.set(lr.company_id, existing);
    }

    for (const [companyId, lrs] of byCompany.entries()) {
      // Get owner phone
      const { data: company } = await supabase
        .from('companies')
        .select('whatsapp_phone, name')
        .eq('id', companyId)
        .single();

      if (!company?.whatsapp_phone) continue;

      const ewbList = lrs
        .map((lr: { lr_number: string; ewb_number: string; ewb_expiry: string }) => {
          const hoursLeft = Math.round((new Date(lr.ewb_expiry).getTime() - Date.now()) / (1000 * 60 * 60) * 10) / 10;
          return `• ${lr.ewb_number} (LR: ${lr.lr_number}) — ${hoursLeft}h left`;
        })
        .join('\n');

      await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: company.whatsapp_phone,
          template: 'ewb_expiry_alert',
          parameters: [
            String(lrs.length),
            ewbList,
          ],
        },
      });

      alertsSent++;
    }

    return new Response(
      JSON.stringify({ success: true, alerts_sent: alertsSent, ewbs_found: expiringLRs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
