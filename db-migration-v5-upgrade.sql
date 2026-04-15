-- DB Migration v5 - Marketing + Planning Agents
-- NICHT automatisch ausfuehren. Erst Angie reviewed, dann Execute via Neon Console.
-- Datum: 2026-04-15
-- Branch: feature/batch-1-shared-utilities

-- Alle Tabellen sind idempotent (IF NOT EXISTS). Sichere Re-Runs moeglich.

CREATE TABLE IF NOT EXISTS daily_plans (
  id SERIAL PRIMARY KEY,
  plan_date DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  blocks_json JSONB NOT NULL,
  review_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date DESC);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  metrics_json JSONB NOT NULL,
  forecast_json JSONB,
  html_body TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week_start DESC);

CREATE TABLE IF NOT EXISTS news_items (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  source VARCHAR(100),
  published_at TIMESTAMPTZ,
  summary TEXT,
  full_text TEXT,
  industries VARCHAR(50)[],
  relevance_score INT CHECK (relevance_score BETWEEN 0 AND 100),
  used_in_content BOOLEAN DEFAULT FALSE,
  shared_with_sales BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_items_score ON news_items(relevance_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_industries ON news_items USING GIN(industries);

CREATE TABLE IF NOT EXISTS content_drafts (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,
  content_type VARCHAR(30),
  headline TEXT,
  body TEXT NOT NULL,
  hashtags TEXT[],
  suggested_post_time TIMESTAMPTZ,
  source_news_ids INT[],
  status VARCHAR(20) DEFAULT 'pending_review',
  approved_by VARCHAR(50),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS email_inbox (
  id SERIAL PRIMARY KEY,
  gmail_id VARCHAR(100) NOT NULL UNIQUE,
  thread_id VARCHAR(100),
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  subject TEXT,
  received_at TIMESTAMPTZ,
  category VARCHAR(50),
  priority VARCHAR(20),
  summary TEXT,
  draft_reply TEXT,
  requires_action BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_inbox_category ON email_inbox(category, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_inbox_action ON email_inbox(requires_action) WHERE requires_action = TRUE;

CREATE TABLE IF NOT EXISTS press_contacts (
  id SERIAL PRIMARY KEY,
  outlet_name VARCHAR(255) NOT NULL,
  outlet_type VARCHAR(50),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_role VARCHAR(100),
  industries VARCHAR(50)[],
  website TEXT,
  last_contacted TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'cold',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_press_contacts_status ON press_contacts(status);

CREATE TABLE IF NOT EXISTS pr_campaigns (
  id SERIAL PRIMARY KEY,
  press_contact_id INT REFERENCES press_contacts(id),
  subject TEXT,
  body TEXT,
  status VARCHAR(30) DEFAULT 'pending_review',
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletters (
  id SERIAL PRIMARY KEY,
  issue_month DATE NOT NULL,
  subject TEXT,
  html_body TEXT NOT NULL,
  included_news_ids INT[],
  included_content_ids INT[],
  status VARCHAR(30) DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  brevo_campaign_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supervisor_reports (
  id SERIAL PRIMARY KEY,
  supervisor_name VARCHAR(50),
  report_time TIMESTAMPTZ DEFAULT NOW(),
  metrics_json JSONB,
  alerts_json JSONB,
  status VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_supervisor_reports_time ON supervisor_reports(supervisor_name, report_time DESC);

CREATE TABLE IF NOT EXISTS health_reports (
  id SERIAL PRIMARY KEY,
  check_time TIMESTAMPTZ DEFAULT NOW(),
  agent_statuses JSONB,
  api_statuses JSONB,
  db_stats JSONB,
  overall_status VARCHAR(20),
  alerts TEXT[]
);

CREATE TABLE IF NOT EXISTS industry_feeds (
  id SERIAL PRIMARY KEY,
  industry VARCHAR(50) NOT NULL,
  feed_url TEXT NOT NULL,
  feed_type VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  last_crawled TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(industry, feed_url)
);

CREATE TABLE IF NOT EXISTS blocked_tasks (
  id SERIAL PRIMARY KEY,
  task_name VARCHAR(255) NOT NULL,
  agent_name VARCHAR(100),
  reason TEXT NOT NULL,
  attempts INT DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  UNIQUE(task_name, agent_name, resolved)
);
