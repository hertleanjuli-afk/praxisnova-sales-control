# Offene Punkte

Laufend aktualisierte Liste der offenen Punkte im Sales-Tool und benachbarten Repos.

Status-Legende: `OPEN` / `IN_PROGRESS` / `BLOCKED` / `DONE` / `DROPPED`

---

## Aus Paket B (2026-04-12)

### PAKET-B-1: Google Calendar ENV Vars setzen
**Status:** BLOCKED (wartet auf Angie)
**Owner:** Angie
**Was:** `GOOGLE_CALENDAR_REFRESH_TOKEN` und `GOOGLE_CALENDAR_ID` in Vercel Production Env Vars eintragen. OAuth-Bootstrap folgt dem gleichen Flow wie `GMAIL_REFRESH_TOKEN` aus Paket A, der OAuth-Consent muss zusaetzlich den Calendar-Scope einschliessen.
**Bis dahin:** Cron laeuft mit `status: not_configured`, legt keine Leads an, kein Crash.

### PAKET-B-2: Tracking und Popup auf praxisnovaai.com einbinden
**Status:** BLOCKED (wartet auf Angie bzw. Website-Dev)
**Owner:** Angie
**Was:** Zwei Script-Tags in das Root-Layout der Website einbauen:
```html
<script async src="https://praxisnova-sales-control.vercel.app/tracking.js"></script>
<script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
```
**Anleitung:** siehe `Agent build/code-changes/PAKET-B-TRACKING-TAG.md` und `PAKET-B-POPUP-INSTALL.md`.

### PAKET-B-3: WIP mergen und layout.tsx nachziehen
**Status:** BLOCKED (wartet auf Angie)
**Owner:** Angie
**Was:** Im praxisnova-website Repo die 6 WIP-Dateien committen/mergen (`src/app/globals.css`, `layout.tsx`, `Footer.tsx`, `Nav.tsx`, `Popup.tsx`, `tailwind.config.js`). Danach die 2 en-dashes in `layout.tsx` (Zeile 15, 24) per Patch aus `WEBSITE-SONDERZEICHEN-FIXES.md` entfernen.

### PAKET-B-4: Test-Booking ueber Google Appointment Schedule
**Status:** BLOCKED (depends on PAKET-B-1)
**Owner:** Angie
**Was:** Sobald ENV gesetzt ist, einen Test-Termin ueber `calendar.app.google/...` buchen, pruefen ob der Lead mit `source='website_calendar_booking'` und `pipeline_stage='Booked'` im Sales-Tool auftaucht. Danach Calendly abklemmen.

### PAKET-B-5: Popup-Smoketest
**Status:** OPEN
**Owner:** Angie
**Was:** Nach Einbindung des Script-Tags: DevTools `localStorage.removeItem('pn_popup_dismissed')`, 30s warten, Popup erscheint, Test-Email eingeben, Lead im Sales-Tool pruefen, Brevo-Notification pruefen.

---

## Aus frueheren Sessions (Platzhalter)

### NEW-3: (Platzhalter, falls aus fruehereren Sessions offen)
**Status:** OPEN
**Owner:** t.b.d.
**Was:** Placeholder-Eintrag. Wenn ein konkretes Ticket hier reinsoll, bitte aus der damaligen Session-Datei uebernehmen.

---

## DONE (letzter Stand)

- **PAKET-B-0** (2026-04-12): Teil 1-4 implementiert und committed. 4 Commits: `5b6541f`, `d7607f8`, `c778a6a` (sales-control), `cf8e099` (website).
- **PAKET-A** (2026-04-11): Gmail Reply Sync Cron + OAuth-Bootstrap Docs.
