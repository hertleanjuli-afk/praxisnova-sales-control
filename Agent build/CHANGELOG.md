# CHANGELOG

Alle nennenswerten Aenderungen am praxisnova-sales-control (und benachbarten Repos wie praxisnova-website, wo im Kontext von Paketen mitgeliefert).

Format: [Datum] Paket-Name / Kurzbeschreibung.

---

## [2026-04-12] Paket B: Tracking, Calendar Sync, Popup, Sonderzeichen

Vier eigenstaendige Commits, jeder rollback-faehig.

### Teil 1: Website Tracking (Commit `5b6541f`)
- **NEU** `public/tracking.js`: vanilla JS Pageview-Tracker fuer praxisnovaai.com
- **GEAENDERT** `app/api/webhooks/website-clicks/route.ts`: dual-auth (Secret ODER Origin), CORS Preflight, Rate-Limit 10/IP/min
- **NEU** `Agent build/code-changes/PAKET-B-TRACKING-TAG.md`: Install-Guide

### Teil 2: Google Calendar Sync (Commit `d7607f8`)
- **NEU** `lib/google-calendar-client.ts`: REST-Wrapper fuer Calendar v3
- **NEU** `app/api/cron/google-calendar-sync/route.ts`: Cron alle 5 Min 06-22 UTC
- **NEU** `app/api/trigger/google-calendar-sync/route.ts`: manueller ADMIN_SECRET Trigger
- **GEAENDERT** `lib/db.ts`: `leads.google_event_id`, `leads.last_booking_at`, partial unique index
- **GEAENDERT** `vercel.json`: neuer Cron-Entry mit explizitem Minute-Listing
- **GEAENDERT** `app/api/settings/system-health/route.ts`: neuer Agent-Eintrag fuer Ampel
- **Blocker**: GOOGLE_CALENDAR_REFRESH_TOKEN + GOOGLE_CALENDAR_ID muessen von Angie in Vercel gesetzt werden

### Teil 3: Website Email-Popup (Commit `c778a6a`)
- **NEU** `public/popup.js`: Exit-Intent / 30s-Timer Modal mit Email-Form
- **NEU** `app/api/webhooks/website-leads/route.ts`: Origin-auth POST-Handler, Rate-Limit 5/IP/10min, Brevo-Notification an Angie
- **NEU** `Agent build/code-changes/PAKET-B-POPUP-INSTALL.md`: Install-Guide

### Teil 4: Website Sonderzeichen Putzkolonne (Commit `cf8e099` in praxisnova-website)
- **GEAENDERT** 11 Dateien in praxisnova-website, ca. 25 Zeilen: alle em-dash und en-dash aus user-facing Strings entfernt
- **NEU** `WEBSITE-SONDERZEICHEN-FIXES.md`: Diff-Tabelle mit Datei/Zeile/Vorher/Nachher
- **Blocker**: 6 Dateien mit uncommitted WIP wurden nicht angefasst, Follow-ups fuer Angie dokumentiert

### Golden Rules Check
- Kein em-dash in neuem Code: geprueft (grep 0 Treffer).
- Kein en-dash in neuem Code: geprueft (grep 0 Treffer).
- Echte Umlaute in user-facing Strings: geprueft.
- Sie-Form in Kundentexten: geprueft (Popup Headline, Erfolgsmeldung, Fehlermeldung).
- ASCII Umlaute in Code-Kommentaren: OK per Regel.
