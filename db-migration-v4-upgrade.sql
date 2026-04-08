-- ============================================================
-- PraxisNova Sales Control Center - DB Migration v4
-- Datum: 8. April 2026
-- Zweck: LinkedIn Tracking, Call Disposition, Email Performance,
--        Posting Tracker, Outreach Changes, Lead Erweiterungen
-- ============================================================

-- ============================================================
-- 1. LEADS TABELLE ERWEITERN
-- ============================================================

-- Mobilnummer (separates Feld)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile_phone TEXT;

-- Lead-Kategorie (Immobilienmakler, Bautraeger, Handwerker, etc.)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_category TEXT;

-- Verweis-Info (wenn Lead von anderem Kontakt empfohlen wurde)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by_lead_id INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referral_reason TEXT;

-- Manuell angelegt (fuer Kontakte die nur angerufen werden sollen)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_entry BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS exclude_from_sequences BOOLEAN DEFAULT false;

-- Outreach Step Tracking (wo ist der Lead gerade im Flow)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_step TEXT DEFAULT 'new';
  -- new, email_sent, linkedin_pending, linkedin_request_sent,
  -- linkedin_connected, linkedin_message_sent, linkedin_replied,
  -- on_call_list, in_calls, call_completed, booked, blocked

-- Total call attempts (Gesamt-Zaehler ueber alle Wochen)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_call_attempts INTEGER DEFAULT 0;

-- HubSpot Sync
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hubspot_contact_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

-- Index fuer Kategorie-Filter
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(lead_category);
-- Index fuer outreach_step
CREATE INDEX IF NOT EXISTS idx_leads_outreach_step ON leads(outreach_step);
-- Index fuer HubSpot Sync
CREATE INDEX IF NOT EXISTS idx_leads_hubspot_id ON leads(hubspot_contact_id);


-- ============================================================
-- 2. CALL_QUEUE TABELLE ERWEITERN
-- ============================================================

-- Wochen-Nummer fuer wöchentliche Gruppierung
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS week_year INTEGER;

-- Welcher Anrufversuch (1, 2, oder 3)
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS call_attempt_number INTEGER DEFAULT 1;

-- Quelle des Eintrags
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'agent';
  -- agent, manual, callback, referral, linkedin_no_response

-- LinkedIn-Trigger Flag
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS linkedin_trigger BOOLEAN DEFAULT false;

-- Index fuer Wochen-Abfragen
CREATE INDEX IF NOT EXISTS idx_call_queue_week ON call_queue(week_year, week_number);
-- Index fuer Source-Filter
CREATE INDEX IF NOT EXISTS idx_call_queue_source ON call_queue(source);


-- ============================================================
-- 3. LINKEDIN TRACKING TABELLE (NEU)
-- ============================================================

