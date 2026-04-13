# Session-Ergebnis 2026-04-13 - Agenten-Fixes

Datum: 13. April 2026
Vorgaenger: DIAGNOSE-2026-04-13-AGENTEN-AUSFALL.md

## Zusammenfassung

5 Fixes bearbeitet. 3 Code-Aenderungen, 1 Befund fuer Angie, 1 bereits geloest.

---

## Fix 1: Google Calendar Fatal Error - OFFEN (Angie muss handeln)

**Befund:** Der Code ist korrekt. `lib/google-calendar-client.ts` hat graceful degradation - wenn ENV-Variablen fehlen, returned `not_configured` ohne Crash. Der "Fatal Error" tritt NUR auf wenn alle 4 Credentials existieren aber der API-Call fehlschlaegt.

**Benoetigte ENV-Variablen:**
- `GMAIL_CLIENT_ID` - bestaetigt vorhanden
- `GMAIL_CLIENT_SECRET` - Status unbekannt, PRUEFEN
- `GOOGLE_CALENDAR_REFRESH_TOKEN` - Status unbekannt, PRUEFEN
- `GOOGLE_CALENDAR_ID` - Status unbekannt (Wert: z.B. `hertle.anjuli@praxisnovaai.com`)

**Naechste Schritte fuer Angie:**
1. Vercel Dashboard oeffnen, alle 4 ENV-Variablen pruefen
2. Falls `GOOGLE_CALENDAR_REFRESH_TOKEN` fehlt: OAuth-Bootstrap erneut mit Scope `calendar.readonly`
3. Falls alle existieren: Token muss mit demselben OAuth-Client generiert sein wie `GMAIL_CLIENT_ID`

---

## Fix 2: Brevo Webhook - BEHOBEN (Code + Event-Mapping)

**Befund:** Die optionale Signatur-Validierung war bereits implementiert. Die 203 Failed Webhooks hatten wahrscheinlich zwei Ursachen:
1. Historische Failures vor dem Deploy der optionalen Validierung
2. Event-Name-Mismatch: Brevo sendet `click`, `hard_bounce`, `soft_bounce` - unser Code erwartete `clicked`, `hardBounce`, `softBounce`

**Aenderung:** Event-Name-Normalisierung hinzugefuegt (`EVENT_MAP`) die alle Brevo-Formate auf unsere internen Namen mappt. Zusaetzlich `delivered` und `deferred` Events als neue Handler.

**Datei:** `app/api/webhooks/brevo/route.ts`

---

## Fix 3: Apollo manueller Trigger - BEHOBEN

**Aenderung:** `app/api/trigger/apollo-sync/route.ts` erstellt.
- Auth via `x-admin-secret` Header oder `?secret=` Query-Param
- Ruft intern den Apollo Sync Cron-Handler auf
- Unterstuetzt GET und POST

**Test-Befehl:**
```
curl -H "x-admin-secret: $ADMIN_SECRET" https://praxisnova-sales-control.vercel.app/api/trigger/apollo-sync
```

---

## Fix 4: Follow-Up-Tracker - BEHOBEN (neu erstellt)

**Aenderung:** Komplett neue Route und Agent-Instruktionen erstellt.

**Dateien:**
- `app/api/cron/follow-up-tracker/route.ts` - Cron-Handler mit Gemini-Agent
- `.agents/follow-up-tracker.md` - Agent-Instruktionen

**Logik:** Der Agent laedt Leads in "In Outreach", prueft ob sie in den letzten 48h vom Outreach Strategist kontaktiert wurden, und entscheidet:
- sequence_step < 3 ohne Signale: belassen
- sequence_step >= 3 ohne Signale: nach "Nurture" verschieben
- sequence_step >= 5: nach "Wieder aufnehmen" verschieben
- Mit Engagement-Signalen: Prioritaet erhoehen

**Cron-Slot:** 09:00 UTC Mo-Fr (in vercel.json eingetragen)

---

## Fix 5: Cron-Timing Staffelung - BEHOBEN

**Problem:** Um 07:00 UTC starteten 3 AI-Agenten gleichzeitig (outreach-strategist, partner-researcher, call-list-generator). Gemini Rate Limits fuehrten zu 504 Timeouts.

**Aenderung:** `vercel.json` komplett neu organisiert:
- AI-Agenten haben jetzt mindestens 15 Minuten Abstand
- 07:00-Kollision aufgeloest: partner-researcher 07:00, operations-manager 07:15, call-list-generator 07:45, outreach-strategist 08:00
- Prospect-Researcher: 3 Laeufe statt 4, besser verteilt (06:00, 09:45, 13:45)
- Outreach-Strategist: 5 Laeufe (08:00, 11:00, 13:00, 15:00, 17:00)
- Follow-Up-Tracker: 09:00 UTC (neuer Slot)
- Nicht-AI Crons (DB-only) koennen dichter gestaffelt bleiben

---

## Noch offen

1. **Google Calendar ENV-Variablen** - Angie muss in Vercel pruefen und ggf. OAuth-Bootstrap wiederholen
2. **Brevo Webhook 203 Failures** - nach Deploy beobachten ob neue Webhooks durchkommen
3. **Follow-Up-Tracker** - nach Deploy im naechsten Cron-Slot (09:00 UTC) Logs pruefen
4. **Cron-Timing** - morgen frueh Vercel Logs auf 504er pruefen

## Build-Status

`npm run build` erfolgreich. Vorbestehende TS-Fehler in linkedin-posting, partners, strategic-updates (nicht von dieser Session verursacht).
