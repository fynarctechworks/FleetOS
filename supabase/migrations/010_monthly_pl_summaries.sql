-- 010: Monthly P&L Summaries table
-- Stores pre-computed monthly profit/loss data for fast report loading.
-- Populated by the monthly-pl-summary Edge Function via pg_cron.

CREATE TABLE IF NOT EXISTS monthly_pl_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  month TEXT NOT NULL, -- YYYY-MM format
  total_trips INT NOT NULL DEFAULT 0,
  completed_trips INT NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_diesel_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_toll_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_driver_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_loading_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_misc_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  profitable_trips INT NOT NULL DEFAULT 0,
  loss_trips INT NOT NULL DEFAULT 0,
  profit_margin_pct NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, month)
);

-- RLS
ALTER TABLE monthly_pl_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_pl_summaries_company_isolation"
  ON monthly_pl_summaries FOR ALL
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- Index
CREATE INDEX idx_monthly_pl_summaries_company_month
  ON monthly_pl_summaries(company_id, month DESC);
