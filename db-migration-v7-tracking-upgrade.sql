-- Migration v7: Add event_type, section, and device_type columns to website_clicks
-- Adds categorization for tracking events and website sections

-- Add new columns
ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'pageview';
ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE website_clicks ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_website_clicks_event_type ON website_clicks(event_type);
CREATE INDEX IF NOT EXISTS idx_website_clicks_section ON website_clicks(section);
CREATE INDEX IF NOT EXISTS idx_website_clicks_event_section ON website_clicks(event_type, section);

-- Backfill event_type from existing button_id data
UPDATE website_clicks
SET event_type = 'scroll'
WHERE event_type = 'pageview' AND button_id LIKE 'scroll_%';

UPDATE website_clicks
SET event_type = 'cta_click'
WHERE event_type = 'pageview' AND button_id LIKE 'cta-%';

-- Backfill section from page URLs
UPDATE website_clicks
SET section = 'immobilien'
WHERE section IS NULL AND page LIKE '%immobil%';

UPDATE website_clicks
SET section = 'handwerk'
WHERE section IS NULL AND page LIKE '%handwerk%';

UPDATE website_clicks
SET section = 'bau'
WHERE section IS NULL AND page LIKE '%bau%';
