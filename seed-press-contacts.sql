-- Seed: 10 deutsche Outlets als Startpunkt fuer PR Outreach (A7).
-- Quellen: freie Recherche (Impressum/Kontakt-Seiten). Kontakt-Emails als
-- REDAKTION-Generics, NICHT verifiziert. Angie muss vor erstem Outreach
-- Email-Adressen und Ansprechpartner pruefen.
--
-- NICHT automatisch ausfuehren; manuell auf Neon nach Migration-Review.

INSERT INTO press_contacts (outlet_name, outlet_type, contact_name, contact_email, contact_role, industries, website, status, notes) VALUES
  ('Immobilien Zeitung', 'fachpresse', NULL, 'redaktion@iz.de', 'Redaktion allgemein', ARRAY['immobilien'], 'https://www.iz.de', 'cold', 'Generic-Redaktionsadresse, vor Pitch persoenlichen Kontakt suchen'),
  ('Haufe Immobilien', 'fachpresse', NULL, 'redaktion@haufe.de', 'Redaktion Immobilien', ARRAY['immobilien'], 'https://www.haufe.de/immobilien', 'cold', 'Alternativ Fachmedien-Pressekontakt; Mehrfachmarke'),
  ('Baunetz', 'fachpresse', NULL, 'redaktion@baunetz.de', 'Redaktion Architektur/Bau', ARRAY['bau','architektur'], 'https://www.baunetz.de', 'cold', 'Architekten-Fokus, gut fuer Planung/Digitalisierung-Stories'),
  ('Bauwelt', 'fachpresse', NULL, 'redaktion@bauwelt.de', 'Redaktion', ARRAY['bau','architektur'], 'https://www.bauwelt.de', 'cold', ''),
  ('Handwerk Magazin', 'fachpresse', NULL, 'redaktion@handwerk-magazin.de', 'Redaktion', ARRAY['handwerk'], 'https://www.handwerk-magazin.de', 'cold', 'Zielgruppe Betriebs-Inhaber'),
  ('Deutsche Handwerks Zeitung', 'fachpresse', NULL, 'redaktion@dhz.net', 'Redaktion', ARRAY['handwerk'], 'https://www.dhz.net', 'cold', ''),
  ('t3n', 'fachpresse', NULL, 'redaktion@t3n.de', 'Redaktion Tech', ARRAY['tech','ki','startups'], 'https://t3n.de', 'cold', 'Gut fuer AI-Agent-Angles aus Tech-Perspektive'),
  ('Heise Online', 'fachpresse', NULL, 'redaktion@heise.de', 'Redaktion Tech', ARRAY['tech','ki'], 'https://www.heise.de', 'cold', 'Hohe Schwelle, nur mit ungewoehnlichem Angle'),
  ('Handelsblatt', 'wirtschaftspresse', NULL, 'leserservice@handelsblatt.com', 'Leserservice (nur Starter)', ARRAY['wirtschaft','tech'], 'https://www.handelsblatt.com', 'cold', 'Fuer direkten Pitch Redakteur-Recherche noetig'),
  ('Gruender.de', 'fachpresse', NULL, 'redaktion@gruender.de', 'Redaktion', ARRAY['startups','wirtschaft'], 'https://www.gruender.de', 'cold', 'Startup-Storys, Gruender-Interviews')
ON CONFLICT DO NOTHING;
