// check-speed-alert — Edge Function
// Called by the driver app after inserting a high-speed location point.
// Sends a WhatsApp alert to the fleet owner if speed > 80 km/h
// with 30-minute debounce via vehicles.last_speed_alert_sent.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    });
  }

  try {
    const { vehicle_id, speed_kmph, trip_id, company_id } = await req.json();

    if (!vehicle_id || !speed_kmph || speed_kmph <= 80) {
      return new Response(
        JSON.stringify({ success: true, alert_sent: false, reason: 'speed_within_limit' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get vehicle + owner info
    const { data: vehicle } = await adminClient
      .from('vehicles')
      .select('id, registration_number, last_speed_alert_sent, company_id')
      .eq('id', vehicle_id)
      .single();

    if (!vehicle) {
      return new Response(
        JSON.stringify({ success: false, error: 'vehicle_not_found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 30-minute debounce check
    if (vehicle.last_speed_alert_sent) {
      const lastAlert = new Date(vehicle.last_speed_alert_sent).getTime();
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      if (now - lastAlert < thirtyMinutes) {
        return new Response(
          JSON.stringify({ success: true, alert_sent: false, reason: 'debounced' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get trip number if available
    let tripNumber = '';
    if (trip_id) {
      const { data: trip } = await adminClient
        .from('trips')
        .select('trip_number')
        .eq('id', trip_id)
        .single();
      if (trip) tripNumber = trip.trip_number;
    }

    // Get company owner phone for alert
    const { data: owner } = await adminClient
      .from('users')
      .select('phone')
      .eq('company_id', vehicle.company_id)
      .eq('role', 'owner')
      .limit(1)
      .single();

    if (!owner?.phone) {
      return new Response(
        JSON.stringify({ success: true, alert_sent: false, reason: 'no_owner_phone' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send WhatsApp speed alert
    const alertBody = tripNumber
      ? `⚠️ Speed Alert: Truck ${vehicle.registration_number} travelling at ${Math.round(speed_kmph)} km/h on Trip ${tripNumber}.`
      : `⚠️ Speed Alert: Truck ${vehicle.registration_number} travelling at ${Math.round(speed_kmph)} km/h.`;

    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: owner.phone,
        body: alertBody,
        company_id: company_id || vehicle.company_id,
      }),
    });

    // Update debounce timestamp
    await adminClient
      .from('vehicles')
      .update({ last_speed_alert_sent: new Date().toISOString() })
      .eq('id', vehicle_id);

    console.log(`[SPEED-ALERT] ${vehicle.registration_number} at ${Math.round(speed_kmph)} km/h — alert sent to owner`);

    return new Response(
      JSON.stringify({ success: true, alert_sent: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[SPEED-ALERT] Error:', (err as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
