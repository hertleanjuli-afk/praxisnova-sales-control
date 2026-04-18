# Error-Catalogue

Chronologischer Katalog produktiver Fehler, jeder mit Root-Cause, Fix und Lessons.
Neueste Eintraege oben.

---

## 2026-04-18 LECK-17 Calendar OAuth Infinite ntfy-Push-Spam [P0 ACTIVE]

**Symptom:** Angies ntfy-iOS-App erhaelt alle 5 Minuten eine Push-Notification mit einem Calendar-OAuth-Fehler. Seit Adoption von PR #31 (Tech-Gaps T3 Calendar) in main am 2026-04-18.

**Blast Radius:**
- Angie's iPhone ist zum Spam-Geraet geworden (typisch 12 Pushes pro Stunde zwischen 06-22 Uhr)
- Risiko: Angie stumpft gegen echte Alerts ab, neue Errors werden uebersehen
- Kein Production-Data-Impact (Calendar-Sync war ohnehin broken)

**Root-Cause-Hypothese (aus 869b83f commit-msg, 2026-04-12):**
Der GOOGLE_CALENDAR_REFRESH_TOKEN wurde vermutlich mit `gmail.modify` scope generiert, nicht mit `calendar.readonly`. Jeder events.list Call wirft 401 "invalid_scope" oder aehnlich.
Diese Hypothese ist seit 6 Tagen dokumentiert aber nicht verifiziert/gefixt.

**Amplifier-Cause (2026-04-18):**
Tech-Gaps-T3-Adoption-PR #31 hat `observe.error({ critical: true })` in den Fatal-Catch-Block eingebaut. `observe.error` triggert via `notifyNtfy` + `notifySlack`. Ohne State-basiertes Alerting (3-fail-threshold) feuert das jedem Cron-Run durch. Cron-Schedule ist alle 5 Minuten zwischen 06-22 Uhr.

### Phase 1: Sofort-Mitigation (2026-04-18 abend)

- **Action:** Calendar-Sync-Cron-Eintrag aus `vercel.json` entfernt (Branch `hotfix/ntfy-calendar-spam`, PR-URL siehe unten)
- **Resultat:** Deployt automatisch nach Merge; Cron-Triggering stoppt, Route-Code bleibt intakt fuer Reauth
- **Dauer bis Fix wirksam:** abhaengig von Vercel-Deploy ca. 30-90 Sekunden
- **Rollback:** Re-add der Zeile in vercel.json. Falls der Underlying-OAuth-Fehler nicht gefixt ist, triggert der Spam sofort wieder

### Phase 2: Root-Cause-Diagnose (abgeschlossen 2026-04-18)

**Primaer-Befund (lokale ENV-Analyse):**

`.env.local` enthaelt:
- `GOOGLE_CALENDAR_CLIENT_SECRET` (gesetzt)
- `GOOGLE_CALENDAR_REFRESH_TOKEN` (gesetzt)
- `GOOGLE_CALENDAR_ID` (gesetzt)
- **`GOOGLE_CALENDAR_CLIENT_ID` FEHLT**

In `lib/google-calendar-client.ts:38-39` steht:
```
const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
```

Der Fallback-Pattern nutzt dann **Gmail Client-ID mit Calendar Client-Secret** beim Token-Refresh. Das ist ein **hybrider OAuth-State**, der garantiert `invalid_grant` oder `invalid_client` zurueckgibt, weil Google die Client-ID und das Client-Secret als Paar validiert. Dasselbe gilt wenn Vercel-Production nur `GOOGLE_CALENDAR_CLIENT_SECRET` aber keine `GOOGLE_CALENDAR_CLIENT_ID` hat.

**Sekundaer-Hypothese (aus 869b83f commit-msg, 2026-04-12):**
Scope-Mismatch. Selbst wenn der Client-ID-Fallback "funktioniert", ist der Refresh-Token moeglicherweise mit `gmail.modify` Scope generiert (weil er als Teil des Gmail-Flows geholt wurde), nicht mit `calendar.readonly`. events.list wirft dann 403.

**Warum der Spam erst seit 2026-04-18 passiert:**
Das OAuth-Problem ist latent seit mindestens 2026-04-12. Tech-Gaps-T3-Adoption (PR #31) hat `observe.error({ critical: true })` in den Fatal-Catch eingebaut, was ntfy-Priority=high triggert. Ohne State-basiertes Alerting (Dedup + Threshold) feuert jeder Cron-Run einen Push.

**Nicht-verifizierte Punkte (werden nach Angies Reauth gefuellt):**
- Exakte Google-Error-Response (`invalid_grant` vs `invalid_client` vs scope-specific)
- Vercel-Production-ENV-Snapshot (Angie muss `vercel env ls production` laufen lassen)
- Historisch: wann wurde der aktuelle GOOGLE_CALENDAR_REFRESH_TOKEN generiert, mit welchem Client

**Fix-Pfad:** Phase 3 (Reauth-Route) loest das Problem unabhaengig von der exakten aktuellen Fehler-Auspraegung, weil sie einen sauberen neuen OAuth-Flow mit korrektem Scope startet und den Token frisch schreibt.

### Phase 3: Permanenter Fix (geplant)

- Admin-Route `/api/admin/calendar-reauth` (`access_type=offline`, `prompt=consent`) fuer neuen Refresh-Token mit korrektem `calendar.readonly` scope
- Error-Handler mit State-basiertem Alerting: `agent_error_state`-Tabelle, erst bei 3 consecutive failures EIN Push, EIN Recovery-Push bei State-Change
- Cron-Schedule dauerhaft `0 */4 * * *` (alle 4h) statt `*/5 * * * *`
- Runbook `Agent build/RUNBOOK-CALENDAR-AGENT.md`

**Lessons (preliminary):**

1. **State-basiertes Alerting ist Pflicht** wenn `observe.error` + ntfy verbunden sind. Tech-Gaps-T3 hat den Push-Pfad eingebaut, aber nicht die Dedup-Logik. Jeder Push-Channel muss mindestens 3-fail-threshold + Cooldown haben.
2. **Refresh-Token + Scope gehoeren dokumentiert und getestet** — Scope-Mismatch war seit Commit 869b83f bekannt (2026-04-12) aber wurde nie verifiziert. Latent Defects wie dieses warten auf den Tag, an dem ein Amplifier (hier ntfy) sie unertraeglich macht.
3. **Cron-Frequenz an Risk-Profile anpassen** — Calendar-Buchungen kommen selten, 4h-Intervall reicht. 5-Minuten war Over-Provisioning aus Paket-B.
4. **Alert-Pfade brauchen Kill-Switch** — Angie braucht einen One-Click-Pause fuer ntfy. Folgen-Task: `POST /api/admin/mute-alerts?minutes=60`.

**Referenzen:**
- Ursprungs-Route: `app/api/cron/google-calendar-sync/route.ts`
- observe.error Pfad: `lib/observability/logger.ts`
- Tech-Gaps-T3-PR: #31
- Ursprungs-Diagnose commit: 869b83f (2026-04-12)

---
