import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const THEFT_THRESHOLD = 0.15; // 15% deviation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { trip_id } = await req.json();
    if (!trip_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'trip_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch the completed trip
    const { data: trip, error: tripErr } = await adminClient
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .single();

    if (tripErr || !trip || !trip.odometer_end) {
      return new Response(
        JSON.stringify({ success: false, error: 'Trip not found or incomplete' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total litres for this trip
    const { data: dieselEntries } = await adminClient
      .from('diesel_entries')
      .select('id, litres, total_cost')
      .eq('trip_id', trip_id);

    const totalLitres = (dieselEntries || []).reduce(
      (sum: number, d: { litres: number }) => sum + d.litres, 0
    );

    if (totalLitres === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { flagged: false, reason: 'No diesel entries' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const distanceKm = trip.odometer_end - trip.odometer_start;
    if (distanceKm <= 0) {
      return new Response(
        JSON.stringify({ success: true, data: { flagged: false, reason: 'No distance recorded' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actualKmpl = distanceKm / totalLitres;

    // Get vehicle baseline
    const { data: vehicle } = await adminClient
      .from('vehicles')
      .select('baseline_mileage_kmpl')
      .eq('id', trip.vehicle_id)
      .single();

    const baselineKmpl = vehicle?.baseline_mileage_kmpl || 0;

    if (baselineKmpl <= 0) {
      return new Response(
        JSON.stringify({ success: true, data: { flagged: false, reason: 'No baseline set' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if actual is more than 15% below baseline
    const deviation = (baselineKmpl - actualKmpl) / baselineKmpl;
    const flagged = deviation > THEFT_THRESHOLD;

    if (flagged) {
      // Flag all diesel entries for this trip
      const entryIds = (dieselEntries || []).map((d: { id: string }) => d.id);
      if (entryIds.length > 0) {
        await adminClient
          .from('diesel_entries')
          .update({ is_theft_flagged: true })
          .in('id', entryIds);
      }

      // Send WhatsApp alert (RULE-002: via Edge Function)
      try {
        const { data: driver } = await adminClient
          .from('drivers')
          .select('name, phone')
          .eq('id', trip.driver_id)
          .single();

        const { data: vehicleData } = await adminClient
          .from('vehicles')
          .select('registration_number')
          .eq('id', trip.vehicle_id)
          .single();

        // Call send-whatsapp Edge Function
        await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            template: 'diesel_theft_alert',
            phone: user.phone || '',
            params: {
              vehicle: vehicleData?.registration_number || 'Unknown',
              driver: driver?.name || 'Unknown',
              trip_number: trip.trip_number,
              actual_kmpl: actualKmpl.toFixed(2),
              baseline_kmpl: baselineKmpl.toFixed(2),
              deviation_pct: (deviation * 100).toFixed(1),
            },
          }),
        });
      } catch {
        // WhatsApp alert is best-effort
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          flagged,
          actual_kmpl: actualKmpl,
          baseline_kmpl: baselineKmpl,
          deviation_pct: (deviation * 100).toFixed(1),
          total_litres: totalLitres,
          distance_km: distanceKm,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
