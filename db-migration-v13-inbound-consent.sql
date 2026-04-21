-- Migration v13: consent_version + consented_at fuer Inbound-Form Leads
-- Track 3, T3.7, 2026-04-21
-- Vorher: Track 3 v12 (icp_score + Seeds).
-- Nachher: open.
--
-- Zweck:
--   Gate 1.5 (DSGVO): Cold-Outreach-Leads aus Apollo haben berechtigtes
--   Interesse Art. 6 Abs. 1 lit. f als Rechtsgrundlage. Inbound-Form-Leads
--   haben EINWILLIGUNG Art. 6 Abs. 1 lit. a. Diese Einwilligung muss
--   versioniert und mit Zeitstempel auf dem Lead gespeichert werden.
--
-- Ausfuehrung: Angie fuehrt manuell aus. Claude Code schreibt nur das SQL-File.
-- Reversible via DOWN-Kommentare am File-Ende.

-- UP -----------------------------------------------------------------------

ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_version TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index fuer Retention-Cleanup-Queries
CREATE INDEX IF NOT EXISTS idx_leads_consented_at ON leads(consented_at);

-- DOWN ---------------------------------------------------------------------
--   ALTER TABLE leads DROP COLUMN IF EXISTS consent_version;
--   ALTER TABLE leads DROP COLUMN IF EXISTS consented_at;
--   ALTER TABLE leads DROP COLUMN IF EXISTS phone;
