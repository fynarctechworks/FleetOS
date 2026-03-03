// FleetOS Edge Function: set-custom-claims
// Called after OTP login to inject company_id, role, branch_id into JWT
// Trigger: Supabase Auth webhook on login OR called manually after signup

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client (service role) for querying users table
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user client to get the authenticated user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the user in our users table
    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from('users')
      .select('company_id, role, branch_id')
      .eq('id', user.id)
      .single();

    if (appUserError || !appUser) {
      // User exists in auth.users but not in our users table yet
      // This happens during onboarding — return empty claims
      return new Response(
        JSON.stringify({
          success: true,
          data: { company_id: null, role: null, branch_id: null, needs_onboarding: true },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set custom claims on the user's JWT via auth.admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        company_id: appUser.company_id,
        role: appUser.role,
        branch_id: appUser.branch_id,
      },
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to set custom claims: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          company_id: appUser.company_id,
          role: appUser.role,
          branch_id: appUser.branch_id,
          needs_onboarding: false,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
