// daily-compliance-alerts — Edge Function
// Called by pg_cron daily at 8:30 AM IST.
// Checks compliance_documents for upcoming/overdue expiry.
// Sends WhatsApp alerts at 30, 15, and 7 day thresholds.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch documents expiring within 30 days
    const { data: docs, error: docsErr } = await adminClient
      .from('compliance_documents')
      .select('*, company_id')
      .lte('expiry_date', in30Days)
      .order('expiry_date', { ascending: true });

    if (docsErr || !docs) {
      console.error('[COMPLIANCE] Failed to fetch docs:', docsErr?.message);
      return new Response(
        JSON.stringify({ success: false, error: docsErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let alertsSent = 0;

    for (const doc of docs) {
      const expiryDate = new Date(doc.expiry_date);
      const diffMs = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Determine which alert to send
      let alertField: string | null = null;

      if (daysRemaining <= 7 && !doc.alert_sent_7) {
        alertField = 'alert_sent_7';
      } else if (daysRemaining <= 15 && !doc.alert_sent_15) {
        alertField = 'alert_sent_15';
      } else if (daysRemaining <= 30 && !doc.alert_sent_30) {
        alertField = 'alert_sent_30';
      }

      if (!alertField) continue;

      // Get entity name
      let entityName = 'Unknown';
      if (doc.entity_type === 'vehicle') {
        const { data: vehicle } = await adminClient
          .from('vehicles')
          .select('registration_number')
          .eq('id', doc.entity_id)
          .single();
        entityName = vehicle?.registration_number ?? 'Unknown Vehicle';
      } else {
        const { data: driver } = await adminClient
          .from('drivers')
          .select('name')
          .eq('id', doc.entity_id)
          .single();
        entityName = driver?.name ?? 'Unknown Driver';
      }

      // Get company owner's WhatsApp
      const { data: company } = await adminClient
        .from('companies')
        .select('whatsapp_phone')
        .eq('id', doc.company_id)
        .single();

      if (!company?.whatsapp_phone) continue;

      // Doc type label
      const docTypeLabels: Record<string, string> = {
        insurance: 'Insurance',
        puc: 'PUC',
        fitness: 'Fitness Certificate',
        national_permit: 'National Permit',
        state_permit: 'State Permit',
        driver_licence: 'Driver Licence',
      };

      // Send WhatsApp alert
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: company.whatsapp_phone,
          template_name: 'compliance_expiry',
          template_params: [
            docTypeLabels[doc.doc_type] ?? doc.doc_type,
            entityName,
            daysRemaining <= 0 ? 'OVERDUE' : String(daysRemaining),
          ],
          company_id: doc.company_id,
        }),
      });

      // Update alert flag
      await adminClient
        .from('compliance_documents')
        .update({ [alertField]: true })
        .eq('id', doc.id);

      alertsSent++;
    }

    console.log(`[COMPLIANCE] Sent ${alertsSent} compliance alerts`);

    // ─── GEO-FENCE: Stationary Vehicle Detection ───
    let stationaryAlerts = 0;
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    // Fetch active trips that haven't already sent a stationary alert
    const { data: activeTrips } = await adminClient
      .from('trips')
      .select('id, trip_number, vehicle_id, company_id')
      .in('status', ['departed', 'in_transit'])
      .eq('stationary_alert_sent', false);

    if (activeTrips && activeTrips.length > 0) {
      for (const trip of activeTrips) {
        // Get latest location
        const { data: latest } = await adminClient
          .from('vehicle_locations')
          .select('latitude, longitude, recorded_at')
          .eq('trip_id', trip.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latest) continue;

        // Get oldest location within the last 2 hours
        const { data: oldest } = await adminClient
          .from('vehicle_locations')
          .select('latitude, longitude, recorded_at')
          .eq('trip_id', trip.id)
          .gte('recorded_at', twoHoursAgo)
          .order('recorded_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!oldest) continue;

        // Check if stationary (within 0.5km radius) — Haversine
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(latest.latitude - oldest.latitude);
        const dLon = toRad(latest.longitude - oldest.longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(oldest.latitude)) *
            Math.cos(toRad(latest.latitude)) *
            Math.sin(dLon / 2) ** 2;
        const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // Check time difference is at least 2 hours
        const timeDiffMs = new Date(latest.recorded_at).getTime() - new Date(oldest.recorded_at).getTime();
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

        if (distanceKm <= 0.5 && timeDiffHours >= 2) {
          // Get vehicle registration
          const { data: vehicle } = await adminClient
            .from('vehicles')
            .select('registration_number')
            .eq('id', trip.vehicle_id)
            .single();

          // Get company owner phone
          const { data: tripCompany } = await adminClient
            .from('companies')
            .select('whatsapp_phone')
            .eq('id', trip.company_id)
            .single();

          if (tripCompany?.whatsapp_phone) {
            await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: tripCompany.whatsapp_phone,
                body: `Alert: Truck ${vehicle?.registration_number ?? 'Unknown'} on Trip ${trip.trip_number} has been stationary for over 2 hours at (${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}). Check on driver.`,
                company_id: trip.company_id,
              }),
            });

            // Mark alert sent
            await adminClient
              .from('trips')
              .update({ stationary_alert_sent: true })
              .eq('id', trip.id);

            stationaryAlerts++;
          }
        }
      }
    }

    console.log(`[GEO-FENCE] Sent ${stationaryAlerts} stationary alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        compliance_alerts_sent: alertsSent,
        stationary_alerts_sent: stationaryAlerts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[COMPLIANCE] Error:', (err as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
