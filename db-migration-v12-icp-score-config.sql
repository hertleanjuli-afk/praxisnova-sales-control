-- Migration v12: icp_config + icp_score + icp_tag + ready_to_contact
-- Track 3, T3.4, 2026-04-21
-- Vorher: Track 3 v11 (sequence_pause_log).
-- Nachher: Track 3 T3.5 Outreach-Strategist Prompt-Update (kein Schema).
--
-- Zweck:
--   1. icp_config-Tabelle fuer datengesteuerte ICP-Definition (PLATFORM-STANDARDS 2.3)
--   2. NACE-Codes als JSONB-Array pro ICP, Lookup-Efficient
--   3. Seed der vier neuen ICPs (PropTech, Hausverwaltung, Kanzlei, Agentur)
--   4. leads.icp_score, leads.icp_tag, leads.nace_code, leads.ready_to_contact,
--      leads.triage_reason Spalten
--   5. Initial-Backfill der icp_score/icp_tag aus icp_config.nace_codes
--
-- Ausfuehrung: Angie fuehrt manuell aus. Claude Code schreibt nur das SQL-File.
-- Reversible via DOWN-Kommentare am File-Ende.

-- UP -----------------------------------------------------------------------

-- icp_config-Tabelle: datengesteuerte ICP-Definition
CREATE TABLE IF NOT EXISTS icp_config (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  nace_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  industry_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  base_score INTEGER NOT NULL DEFAULT 50,
  sequence_id TEXT,
  hook_type TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icp_config_enabled ON icp_config(enabled);

-- Seed: vier neue ICPs (2026-04-21 Pivot).
-- ON CONFLICT: existierende Rows werden NICHT ueberschrieben, damit Live-DB
-- mit eventuell abweichendem Schema (z.B. TEXT[] statt JSONB) nicht crasht.
INSERT INTO icp_config (id, display_name, nace_codes, industry_keywords, base_score, sequence_id, hook_type)
VALUES
  (
    'icp-proptech',
    'PropTech + Immobilien-Software',
    '["6820", "6831", "6832", "7022", "6201", "6209"]'::jsonb,
    '["proptech", "real estate software", "immobiliensoftware", "property management software"]'::jsonb,
    90, 'proptech', 'roi'
  ),
  (
    'icp-hausverwaltung',
    'Hausverwaltung',
    '["6832", "6820"]'::jsonb,
    '["hausverwaltung", "property management", "immobilienverwaltung"]'::jsonb,
    85, 'hausverwaltung', 'roi'
  ),
  (
    'icp-kanzlei',
    'Steuerberater + Anwaelte',
    '["6910", "6920", "7021"]'::jsonb,
    '["kanzlei", "steuerberater", "rechtsanwalt", "law firm", "tax advisor"]'::jsonb,
    80, 'kanzlei', 'compliance'
  ),
  (
    'icp-agentur',
    'Digitale Agenturen',
    '["7311", "7312", "7320", "6311"]'::jsonb,
    '["digital agency", "marketing agency", "werbeagentur", "agentur"]'::jsonb,
    75, 'agentur', 'whitelabel'
  )
ON CONFLICT (id) DO NOTHING;

-- leads-Spalten fuer ICP-Scoring
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_score INTEGER DEFAULT 50;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icp_tag TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nace_code TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ready_to_contact BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS triage_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_icp_tag ON leads(icp_tag);
CREATE INDEX IF NOT EXISTS idx_leads_icp_score ON leads(icp_score);
CREATE INDEX IF NOT EXISTS idx_leads_ready_to_contact ON leads(ready_to_contact);
CREATE INDEX IF NOT EXISTS idx_leads_nace_code ON leads(nace_code);

-- Initial-Backfill: existierende Leads klassifizieren.
-- Primaerpfad: nace_code ist gesetzt UND steckt in icp_config.nace_codes JSONB-Array.
-- Nutzt ? Operator fuer JSONB-Containment (NACE-Code ist Element des Arrays).
UPDATE leads l
SET
  icp_score = c.base_score,
  icp_tag = c.id
FROM icp_config c
WHERE c.enabled = true
  AND c.nace_codes ? l.nace_code
  AND l.nace_code IS NOT NULL
  AND l.icp_tag IS NULL;

-- Sekundaerpfad: industry-Keyword-Fallback bei leerem nace_code.
-- iteriert industry_keywords-Array und matcht case-insensitive gegen leads.industry.
UPDATE leads l
SET
  icp_score = c.base_score,
  icp_tag = c.id
FROM icp_config c, jsonb_array_elements_text(c.industry_keywords) AS kw
WHERE c.enabled = true
  AND l.icp_tag IS NULL
  AND l.industry IS NOT NULL
  AND position(lower(kw) IN lower(l.industry)) > 0;

-- Alte ICPs explizit auf 0 setzen (Bau, Handwerk raus).
UPDATE leads
SET icp_score = 0, icp_tag = NULL, triage_reason = 'icp-pivot-2026-04-21-bau-handwerk-raus'
WHERE sequence_type IN ('bauunternehmen', 'handwerk')
  AND icp_tag IS NULL;

-- ready_to_contact Gate: nur Leads mit icp_score >= 60 sind bereit.
UPDATE leads
SET ready_to_contact = (icp_score >= 60)
WHERE ready_to_contact IS DISTINCT FROM (icp_score >= 60);

-- Verify-Queries (nach Ausfuehrung manuell pruefen):
--   SELECT icp_tag, COUNT(*) FROM leads GROUP BY 1 ORDER BY 2 DESC;
--   SELECT ready_to_contact, COUNT(*) FROM leads GROUP BY 1;
--   SELECT icp_score, COUNT(*) FROM leads GROUP BY 1 ORDER BY 1;
--   SELECT id, display_name, jsonb_array_length(nace_codes) FROM icp_config;

-- DOWN ---------------------------------------------------------------------
-- Reaktivierung (falls Rollback noetig):
--   ALTER TABLE leads DROP COLUMN IF EXISTS icp_score;
--   ALTER TABLE leads DROP COLUMN IF EXISTS icp_tag;
--   ALTER TABLE leads DROP COLUMN IF EXISTS nace_code;
--   ALTER TABLE leads DROP COLUMN IF EXISTS ready_to_contact;
--   ALTER TABLE leads DROP COLUMN IF EXISTS triage_reason;
--   DROP TABLE IF EXISTS icp_config;
