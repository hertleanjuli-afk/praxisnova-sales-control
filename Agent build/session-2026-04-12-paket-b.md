# Session Report: Paket B (2026-04-12)

**Datum:** 2026-04-12
**Engineer:** Claude Opus 4.6 (Claude Code, 1M context)
**Briefing:** `Agent build/CLAUDE-CODE-PROMPT-2026-04-12-PAKET-B.md`
**Dauer:** ca. 4 Stunden (eine Session-Kompaktierung in der Mitte)
**Status:** Alle 4 Teile abgeschlossen, 4 Commits, 0 ENV-Aenderungen noetig von Angie ausser GOOGLE_CALENDAR_REFRESH_TOKEN

## Zusammenfassung

Paket B besteht aus vier unabhaengigen Teilen, die jeweils als eigener Commit ausgeliefert wurden damit einzelne Teile rueckgaengig gemacht werden koennen. Die Golden Rules (kein em-dash, kein en-dash, Sie-Form, echte Umlaute in user-facing Strings) wurden pre-flight und post-flight gegen jeden Teil gegrept.

## Commits

| Teil | Commit | Repo | Scope |
|---|---|---|---|
| 1 | `5b6541f` | praxisnova-sales-control | `feat(tracking): add public tracking.js and website-clicks webhook` |
| 2 | `d7607f8` | praxisnova-sales-control | `feat(google-calendar): sync bookings to leads table` |
| 3 | `c778a6a` | praxisnova-sales-control | `feat(popup): add website popup capture and lead webhook` |
| 4 | `cf8e099` | praxisnova-website | `chore(content): remove em-dash and en-dash from user-facing strings` |

## Teil 1: Tracking Script + Webhook

**Ziel:** Pageviews von praxisnovaai.com im Sales-Tool sichtbar machen, ohne dass ein Secret im oeffentlichen Browser-JS landet.

### Geliefert
- `public/tracking.js`: vanilla JS IIFE (~60 Zeilen), POSTet Pageview an `/api/webhooks/website-clicks`, UUID Session-ID via `crypto.randomUUID()`, UTM-Pickup aus URL, Sektor-Erkennung aus Pfad, silent fail.
- `app/api/webhooks/website-clicks/route.ts`: **dual-auth** hinzugefuegt:
  - Bestehende Secret-Auth (`INBOUND_WEBHOOK_SECRET`) bleibt erhalten fuer Backend-to-Backend POSTs.
  - Neue Origin-basierte Auth: `Origin: https://praxisnovaai.com` oder `https://www.praxisnovaai.com` erlaubt, Rate-Limit 10 POSTs/IP/Minute.
  - OPTIONS-Preflight-Handler fuer CORS.
- `Agent build/code-changes/PAKET-B-TRACKING-TAG.md`: Installationsanleitung fuer Angie (Script-Tag, Next.js App-/Pages-Router, Plain HTML, DSGVO-Hinweise, Troubleshooting).

### Entscheidungen
- **Warum dual-auth statt nur Origin**: Backend-Tools wie n8n oder interne Jobs haben keinen Browser-Origin-Header, muessen aber weiter POSTen koennen. Secret-Pfad bleibt deshalb.
- **Warum 10/min Rate-Limit**: Pageviews sind leichtgewichtig, 10 Requests decken normales Surfen ab, filtert aber Bot-Traffic.
- **Warum die alte 398-Zeilen tracking.js ueberschrieben**: Die alte Version war fuer `/api/track-click` (LECK-13 Territorium) gebaut. Paket B hat eine neue Route. Historie bleibt in git.

## Teil 2: Google Calendar Sync

**Ziel:** Termine, die Besucher via Google Appointment Schedule (`calendar.app.google/...`) buchen, sofort als Leads im Sales-Tool haben. Calendly wird damit ersetzt.