CREATE TABLE IF NOT EXISTS linkedin_tracking (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,

  -- Verbindungsstatus
  connection_status TEXT NOT NULL DEFAULT 'none',
    -- none: Noch nichts passiert
    -- pending_request: Email gesendet, LinkedIn-Anfrage morgen faellig
    -- request_sent: Anfrage an Lead gesendet
    -- connected: Lead hat Anfrage akzeptiert
    -- rejected: Lead hat abgelehnt
    -- no_linkedin: Lead hat kein LinkedIn Profil
    -- ignored: Anfrage seit > 7 Tagen ohne Reaktion

  -- Anfrage-Tracking
  request_due_date DATE,
  request_sent_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,

  -- Nachricht-Tracking
  message_sent BOOLEAN DEFAULT false,
  message_sent_at TIMESTAMPTZ,
  message_content TEXT,

  -- Antwort-Tracking
  reply_received BOOLEAN DEFAULT false,
  reply_received_at TIMESTAMPTZ,
  reply_content TEXT,

  -- Allgemein
  linkedin_url TEXT,
  notes TEXT,
  updated_by TEXT DEFAULT 'manual',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(lead_id)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_tracking_status ON linkedin_tracking(connection_status);
CREATE INDEX IF NOT EXISTS idx_linkedin_tracking_request_due ON linkedin_tracking(request_due_date);
CREATE INDEX IF NOT EXISTS idx_linkedin_tracking_message ON linkedin_tracking(message_sent, reply_received);


-- ============================================================
-- 4. CALL DISPOSITIONS TABELLE (NEU)
-- ============================================================

CREATE TABLE IF NOT EXISTS call_dispositions (
  id SERIAL PRIMARY KEY,
  call_queue_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,

  -- Anruf-Basis
  answered BOOLEAN NOT NULL DEFAULT false,
  answered_by TEXT,
  call_quality TEXT CHECK (call_quality IN ('positiv', 'neutral', 'negativ')),

  -- Ergebnis
  outcome TEXT NOT NULL,
    -- termin_gebucht: Termin vereinbart
    -- interesse: Interesse, aber kein Termin
    -- kein_interesse: Klare Absage
    -- falscher_ansprechpartner: Falsche Person
    -- nicht_erreicht: Niemand abgehoben
    -- mailbox: Mailbox besprochen
    -- rueckruf: Rueckruf vereinbart
    -- weiterleitung: An andere Person verwiesen
    -- besetzt: Leitung besetzt
    -- sonstiges: Anderes Ergebnis

  -- Kontakt schliessen
  close_contact BOOLEAN DEFAULT false,
  close_reason TEXT,
    -- absage, falsche_firma, kein_bedarf, budget, timing, konkurrenz
  close_duration_months INTEGER CHECK (close_duration_months IN (3, 6, 9)),

  -- Rueckruf
  callback_requested BOOLEAN DEFAULT false,
  callback_date DATE,
  callback_time TEXT,
  callback_notes TEXT,

  -- Weiterleitung an neue Person
  referred_to_name TEXT,
  referred_to_phone TEXT,
  referred_to_mobile TEXT,
  referred_to_email TEXT,
  referred_to_position TEXT,
  referred_to_company TEXT,
  referred_to_notes TEXT,

  -- Notizen
  call_notes TEXT,
  call_duration_seconds INTEGER,

  -- Sequenz-Aktion (was soll mit der Email-Sequenz passieren)
  sequence_action TEXT DEFAULT 'keep_running',
    -- keep_running: Sequenz laeuft weiter
    -- stop: Sequenz sofort stoppen
    -- pause: Sequenz pausieren

  -- HubSpot
  hubspot_activity_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispositions_lead ON call_dispositions(lead_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_outcome ON call_dispositions(outcome);
CREATE INDEX IF NOT EXISTS idx_dispositions_callback ON call_dispositions(callback_requested, callback_date);


-- ============================================================
-- 5. LINKEDIN POSTS TABELLE (NEU)
-- ============================================================

CREATE TABLE IF NOT EXISTS linkedin_posts (
  id SERIAL PRIMARY KEY,
  post_date DATE NOT NULL,
  post_number INTEGER NOT NULL CHECK (post_number IN (1, 2)),

  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by TEXT,

  post_url TEXT,
  post_topic TEXT,
  post_type TEXT,
    -- carousel, text, video, image, article, poll
  notes TEXT,

  -- Engagement (manuell eintragen)
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_date, post_number)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_date ON linkedin_posts(post_date);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_posted ON linkedin_posts(posted);


-- ============================================================
-- 6. EMAIL PERFORMANCE DAILY TABELLE (NEU)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_performance_daily (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,

  -- Volumen
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,

  -- Engagement
  emails_opened INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,

  -- Probleme
  bounces INTEGER DEFAULT 0,
  hard_bounces INTEGER DEFAULT 0,
  soft_bounces INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  spam_complaints INTEGER DEFAULT 0,

  -- Antworten
  replies INTEGER DEFAULT 0,

  -- Berechnete Raten
  open_rate NUMERIC(5,2),
  click_rate NUMERIC(5,2),
  bounce_rate NUMERIC(5,2),
  reply_rate NUMERIC(5,2),

  -- Trend (vs. Vortag)
  open_rate_change NUMERIC(5,2),
  click_rate_change NUMERIC(5,2),

  -- Metadata
  data_source TEXT DEFAULT 'brevo_api',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_date)
);

CREATE INDEX IF NOT EXISTS idx_email_perf_date ON email_performance_daily(report_date);


-- ============================================================
-- 7. OUTREACH CHANGES TABELLE (NEU)
-- ============================================================

CREATE TABLE IF NOT EXISTS outreach_changes (
  id SERIAL PRIMARY KEY,
  change_date DATE NOT NULL DEFAULT CURRENT_DATE,

  change_type TEXT NOT NULL,
    -- subject_line: Betreffzeile geaendert
    -- email_template: Email-Vorlage geaendert
    -- target_audience: Zielgruppe angepasst
    -- sequence_timing: Timing der Sequenz geaendert
    -- approach: Ansprache-Ansatz geaendert (A/B/C)
    -- sending_volume: Versandmenge geaendert
    -- signature: Signatur geaendert
    -- other: Sonstiges

  old_value TEXT,
  new_value TEXT,
  reason TEXT,

  -- Auswirkung (wird spaeter befuellt wenn Daten vorliegen)
  impact_open_rate NUMERIC(5,2),
  impact_click_rate NUMERIC(5,2),
  impact_reply_rate NUMERIC(5,2),
  impact_notes TEXT,

  changed_by TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_changes_date ON outreach_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_outreach_changes_type ON outreach_changes(change_type);


-- ============================================================
-- 8. HUBSPOT SYNC LOG TABELLE (NEU)
-- ============================================================

CREATE TABLE IF NOT EXISTS hubspot_sync_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
    -- contact, deal, note, activity
  entity_id INTEGER NOT NULL,
  hubspot_id TEXT,
  action TEXT NOT NULL,
    -- create, update, delete
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending, success, failed
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hubspot_sync_status ON hubspot_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_entity ON hubspot_sync_log(entity_type, entity_id);


-- ============================================================
-- 9. VIEWS FUER DASHBOARDS
-- ============================================================

-- Aktuelle Woche Anrufliste mit allen Lead-Daten
CREATE OR REPLACE VIEW v_call_list_current_week AS
SELECT
  cq.*,
  l.first_name, l.last_name, l.email, l.phone, l.mobile_phone,
  l.company, l.title, l.industry, l.lead_category,
  l.agent_score, l.pipeline_stage, l.outreach_step,
  l.linkedin_url, l.total_call_attempts,
  l.signal_email_reply, l.signal_linkedin_interest,
  lt.connection_status as linkedin_status,
  lt.message_sent as linkedin_message_sent,
  lt.reply_received as linkedin_reply_received,
  (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'opened') as email_opens,
  (SELECT COUNT(*) FROM email_events ee WHERE ee.lead_id = l.id AND ee.event_type = 'clicked') as email_clicks
FROM call_queue cq
JOIN leads l ON cq.lead_id = l.id
LEFT JOIN linkedin_tracking lt ON lt.lead_id = l.id
WHERE cq.week_year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND cq.week_number = EXTRACT(WEEK FROM CURRENT_DATE);

-- Faellige Rueckrufe
CREATE OR REPLACE VIEW v_callbacks_due AS
SELECT
  cd.*,
  cq.lead_id,
  l.first_name, l.last_name, l.email, l.phone, l.mobile_phone,
  l.company, l.title, l.lead_category, l.agent_score,
  l.total_call_attempts
FROM call_dispositions cd
JOIN call_queue cq ON cd.call_queue_id = cq.id
JOIN leads l ON cd.lead_id = l.id
WHERE cd.callback_requested = true
  AND cd.callback_date <= CURRENT_DATE + INTERVAL '7 days'
  AND cd.callback_date >= CURRENT_DATE
  AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
ORDER BY cd.callback_date ASC;

-- LinkedIn Aktionen faellig heute
CREATE OR REPLACE VIEW v_linkedin_actions_due AS
SELECT
  lt.*,
  l.first_name, l.last_name, l.company, l.title, l.email,
  l.agent_score, l.lead_category
FROM linkedin_tracking lt
JOIN leads l ON lt.lead_id = l.id
WHERE (
  -- LinkedIn-Anfrage heute faellig
  (lt.connection_status = 'pending_request' AND lt.request_due_date <= CURRENT_DATE)
  OR
  -- Anfrage gesendet, 3+ Tage ohne Antwort
  (lt.connection_status = 'request_sent' AND lt.request_sent_at < NOW() - INTERVAL '3 days')
  OR
  -- Verbunden aber noch keine Nachricht
  (lt.connection_status = 'connected' AND lt.message_sent = false)
  OR
  -- Nachricht gesendet, 3+ Tage ohne Antwort
  (lt.connection_status = 'connected' AND lt.message_sent = true
   AND lt.reply_received = false AND lt.message_sent_at < NOW() - INTERVAL '3 days')
)
AND l.pipeline_stage NOT IN ('Blocked', 'Booked')
ORDER BY lt.created_at ASC;

-- Email Performance Trend (letzte 30 Tage)
CREATE OR REPLACE VIEW v_email_performance_trend AS
SELECT
  report_date,
  emails_sent,
  open_rate,
  click_rate,
  reply_rate,
  bounce_rate,
  open_rate - LAG(open_rate) OVER (ORDER BY report_date) as open_rate_trend,
  click_rate - LAG(click_rate) OVER (ORDER BY report_date) as click_rate_trend
FROM email_performance_daily
WHERE report_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY report_date DESC;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Neue Tabellen: linkedin_tracking, call_dispositions, linkedin_posts,
--                email_performance_daily, outreach_changes, hubspot_sync_log
-- Erweiterte Tabellen: leads (9 neue Spalten), call_queue (5 neue Spalten)
-- Neue Views: v_call_list_current_week, v_callbacks_due,
--             v_linkedin_actions_due, v_email_performance_trend
-- Neue Indexes: 15
-- ============================================================
