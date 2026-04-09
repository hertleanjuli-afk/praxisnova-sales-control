-- Migration v6: Add permanently_blocked column
-- This column tracks leads that should never be contacted again (unsubscribed, complained)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS permanently_blocked BOOLEAN DEFAULT FALSE;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_permanently_blocked ON leads(permanently_blocked);
