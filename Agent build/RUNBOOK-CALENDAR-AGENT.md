# Runbook: Google Calendar Sync Agent

**Owner:** Claude Code (LECK-17 Fix, 2026-04-18)
**Agent-Name:** `calendar_oauth` (alert-state Tabelle)
**Cron-Route:** `app/api/cron/google-calendar-sync/route.ts`
**Schedule:** `0 */4 * * *` (alle 4h). Vorher war es alle 5 Min, was LECK-17 ausgeloest hat.

---

## Normal-Betrieb

Der Cron laeuft 6x am Tag (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC). Pro Run:

1. `reportAgentSuccess('calendar_oauth', ...)` bei OK -> setzt `consecutive_failures=0`
2. `reportAgentFailure('calendar_oauth', ...)` bei Fail -> inkrementiert Counter
3. Push kommt **nur** wenn Counter >= 3 **und** letzter Push > 60min her

Heisst: mindestens 12h (3 * 4h) Silent-Period bevor erster Push. Dann ein Push pro Stunde bis Issue behoben.

---

## Incident: ntfy-Push `[calendar_oauth] error`

### Schritt 1: Schnell-Triage (1 Min)

Check Slack/ntfy-Push-Body auf `context.err` Feld:

| Error-Inhalt | Diagnose |
|---|---|
| `invalid_grant` | Refresh-Token expired/revoked. -> Schritt 3 (Reauth) |
| `invalid_client` | Client-ID/Secret-Mismatch in Vercel-ENV. -> Schritt 2 (ENV-Check) |
| `401` bei events.list | Scope-Mismatch: Token wurde mit falschem Scope generiert. -> Schritt 3 (Reauth) |
| `403 insufficient authentication` | gleiche Ursache wie 401. -> Schritt 3 |
| timeout / 503 | upstream Google-Issue. Alert kann ignoriert werden, nach 60 min Cooldown kommt ggf. zweiter. Falls drei Alerts in 4h: Schritt 3 (gleiche Reauth-Flow) |
| `missing_vars: [...]` | ENV in Vercel nicht gesetzt. -> Schritt 2 |

### Schritt 2: ENV-Check in Vercel

```
vercel env ls production | grep GOOGLE_CALENDAR
```

Erwartet:
- `GOOGLE_CALENDAR_CLIENT_ID` gesetzt
- `GOOGLE_CALENDAR_CLIENT_SECRET` gesetzt
- `GOOGLE_CALENDAR_REFRESH_TOKEN` gesetzt
- `GOOGLE_CALENDAR_ID` gesetzt (z.B. `hertle.anjuli@praxisnovaai.com`)

Falls eine fehlt: Wert aus 1Password holen oder Schritt 3.

**Wichtig:** CLIENT_ID und CLIENT_SECRET muessen zum **gleichen OAuth-Client** gehoeren. Wenn CLIENT_ID fehlt und der Lib-Fallback auf `GMAIL_CLIENT_ID` greift, dann hat der Calendar-SECRET ein anderes Paar -> invalid_grant. **Das war LECK-17.**

### Schritt 3: OAuth Reauth-Flow

1. Im Browser einloggen mit Angies Google-Account (mit dem der Calendar verbunden ist).

2. Browser-Extension installieren oder verwenden (ModHeader, Requestly, etc.), die Request-Header setzt.

3. Header setzen:
   ```
   Authorization: Bearer $CRON_SECRET
   ```
   (CRON_SECRET aus 1Password oder `vercel env ls production | grep CRON_SECRET`)

4. URL aufrufen:
   ```
   https://praxisnova-sales-control.vercel.app/api/admin/calendar-reauth
   ```
   -> Weiterleitung auf Google Consent-Screen.

5. Mit dem Google-Account zustimmen, der den Kalender besitzt.

6. Google redirected auf `/api/admin/calendar-reauth/callback`. Die Seite zeigt den neuen `refresh_token` in einer Textarea an, plus den angefragten Scope. Scope muss `https://www.googleapis.com/auth/calendar.readonly` sein.

7. Token kopieren.

8. In Vercel > Project Settings > Environment Variables:
   - Variable `GOOGLE_CALENDAR_REFRESH_TOKEN` fuer **Production + Preview** updaten
   - Auf "Save" klicken (triggert Re-Deploy automatisch)

9. Den Browser-Tab mit dem Token schliessen (nicht im Verlauf lassen).

10. Warten auf naechsten Cron-Run (alle 4h ab naechstem 0. Minute). Beim Erfolg kommt ein `recovery` ntfy-Push mit Priority=default.

### Schritt 4: Wenn Reauth nicht hilft

- Google Account > Security > Third-party-app-access > "Claude Code" (oder wie der OAuth-Client heisst) > "Remove Access"
- Dann Schritt 3 erneut durchfuehren. Das erzwingt wirklich neuen Flow ohne Konsistenz mit alten Tokens.
- Falls immer noch invalid: in Google Cloud Console > Credentials > OAuth 2.0 Clients pruefen, ob Client-ID/Secret mit Vercel-ENV matchen.

---

## Cron-Freigabe nach Reauth

Der Cron laeuft automatisch alle 4h. Kein manueller Trigger noetig. Falls Sofort-Test gewuenscht:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://praxisnova-sales-control.vercel.app/api/cron/google-calendar-sync
```

Erwartete Response bei OK:
```json
{ "ok": true, "status": "completed", "events_checked": ..., "new_leads": ... }
```

---

## State zuruecksetzen (manuell)

Falls der alert-state die Tabelle in Schieflage gebracht hat und keine Push mehr kommen obwohl broken:

```sql
DELETE FROM agent_error_state WHERE agent_name = 'calendar_oauth';
```

Danach funktioniert das Alerting wie beim ersten Lauf (3-fail-threshold startet neu).

---

## Historie

- 2026-04-12 commit 869b83f: Scope-Mismatch-Hypothese dokumentiert, nicht verifiziert
- 2026-04-18 T3-Adoption (PR #31): observe.error mit ntfy-Priority=high eingebaut, Spam-Trigger scharfgestellt
- 2026-04-18 LECK-17: Spam aktiv, Sofort-Mitigation via cron-disable (PR #33)
- 2026-04-18 dieser Fix: alert-state + Reauth-Route + 4h-Cron (PR #TBD)

---

## Health-Probing (optional Phase-4)

Noch nicht implementiert: separater Health-Check alle 30min, der NICHT pushed aber den Agent-State in einem Dashboard-Endpoint zeigt. Scope von Phase 4.
