-- Migration 006: Route benchmarks table for expected km/L per route.
-- Owner sets expected mileage for origin-destination pairs.
-- Used by diesel theft detection to compare against actual mileage.

CREATE TABLE IF NOT EXISTS route_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  expected_kmpl NUMERIC(5,2) NOT NULL,
  distance_km NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, origin_city, destination_city)
);

ALTER TABLE route_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company isolation" ON route_benchmarks
  FOR ALL USING (company_id = (auth.jwt()->>'company_id')::uuid);

CREATE INDEX idx_route_benchmarks_company ON route_benchmarks(company_id);
CREATE INDEX idx_route_benchmarks_route ON route_benchmarks(company_id, origin_city, destination_city);
