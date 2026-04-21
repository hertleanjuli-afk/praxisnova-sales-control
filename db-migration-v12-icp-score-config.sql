-- Migration v12: icp_score + icp_tag + ready_to_contact + icp_config-Seeds
-- Track 3, T3.4, 2026-04-21
-- Vorher: Track 1 v11 (icp_config TEXT[] + linkedin_feed_posts + cron_runs).
-- Nachher: Track 3 T3.5 Outreach-Strategist Prompt-Update (kein Schema).
--
-- Design-Entscheidung 2026-04-21: icp_config wurde in v11 bereits als
-- TEXT[] nace_codes angelegt (PLATFORM-STANDARDS 3.5). Diese Migration
-- ergaenzt industry_keywords JSONB (fuer Keyword-Lookup), seedet die vier
-- neuen ICPs idempotent und legt die leads-Scoring-Spalten an.
--
-- Ausfuehrung: Angie fuehrt manuell aus. Claude Code schreibt nur das SQL-File.
-- Reversible via DOWN-Kommentare am File-Ende.

-- UP -----------------------------------------------------------------------

-- icp_config sollte bereits aus v11 existieren. Defensives CREATE IF NOT EXISTS
-- deckt Standalone-Rollout ab, falls v11 noch nicht auf dieser DB ist.
CREATE TABLE IF NOT EXISTS icp_config (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  nace_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  base_score INTEGER NOT NULL DEFAULT 50,
  sequence_id TEXT,
  hook_type TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- industry_keywords als JSONB fuer Keyword-Substring-Match (neu in v12).
ALTER TABLE icp_config
  ADD COLUMN IF NOT EXISTS industry_keywords JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_icp_config_enabled ON icp_config(enabled);

-- Seed: vier neue ICPs. ON CONFLICT DO NOTHING damit Live-Rows nicht
-- ueberschrieben werden. Wenn Track 1 v11 bereits gleiche IDs gesetzt hat,
-- werden die v12-Werte ignoriert.
INSERT INTO icp_config (id, display_name, nace_codes, industry_keywords, base_score, sequence_id, hook_type)
VALUES
  (
    'icp-proptech',
    'PropTech + Immobilien-Software',
    ARRAY['6820', '6831', '6832', '7022', '6201', '6209']::TEXT[],
    '["proptech", "real estate software", "immobiliensoftware", "property management software"]'::jsonb,
    90, 'proptech', 'roi'
  ),
  (
    'icp-hausverwaltung',
    'Hausverwaltung',
    ARRAY['6832', '6820']::TEXT[],
    '["hausverwaltung", "property management", "immobilienverwaltung"]'::jsonb,
    85, 'hausverwaltung', 'roi'
  ),
  (
    'icp-kanzlei',
    'Steuerberater + Anwaelte',
    ARRAY['6910', '6920', '7021']::TEXT[],
    '["kanzlei", "steuerberater", "rechtsanwalt", "law firm", "tax advisor"]'::jsonb,
    80, 'kanzlei', 'compliance'
  ),
  (
    'icp-agentur',
    'Digitale Agenturen',
    ARRAY['7311', '7312', '7320', '6311']::TEXT[],
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
-- Pfad 1: nace_code ist gesetzt UND in icp_config.nace_codes (TEXT[]).
-- Nutzt ANY-Operator fuer Array-Containment (NACE-Code ist Element des Arrays).
UPDATE leads l
SET
  icp_score = c.base_score,
  icp_tag = c.id
FROM icp_config c
WHERE c.enabled = true
  AND l.nace_code IS NOT NULL
  AND l.nace_code = ANY(c.nace_codes)
  AND l.icp_tag IS NULL;

-- Pfad 2: industry-Keyword-Fallback bei leerem nace_code oder no-match.
-- iteriert industry_keywords-JSONB-Array und matcht case-insensitive
-- gegen leads.industry.
UPDATE leads l
SET
  icp_score = c.base_score,
  icp_tag = c.id
FROM icp_config c, jsonb_array_elements_text(c.industry_keywords) AS kw
WHERE c.enabled = true
  AND l.icp_tag IS NULL
  AND l.industry IS NOT NULL
  AND position(lower(kw) IN lower(l.industry)) > 0;

-- Pfad 3: alte ICPs explizit auf 0 setzen (Bau, Handwerk raus).
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
--   SELECT id, display_name, array_length(nace_codes, 1) FROM icp_config;

-- DOWN ---------------------------------------------------------------------
-- Reaktivierung (falls Rollback noetig):
--   ALTER TABLE leads DROP COLUMN IF EXISTS icp_score;
--   ALTER TABLE leads DROP COLUMN IF EXISTS icp_tag;
--   ALTER TABLE leads DROP COLUMN IF EXISTS nace_code;
--   ALTER TABLE leads DROP COLUMN IF EXISTS ready_to_contact;
--   ALTER TABLE leads DROP COLUMN IF EXISTS triage_reason;
-- WICHTIG: icp_config NICHT droppen, die gehoert zu v11 (Track 1).
-- Wenn Seeds entfernt werden sollen:
--   DELETE FROM icp_config WHERE id IN ('icp-proptech', 'icp-hausverwaltung',
--                                       'icp-kanzlei', 'icp-agentur');
-- industry_keywords-Spalte kann bleiben (nicht-disruptiv).
