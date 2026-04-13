# System-Check 2026-04-13 Nachmittag (12:42-12:55 UTC)

## Gesamtstatus: OPERATIV - Agenten laufen, E-Mails werden gesendet

---

## Check 1: Apollo Sync - Leads geladen

**Status: OK**

Manueller Trigger ausgefuehrt um 12:43 UTC:
- 100 Kontakte von Apollo abgerufen
- 1 neuer Lead importiert
- 99 Duplikate uebersprungen (Pool ist weitgehend abgegrast)
- Config: immobilien-mgmt, Seite 5
- Dauer: 1 Sekunde

Apollo Sync funktioniert korrekt. Die niedrige Neuimport-Zahl ist normal bei Seite 5 der Immobilien-Management Rotation.

---

## Check 2: Outreach-Sequenzen - E-Mails werden gesendet

**Status: OK**

Outreach-Strategist Aktivitaet heute:
- **30 personalisierte Outreach-E-Mails gesendet** (Ziel: 20-45/Tag)
- 09:xx UTC: 15 E-Mails
- 11:xx UTC: 15 E-Mails
- Naechster Outreach-Slot: **13:00 UTC** (in ca. 10 Min)
- Weitere Slots: 15:00, 17:00 UTC

Gesamt-Wochenzahlen (aus agent-metrics):
- 751 E-Mails gesendet diese Woche
- 633 aktive Sequenzen
- 799 Leads in Pipeline
- Open Rate: 5.5%

---

## Check 3: Google Calendar - Fatal Error DIAGNOSTIZIERT

**Status: FEHLER - Angie muss handeln**

Fehler bei manuellem Trigger-Test:
```
Error: Google Calendar OAuth token refresh failed: 401
"error": "invalid_client"
"error_description": "The provided client secret is invalid."
```

**Root Cause gefunden:**
Angie hat am 12.04. einen separaten OAuth-Client fuer Calendar erstellt:
- `GOOGLE_CALENDAR_CLIENT_SECRET` = gesetzt (separater Client, vor 19h)
- `GOOGLE_CALENDAR_CLIENT_ID` = NICHT GESETZT

Der Code versucht `GMAIL_CLIENT_ID` + `GOOGLE_CALENDAR_CLIENT_SECRET` zu kombinieren, aber diese gehoeren zu verschiedenen OAuth-Clients.

**Fix im Code deployed** (Commit `da9df92`): Code prueft jetzt auch `GOOGLE_CALENDAR_CLIENT_ID`.

**Was Angie tun muss:**
1. Google Cloud Console oeffnen
2. Den OAuth-Client finden, zu dem `GOOGLE_CALENDAR_CLIENT_SECRET` gehoert
3. Die Client-ID dieses Clients kopieren
4. In Vercel als `GOOGLE_CALENDAR_CLIENT_ID` setzen (Production, Preview, Development)
5. Danach testen: Calendar-Cron sollte beim naechsten 5-Min-Intervall funktionieren

**ALTERNATIV** (einfacher, wenn der Gmail-Client calendar.readonly Scope hat):
1. `GOOGLE_CALENDAR_CLIENT_SECRET` in Vercel loeschen
2. Refresh-Token neu generieren mit GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + calendar.readonly Scope
3. Neuen Token als `GOOGLE_CALENDAR_REFRESH_TOKEN` in Vercel setzen

---

## Check 4: Agenten-Status Uebersicht

| Agent | Letzter Run (UTC) | Status | Naechster Run heute |
|-------|-------------------|--------|---------------------|
| prospect_researcher | 11:32 | OK (66 Entscheidungen) | 13:45 |
| partner_researcher | 07:01 | OK (5 Entscheidungen) | morgen 07:00 |
| operations_manager | 07:15* | OK (Report geschrieben) | morgen 07:15 |
| sales_supervisor | 09:01 | OK (2 Entscheidungen) | 14:30 |
| partner_supervisor | 08:45 | OK (2 Entscheidungen) | morgen 08:45 |
| outreach_strategist | 11:02 | OK (30 E-Mails) | **13:00** |
| partner_outreach | 12:31 | OK (5 Partner kontaktiert) | morgen 12:30 |
| inbound_response | 08:02* | OK (kein Inbound) | 14:00 |
| follow_up_tracker | - | NEU (erster Run morgen) | morgen 09:00 |
| google_calendar_sync | 12:43 | FEHLER (invalid_client) | alle 5 Min |
| apollo_sync | 12:43 | OK (1 Lead) | 23:00 |

*Zeiten aus Reports/Decisions abgeleitet

## Verbleibende Cron-Slots heute (ab 12:55 UTC)

- 13:00 outreach-strategist (E-Mails)
- 13:30 process-sequences (Sequenz-Verarbeitung)
- 13:45 prospect-researcher (Lead-Qualifizierung)
- 14:00 inbound-response
- 14:30 sales-supervisor
- 15:00 outreach-strategist (E-Mails)
- 15:15 error-sentinel
- 15:20 health-monitor
- 15:30 linkedin-posting-check
- 16:30 process-sequences
- 17:00 outreach-strategist (E-Mails)
- 17:30 inbound-response
- 17:45 daily-summary
- 18:00 error-sentinel
- 19:00 brevo-stats-sync

---

## System-Gesundheit

- **Datenbank:** Connected, 15ms Latenz
- **Build:** Erfolgreich (Commit da9df92)
- **Deployment:** Production ready

## Noch offen

1. **GOOGLE_CALENDAR_CLIENT_ID** in Vercel setzen (Angie)
2. **Brevo Webhook Event-Mapping** verifizieren nach naechstem Webhook-Event
3. **Follow-Up-Tracker** erster Lauf morgen 09:00 UTC beobachten
4. **Cron-Timing** morgen frueh 504-Fehler pruefen
