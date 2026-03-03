-- 007: WhatsApp Send Log table
-- Tracks all outbound WhatsApp messages for debugging and audit.

CREATE TABLE IF NOT EXISTS whatsapp_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  to_phone TEXT NOT NULL,
  template_name TEXT,
  message_body TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, stub_sent
  error_message TEXT,
  meta_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (RULE-004)
ALTER TABLE whatsapp_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_whatsapp_log"
  ON whatsapp_send_log
  FOR ALL
  USING (company_id = (auth.jwt()->>'company_id')::uuid);

-- Index for lookups
CREATE INDEX idx_whatsapp_log_company_created
  ON whatsapp_send_log (company_id, created_at DESC);
