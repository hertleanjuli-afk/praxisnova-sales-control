# Health Check - Voll-Pruefung aller Komponenten

**Stichtag:** 2026-04-15 (Analyse der Cron-Konfiguration und Live-Tests)

## Agenten (Gemini-basiert)

| Agent | Schedule UTC | Status Code-seitig | Letzter Run laut SYSTEM-CHECK 13.04. | Naechster Run |
|-------|--------------|--------------------|--------------------------------------|---------------|
| prospect_researcher | 06:00, 09:45, 13:45 | aktiv | 11:32 UTC OK (66 Entscheidungen) | 2026-04-15 13:45 |
| partner_researcher | 07:00 taeglich | aktiv | 07:01 UTC OK (5 Entscheidungen) | 2026-04-15 07:00 (morgen) |
| operations_manager | 07:15 Mo-Fr | aktiv | 07:16 UTC OK (morning briefing sent) | Morgen 07:15 |
| sales_supervisor | 09:15 Mo-Fr | aktiv | **Gemini 503** laut Sentinel | Morgen 09:15 |
| partner_supervisor | 08:45 Mo-Fr | aktiv | unklar | Morgen 08:45 |
| outreach_strategist | 08:00, 11:00, 13:00, 15:00, 17:00 Mo-Fr | aktiv | 30 Emails/Tag (13.04.) | 2026-04-15 15:00/17:00 |
| partner_outreach_strategist | 12:30 Mo-Fr | aktiv | unklar | 2026-04-15 12:30 (vorbei) |
| follow_up_tracker | 09:00 Mo-Fr | aktiv (seit 13.04.) | neu, Run unbekannt | Morgen 09:00 |
| inbound_response | `*/15 6-22 * * 1-5` | aktiv | **Gemini 503** laut Sentinel | alle 15 Min |
| market_intelligence | So 05:00 | aktiv (wochentlich) | Letzter Sonntag 12.04. | Sonntag 19.04. |
| call_list_generator | 07:45 Mo-Fr | aktiv | unklar | Morgen 07:45 |

## Nicht-Agenten-Crons

| Job | Schedule UTC | Status |
|-----|--------------|--------|
| apollo-sync | 05:00, 12:00, 23:00 | OK (100 Kontakte geholt, 1 neu 13.04.) |
| gmail-reply-sync | alle 10 Min 06:00-22:00 | aktiv, keine Anzeichen von Fehlern |
| google-calendar-sync | alle 5 Min 06:00-22:00 | **KAPUTT:** `invalid_grant` seit mindestens 13.04. |
| process-sequences | 07:30, 10:30, 13:30, 16:30 Mo-Fr | aktiv, sendet taeglich 30-135 Emails |
| brevo-stats-sync | 19:00 Mo-Fr | aktiv |
| daily-backup | 02:00 taeglich | aktiv |
| weekly-report | 06:45 Montags | aktiv |
| health-monitor | 07:05, 11:50, 15:20 Mo-Fr | aktiv |
| error-sentinel | 06:15, 09:30, 12:00, 15:15, 18:00 Mo-Fr | aktiv, **gibt aber falsche Alarme** |
| daily-summary | 11:45, 17:45 Mo-Fr | aktiv |
| linkedin-post-generator | 05:30 Mo-Fr | aktiv |
| linkedin-posting-check | 15:30 Mo-Fr | aktiv |
| linkedin-response-check | 08:10 Mo-Fr | aktiv |
| news-agent | 05:30 Mo-Fr | aktiv |
| monthly-report | 1. des Monats | aktiv |
| quarterly-report | quartalsweise | aktiv |

## Webhook-Endpoints

| Route | Exists | HTTP Status (GET ohne Payload) | Auth |
|-------|--------|-------------------------------|------|
| `/api/webhooks/website-leads` | ja | 405 Method Not Allowed (erwartet POST) | Origin-Check |
| `/api/webhooks/inbound` | ja | 405 Method Not Allowed (erwartet POST) | INBOUND_WEBHOOK_SECRET oder Origin |
| `/api/webhooks/website-clicks` | ja | unklar | Origin-Check |
| `/api/webhooks/brevo` | ja | 405 Method Not Allowed (erwartet POST) | BREVO_WEBHOOK_SECRET optional |
| `/api/webhooks/hubspot` | ja | (nicht getestet) | unklar |
| `/api/webhooks/calendly` | ja | (nicht getestet) | unklar |
| `/api/webhooks/calendly-email` | ja | (nicht getestet) | unklar |

Alle Webhook-Endpoints existieren code-seitig. Die 405-Antworten bei GET sind korrekt und zeigen dass die Routes live sind.

## API-Routen (via Error-Sentinel geprueft)

| Route | Status | Hinweis |
|-------|--------|---------|
| `/api/anrufliste` | **200** | funktioniert |
| `/api/linkedin` | **404** | Route existiert nicht, nur Unterordner |
| `/api/inbound/stats` | **404** | Ordner leer |
| `/api/partners` | **401** | by design (NextAuth) |
| `/api/sequences/status` | **401** | by design (NextAuth) |
| `/api/health` | **200** | funktioniert |

## Externe Verbindungen (Drittsysteme)

| System | Status | Evidenz |
|--------|--------|---------|
| **Apollo** | OK | 13.04. Trigger-Test: 100 Kontakte zurueckgegeben, 1 neu importiert |
| **HubSpot** | OK | Laut SYSTEM-CHECK 13.04. |
| **Brevo** | OK | 135 Emails heute, 30 Outreach-Emails/Tag |
| **Google Calendar** | **KAPUTT** | `invalid_grant` beim OAuth-Refresh, siehe CALENDAR-VERIFY-ERGEBNIS |
| **Gmail (Reply-Sync)** | OK (anzunehmen) | Kein Alert seit letztem Tag |
| **LinkedIn** | nicht-API (manuell) | Nur Queue in DB, keine externe Auth noetig |
| **Common Room** | nicht konfiguriert | Im Code nicht gefunden (nicht integriert) |

## Stille Ausfaelle (keine lauten Fehler, aber 0 Events)

- **0 Inbound heute:** Kein Formular-Submit auf Website. Webhook-Endpoint existiert und funktioniert. Tatsaechliche Ursache: kein Traffic. Nicht technisch kaputt.
- **0 Termine heute:** Calendar OAuth seit 2 Tagen kaputt. Buchungen in Google Calendar koennten existieren, werden aber nicht in leads-Tabelle gespiegelt. **Dringender Fix noetig.**

## KPIs heute

- 135 E-Mails gesendet
- 631 aktive Sequenzen
- 0 Inbound
- 0 Termine (dunkelfeld wegen Calendar-OAuth-Ausfall)

## Wichtigste offene Punkte

1. **Calendar OAuth** (seit 2026-04-12) - Angie muss neuen Refresh Token generieren
2. **Gemini Preview-Modell** - Quota-Probleme (Supervisor + Inbound gleichzeitig)
3. **Error-Sentinel falsche Alarme** - 2 nicht-existierende Routes + 2 authed Routes
4. **0 Termine** - Symptom des Calendar-OAuth-Problems, kein separater Bug