### Geliefert
- `lib/google-calendar-client.ts`: REST-API-Wrapper fuer Google Calendar v3, nutzt `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET` (shared OAuth2 App mit Gmail Reply Sync aus Paket A). Neue ENV Variablen: `GOOGLE_CALENDAR_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`.
- `app/api/cron/google-calendar-sync/route.ts`: Cron alle 5 Minuten 06-22 UTC. Exportiert `runGoogleCalendarSync()` fuer Wiederverwendung. Graceful fail wenn ENV nicht konfiguriert ist (`status: not_configured`, kein Crash).
- `app/api/trigger/google-calendar-sync/route.ts`: Manueller Trigger mit `ADMIN_SECRET` fuer Testing.
- `lib/db.ts`: Migrations `leads.google_event_id TEXT`, `leads.last_booking_at TIMESTAMPTZ`, `CREATE UNIQUE INDEX idx_leads_google_event_id ... WHERE google_event_id IS NOT NULL` (partial unique).
- `vercel.json`: neue Cron-Entry mit explizit aufgefaltetem Zeitplan (Vercel Cron unterstuetzt kein `*/5`).
- `app/api/settings/system-health/route.ts`: `google_calendar_sync` Agent in die Liste aufgenommen, erscheint in der Settings-Ampel.

### Lead-Upsert-Logik
1. Wenn `google_event_id` schon existiert: nur `last_booking_at` aktualisieren.
2. Sonst: Lead mit gleicher Email suchen, falls gefunden mit Event-ID verknuepfen und `pipeline_stage` auf `'Booked'` setzen.
3. Sonst: neuen Lead anlegen mit `source='website_calendar_booking'`, `pipeline_stage='Booked'`, `first_name`/`last_name` aus `attendee.displayName` gesplittet.

Eigene von Angie manuell angelegte Events werden ueber `isOwnerCreated()` (prueft `creator.self`, `creator.email === calendarId`, `organizer.self`) gefiltert.

### Blocker
- **GOOGLE_CALENDAR_REFRESH_TOKEN / GOOGLE_CALENDAR_ID sind noch nicht in Vercel gesetzt.** Der Cron laeuft also aktuell mit `status: not_configured` und legt keine Leads an. Angie muss den OAuth-Bootstrap durchfuehren (Agent build/GOOGLE-CALENDAR-ENV-WERTE.md referenziert im Code). Sobald die Werte gesetzt sind, springt der Cron von selbst an.

## Teil 3: Email-Popup + Webhook

**Ziel:** Besucher auf praxisnovaai.com sollen per Exit-Intent/Timer-Popup ihre Email hinterlassen koennen, Lead landet sofort im Sales-Tool, Angie bekommt Brevo-Benachrichtigung.

### Geliefert
- `public/popup.js`: vanilla JS Widget (~240 Zeilen, alles inline damit kein CSS-Build noetig):
  - Exit-Intent Trigger (`mouseout` mit `clientY < 10`) oder 30-Sekunden Timer, whichever first.
  - Modal mit Email-Pflichtfeld, Firma (optional), Branche (Dropdown bau/handwerk/immobilien). Branche wird aus URL-Pfad vorausgefuellt.
  - LocalStorage-Flag `pn_popup_dismissed=true` nach Close oder Submit.
  - ESC-Taste schliesst, Success-State nach Submit mit Auto-Close nach 4s.
  - Client-seitige Email-Regex-Validierung, Server validiert nochmal.
- `app/api/webhooks/website-leads/route.ts`: POST-Handler mit Origin-Auth (nur praxisnovaai.com), Rate-Limit 5/IP/10min, Lead-Upsert by LOWER(email), Brevo-Notification an Angie mit Link zum Lead im Sales-Tool. Notification ist `.catch()`-wrapped damit der Fail des Mail-Versands den Webhook nicht kippt.
- `Agent build/code-changes/PAKET-B-POPUP-INSTALL.md`: Installationsanleitung analog zu tracking.js.

### Entscheidungen
- **Rate-Limit 5/IP/10min** (vs. 10/IP/min bei tracking.js): Lead-Submits sind teurer als Pageviews, Spam ist kritischer.
- **Pipeline-Stage `'Neu'`** bei Insert (nicht `'Booked'`): Popup-Signale sind schwaecher als Calendar-Bookings, Welcome-Agent soll in 2h antworten.
- **Keine Dependency auf tracking.js**: popup.js ist standalone, kann einzeln oder parallel eingebunden werden.
- **Inline CSS**: kein CSS-Build-Schritt, keine Konflikte mit Website-Styles.

## Teil 4: Sonderzeichen Website Putzkolonne

