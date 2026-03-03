import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller
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

    // Fetch trip
    const { data: trip, error: tripErr } = await adminClient
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .single();

    if (tripErr || !trip) {
      return new Response(
        JSON.stringify({ success: false, error: 'Trip not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sum linked LR revenue
    const { data: lrs } = await adminClient
      .from('lr_entries')
      .select('total_amount')
      .eq('trip_id', trip_id);

    const totalRevenue = (lrs || []).reduce((sum: number, lr: { total_amount: number }) => sum + (lr.total_amount || 0), 0);

    // Sum diesel costs for this trip
    const { data: dieselEntries } = await adminClient
      .from('diesel_entries')
      .select('total_cost')
      .eq('trip_id', trip_id);

    const totalDieselCost = (dieselEntries || []).reduce(
      (sum: number, d: { total_cost: number }) => sum + (d.total_cost || 0), 0
    );

    // Calculate net profit
    const netProfit = totalRevenue
      - totalDieselCost
      - (trip.total_toll_cost || 0)
      - (trip.total_driver_allowance || 0)
      - (trip.total_loading_cost || 0)
      - (trip.total_misc_cost || 0);

    // Update trip
    const { error: updateErr } = await adminClient
      .from('trips')
      .update({
        total_revenue: totalRevenue,
        total_diesel_cost: totalDieselCost,
        net_profit: netProfit,
      })
      .eq('id', trip_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ success: false, error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { trip_id, total_revenue: totalRevenue, total_diesel_cost: totalDieselCost, net_profit: netProfit },
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
