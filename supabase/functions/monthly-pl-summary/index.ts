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

    // Calculate previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const startDate = `${month}-01T00:00:00`;
    const endDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    const endDateStr = `${month}-${String(endDate.getDate()).padStart(2, '0')}T23:59:59`;

    // Get all active companies
    const { data: companies } = await supabase
      .from('companies')
      .select('id, whatsapp_phone, ca_email, name')
      .eq('is_active', true);

    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active companies' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ company_id: string; month: string; net_profit: number }> = [];

    for (const company of companies) {
      // Fetch completed trips for this company in the previous month
      const { data: trips } = await supabase
        .from('trips')
        .select('status, total_revenue, total_diesel_cost, total_toll_cost, total_driver_allowance, total_loading_cost, total_misc_cost, net_profit')
        .eq('company_id', company.id)
        .gte('created_at', startDate)
        .lte('created_at', endDateStr);

      const allTrips = trips ?? [];
      const completed = allTrips.filter((t: { status: string }) => t.status === 'completed');

      const totalRevenue = completed.reduce((s: number, t: { total_revenue: number }) => s + t.total_revenue, 0);
      const totalDieselCost = completed.reduce((s: number, t: { total_diesel_cost: number }) => s + t.total_diesel_cost, 0);
      const totalTollCost = completed.reduce((s: number, t: { total_toll_cost: number }) => s + t.total_toll_cost, 0);
      const totalDriverAllowance = completed.reduce((s: number, t: { total_driver_allowance: number }) => s + t.total_driver_allowance, 0);
      const totalLoadingCost = completed.reduce((s: number, t: { total_loading_cost: number }) => s + t.total_loading_cost, 0);
      const totalMiscCost = completed.reduce((s: number, t: { total_misc_cost: number }) => s + t.total_misc_cost, 0);
      const totalCosts = totalDieselCost + totalTollCost + totalDriverAllowance + totalLoadingCost + totalMiscCost;
      const netProfit = totalRevenue - totalCosts;
      const profitMarginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

      // Upsert summary
      await supabase.from('monthly_pl_summaries').upsert(
        {
          company_id: company.id,
          month,
          total_trips: allTrips.length,
          completed_trips: completed.length,
          total_revenue: totalRevenue,
          total_diesel_cost: totalDieselCost,
          total_toll_cost: totalTollCost,
          total_driver_allowance: totalDriverAllowance,
          total_loading_cost: totalLoadingCost,
          total_misc_cost: totalMiscCost,
          total_costs: totalCosts,
          net_profit: netProfit,
          profitable_trips: completed.filter((t: { net_profit: number }) => t.net_profit >= 0).length,
          loss_trips: completed.filter((t: { net_profit: number }) => t.net_profit < 0).length,
          profit_margin_pct: profitMarginPct,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,month' }
      );

      results.push({ company_id: company.id, month, net_profit: netProfit });

      // Send WhatsApp summary to owner
      if (company.whatsapp_phone && completed.length > 0) {
        const [yearStr, monthStr] = month.split('-');
        const monthName = new Date(Number(yearStr), Number(monthStr) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

        await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: company.whatsapp_phone,
            template: 'monthly_pl_summary',
            parameters: [
              monthName,
              String(completed.length),
              `₹${totalRevenue.toLocaleString('en-IN')}`,
              `₹${netProfit.toLocaleString('en-IN')}`,
              `${profitMarginPct}%`,
            ],
          },
        });
      }

      // Send CA email if configured
      if (company.ca_email && completed.length > 0) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: company.ca_email,
            subject: `FleetOS Monthly P&L Report — ${month}`,
            html: `
              <h2>${company.name} — Monthly P&L Summary</h2>
              <p><strong>Month:</strong> ${month}</p>
              <table border="1" cellpadding="8" style="border-collapse:collapse">
                <tr><td>Completed Trips</td><td><strong>${completed.length}</strong></td></tr>
                <tr><td>Total Revenue</td><td><strong>₹${totalRevenue.toLocaleString('en-IN')}</strong></td></tr>
                <tr><td>Total Costs</td><td><strong>₹${totalCosts.toLocaleString('en-IN')}</strong></td></tr>
                <tr><td>Net Profit</td><td><strong>₹${netProfit.toLocaleString('en-IN')}</strong></td></tr>
                <tr><td>Profit Margin</td><td><strong>${profitMarginPct}%</strong></td></tr>
              </table>
              <p style="color:#64748B;margin-top:16px">Generated by FleetOS</p>
            `,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