**Ziel:** Alle em-dash und en-dash aus user-facing Strings im praxisnova-website Repo entfernen.

### Geliefert
- 11 Dateien geaendert (ca. 25 Zeilen):
  - `src/config/site.ts` (Kommentar)
  - `src/app/opengraph-image.tsx` (alt-text)
  - `src/app/page.tsx` (Launch-Banner)
  - `src/app/automatisierung/page.tsx` + 3 Unterseiten (bau, handwerk, immobilien)
  - `src/app/ueber-uns/page.tsx` (Metadata title + description)
  - `src/app/datenschutz/page.tsx`, `src/app/impressum/page.tsx` (Metadata)
  - `src/app/potenzialrechner/page.tsx` (Quiz-Labels und CTA)
- `WEBSITE-SONDERZEICHEN-FIXES.md`: Komplette Diff-Tabelle mit Datei/Zeile/Vorher/Nachher.

### Regeln angewendet
- Em-dash `—` in Prosa: durch Komma oder Punkt ersetzt.
- En-dash `–` in Zahlenbereichen (`5–10 Std.`): durch `bis` ersetzt.
- En-dash `–` als Prosa-Trennzeichen: durch Komma oder Doppelpunkt ersetzt.
- `&` bleibt erlaubt (nicht auf der Verbot-Liste), wurde aber teilweise zu `und` umgebaut wo natuerlicher.

### Blocker
- **6 Dateien haben uncommitted WIP** (Premium Redesign: Geist font, refined dark theme). Diese wurden **nicht angefasst**:
  - `src/app/globals.css`
  - `src/app/layout.tsx` **enthaelt noch en-dashes auf Zeile 15 und 24**
  - `src/components/Footer.tsx`
  - `src/components/Nav.tsx`
  - `src/components/Popup.tsx`
  - `tailwind.config.js`
- Angie muss nach dem Merge der WIP diese Stellen nachziehen. Exakte Patches in `WEBSITE-SONDERZEICHEN-FIXES.md` dokumentiert.

## Pre-flight / Post-flight Checks durchgefuehrt

- `grep -nE "[—–]"` ueber jeden Teil vor dem Commit: 0 Treffer (ausser in WIP-Dateien die nicht angefasst wurden).
- `npx tsc --noEmit` nach Teil 2 und Teil 3: keine neuen Fehler durch Paket-B-Code. Pre-existing Fehler in `anrufliste/page.tsx`, `email-tracking/page.tsx`, `lead/[id]/page.tsx` sind unveraendert (LECK-06 Territorium, nicht Paket-B-Scope).
- Code-Kommentare duerfen ASCII-Umlaute (ae/oe/ue) enthalten per Golden Rules. Wurde konsistent so gemacht.

## Offene Punkte / Follow-ups fuer Angie

1. **GOOGLE_CALENDAR_REFRESH_TOKEN + GOOGLE_CALENDAR_ID** in Vercel Env Vars setzen (sonst laeuft Teil 2 im `not_configured` Mode).
2. **Script-Tags einbinden** auf praxisnovaai.com:
   ```html
   <script async src="https://praxisnova-sales-control.vercel.app/tracking.js"></script>
   <script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
   ```
3. **WIP-Dateien in praxisnova-website mergen**, dann `layout.tsx` (Zeile 15 + 24) und ggf. Footer/Nav/Popup auf en-dashes nachpruefen (siehe `WEBSITE-SONDERZEICHEN-FIXES.md`).
4. **Calendly abklemmen** sobald Google Calendar Sync produktiv laeuft und mindestens 1 Test-Booking durchgegangen ist.
5. **Test-Run des Popups**: in DevTools `localStorage.removeItem('pn_popup_dismissed')`, dann 30s warten oder Maus zu den Tabs. Email eingeben, Sales-Tool pruefen.

## Was NICHT gemacht wurde (scope discipline)

Per Briefing explizit ausgeschlossen, also unberuehrt:
- Paket A / Apollo Refactoring.
- Vercel ENV Vars selbst setzen (ist Angie's Job).
- LECK-05 /settings Ampel umbauen (wurde nur um einen Eintrag erweitert, kein Refactoring).
- Paket C.
- Third-Party Analytics.
- Calendly selbst abklemmen.
