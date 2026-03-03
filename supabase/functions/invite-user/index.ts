// FleetOS Edge Function: invite-user
// Owner/manager invites a new team member by phone number.
// Creates auth.users entry + our users table record.

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

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is owner or manager
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get caller's role
    const { data: caller } = await supabaseAdmin
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (!caller || !['owner', 'manager'].includes(caller.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only owners and managers can invite users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { name, phone, role, company_id, branch_id } = body;

    if (!name || !phone || !role || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: name, phone, role, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller belongs to the same company
    if (caller.company_id !== company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot invite users to a different company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user (or get existing)
    let authUserId: string;

    // Check if phone already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingUsers?.users?.find((u) => u.phone === phone);

    if (existingAuth) {
      authUserId = existingAuth.id;
    } else {
      // Create new auth user with phone
      const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true, // Auto-confirm so they can log in with OTP
        app_metadata: { company_id, role, branch_id: branch_id || null },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create auth user: ' + createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = newAuth.user.id;
    }

    // Check if user record already exists
    const { data: existingUserRecord } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();

    if (existingUserRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'User already exists in this company' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user record in our users table
    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: authUserId,
      company_id,
      branch_id: branch_id || null,
      name,
      phone,
      role,
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user record: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If role is driver, also create a drivers table entry
    if (role === 'driver') {
      await supabaseAdmin.from('drivers').insert({
        company_id,
        user_id: authUserId,
        name,
        phone,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { user_id: authUserId, name, phone, role },
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
