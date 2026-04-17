# Runbooks Tech-Gaps 2026-04-18

**Owner:** Claude Code (T-Gaps T1-T4)
**Adressat:** Angie, Samantha (Manual-Triage), zukuenftiger Operations-Manager-Agent (Auto-Triage)
**Verbindlich ab:** Wenn die jeweiligen PRs gemerged sind.

Drei Runbooks. Jeweils kurz, action-oriented. Enthaelt Diagnose, Eskalations-Pfad, Rollback-Schritt.

---

## Runbook A — Slack-Alert ist angekommen, was tun?

**Kontext:** T3 hat `observe.error()` ausgeloest und an `SLACK_ALERT_WEBHOOK` gesendet. Im Slack-Channel steht ein Eintrag im Format:

```
🚨 *<agent_name>* :: `<skill_id>`
<message>
```{ context }```
```

### Schritt 1 — Severity einschaetzen (max 1 min)

Lies die `agent` und `message` Felder. Drei Kategorien:

| Pattern | Severity | Aktion |
|---|---|---|
| `agent=outreach_strategist`, message enthaelt "draft", "brand-voice", "send" | **HOCH** — Customer-facing, Risiko Lead-Verlust | Schritt 2 sofort |
| `agent=lead_ingestor`, message enthaelt "apollo", "enrich", "validate" | **MITTEL** — Pipeline-Auffuellung blockiert | Schritt 2 in 1h |
| `agent=health_checker`, `agent=operations_manager`, anderes | **NIEDRIG** — interne Beobachtung | Sammeln, am Ende des Tages reviewen |

### Schritt 2 — Recent-Errors-Endpoint pruefen (max 3 min)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://praxisnova-sales-control.vercel.app/api/observability/recent-errors?limit=20
```

Suche nach:
- **Wiederholungs-Pattern:** kommt der gleiche Error mehrfach in 10 Min? -> Spike-Incident
- **Lead-spezifisch:** `lead_id` Feld gesetzt? -> isoliertes Problem, nicht systemisch
- **Cluster:** mehrere `error_type` Werte gleichzeitig? -> moeglicher Upstream-Outage (Apollo, Brevo, Gmail)

### Schritt 3 — Eskalations-Entscheidung

| Befund | Aktion |
|---|---|
| 1 Error, lead-spezifisch, kein wiederholtes Pattern | Lead manuell pruefen, nichts weiter tun. Ggf. ticket-triage manuell. |
| 5+ gleicher Error in 10 Min, gleicher Agent | Cron-Trigger des Agents pausieren via Vercel-Dashboard (Settings -> Cron -> Pause). Slack-Channel "investigating" posten. |
| Cluster, mehrere Agents, gleicher externer Service erwaehnt (Apollo/Brevo/Gmail) | Status-Page des Services pruefen (apollostatus.io, status.brevo.com, googleapps.workspace) BEVOR du eigene Routes anfaesst. |
| Memory-Hygiene-Stale (siehe Runbook B) | Runbook B befolgen |
| Error im Slack steht nur "slack webhook non-ok" oder "slack webhook threw" | Nur Slack-Send selbst war broken, eigentlicher Error ist trotzdem in error_logs. Slack-Webhook-Konfig pruefen. |

### Rollback (Plan B falls Eskalation eskaliert)

- Wenn ein Agent permanent broken: in `vercel.json` den Cron-Eintrag temporaer auskommentieren, deployen.
- Wenn alle Agents broken: `SLACK_ALERT_WEBHOOK` ENV in Vercel temporaer entfernen damit Channel nicht zu-spammed wird, separat in Logs forschen.

### Wo nachlesen

- Quelle Slack-Format: `lib/observability/logger.ts` `notifySlack()`
- Recent-Errors Endpoint: `app/api/observability/recent-errors/route.ts`
- error_logs Tabelle: `lib/db.ts` Schema, `lib/error-notify.ts` Producer

---

## Runbook B — Memory-Fact wurde als stale gemeldet, was tun?

**Kontext:** T4 hat `verifyMemoryFacts` aufgerufen, ein Fact gab `false` zurueck, der Logger schreibt:

```json
{"level":"warn","msg":"memory fact stale","agent":"<X>","fact_id":"<Y>","description":"<Z>","duration_ms":42}
```

### Schritt 1 — Fact-ID nachschlagen (max 2 min)

Oeffne `docs/memory-hygiene-checks.md` und suche die `fact_id`. Pro Fact ist dort die "Failure-Bedeutung" und der "ESC"-Pfad dokumentiert.

Beispiel-Mapping:

| fact_id | Failure-Bedeutung | Sofort-Aktion |
|---|---|---|
| `lead_ingestor.apollo_endpoint_active` | APOLLO_API_KEY fehlt oder ist invalid | Vercel-ENV pruefen, ggf. Apollo-Dashboard Key regenerieren |
| `lead_ingestor.leads_table_exists` | Neon-DB nicht erreichbar oder Schema-Migration fehlt | Neon-Console oeffnen, `\dt leads` |
| `outreach_strategist.brevo_sender_configured` | Keine BREVO_SENDER_EMAIL_* gesetzt | Vercel-ENV `BREVO_SENDER_EMAIL_FALLBACK=hertle.anjuli@praxisnovaai.com` setzen |
| `outreach_strategist.icp_segments_match_master_plan` | leads-Tabelle hat noch alte Bau/Handwerk-Segmente vorherrschend | Anrufliste-Filter pruefen, evtl. Re-Segmentation-Run |
| `outreach_strategist.gemini_model_configured` | GEMINI_API_KEY fehlt | Vercel-ENV setzen, ggf. Google AI Studio Key regenerieren |
| `reply_detector.gmail_oauth_configured` | OAuth-Token expired oder revoked | Hoechste Prio. Gmail-OAuth-Flow neu starten (siehe `Agent build/code-changes/SETUP-gmail-reply-sync.md`) |
| `reply_detector.email_log_table_exists` | Neon-Schema-Drift | Wie `lead_ingestor.leads_table_exists` |
| `reply_detector.processed_label_name_consistent` | Statisch, sollte nie failen | Codebase-Suche auf geaenderte String-Konstanten |

### Schritt 2 — Entscheidung Stale vs. Verify-Failed

- **`status=stale`** = Fact-Funktion hat `false` zurueckgegeben. Bedeutung: Fact existiert noch, ist aber falsch.
- **`status=verify_failed`** = Fact-Funktion hat geworfen oder Timeout. Bedeutung: wir wissen nicht, ob der Fact noch stimmt. Behandeln wie stale + zusaetzlich Slack-Alert (T3-Integration).

In beiden Faellen: Agent-Run war NICHT geblockt. Schaue in den Run-Output, ob der Agent auf Fallback gewechselt ist (siehe Runbook C wenn Apollo der Stale ist).

### Schritt 3 — Fix oder Suppress

| Stale-Quelle | Fix-Pfad |
|---|---|
| ENV-Variable fehlt | Vercel-ENV setzen, naechster Cron-Run probt automatisch |
| DB-Tabelle fehlt | Schema-Migration vorbereiten, Angie ausfuehren lassen |
| API-Endpoint geaendert | `lib/<client>.ts` URL aktualisieren, PR oeffnen |
| Master-Plan-Drift (z.B. neue ICP-Segmente) | Datenmigration in DB schreiben, Fact-Verify-Logik anpassen |

### Wenn der Fact bewusst veraltet ist (Plan-Aenderung)

Update `lib/memory/agent-facts.ts`: Fact-Funktion an neue Realitaet anpassen ODER Fact entfernen wenn der Check obsolet ist. Dokumentations-Update in `docs/memory-hygiene-checks.md` ist Pflicht.

### Wo nachlesen

- Verifier-Logik: `lib/memory/hygiene.ts` `verifyMemoryFacts()`
- Pro-Agent Facts: `lib/memory/agent-facts.ts`
- Doku: `docs/memory-hygiene-checks.md`

---

## Runbook C — Apollo gibt 429, welche Eskalation?

**Kontext:** T2 retryt automatisch bis zu 5x. Wenn nach 5 Versuchen immer noch 429: Logger schreibt:

```json
{"level":"error","msg":"retry exhausted","label":"apollo","attempts":5,"err":"Apollo API Fehler (429): rate limited"}
```

Das ist KEIN automatischer Slack-Alert (der kommt nur wenn ein Agent-Code `observe.error` ruft, nicht aus dem Retry-Logger). Beobachtung daher manuell oder via Health-Checker.

### Schritt 1 — Spike vs. permanent Block (max 5 min)

```bash
# Wie viele Apollo-bezogene Errors in den letzten 60 Min?
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://praxisnova-sales-control.vercel.app/api/observability/recent-errors?error_type=APOLLO_429&limit=50"
```

(Hinweis: `error_type` ist erst nach Adoption in `lib/error-notify.ts` strukturiert. Bis dahin manuell durch `error_logs` filtern.)

| Befund | Diagnose |
|---|---|
| 1-3 Errors in 60 Min | Normaler Spike, retry funktioniert. Nichts tun. |
| 5+ Errors in 60 Min | Persistent Rate-Limit, Apollo-Plan voll. Schritt 2 |
| 20+ Errors in 60 Min | Apollo-Account moeglicherweise gesperrt (Quota oder Abuse-Block). Schritt 3 |

### Schritt 2 — Persistent Rate-Limit (Plan-Limit erreicht)

1. Apollo-Dashboard oeffnen: https://app.apollo.io/#/settings/billing -> "API usage" pruefen
2. Wenn Tageslimit erreicht: WARTEN bis Mitternacht UTC. Apollo-Sync-Cron in `vercel.json` stundenweise pausieren bis Reset.
3. Wenn Monatslimit erreicht: Plan-Upgrade (Operator-Plan ab USD 39/mo). KEINE Up-Front-Buchung ohne Angies Freigabe.
4. Bypass-Strategie: Lead-Sourcing fuer den Tag auf manuelle Liste umstellen (Lead-Magnets, LinkedIn-DMs aus Pipeline-Reaktivierung).

### Schritt 3 — Account-Block

1. Apollo-Support kontaktieren (support@apollo.io). Subject: "API quota issue, urgent". Body: API-Key-Praefix (NIE den vollen Key in Email).
2. Waehrend Block: Apollo-Cron komplett pausieren. Lead-Sourcing nur via Lead-Research-Assistant Skill + manuelle LinkedIn-Recherche.
3. Wiederaufnahme nach Apollo-Bestaetigung. ENV-Variable `APOLLO_API_KEY` ggf. mit neuem Key aktualisieren.

### Schritt 4 — Workaround mit Fallback (T1-Integration nach Adoption)

Wenn `lead_ingestor` Agent T1-fallback adoptiert hat: Apollo-Failure triggert automatisch den `legacy_apollo_pipeline` Fallback. Per-Default ist das aktuell ein `{ leads_imported: 0 }` Stub. Hier eine spaetere Iteration soll den Fallback durch echte Common-Room oder LinkedIn-Sales-Navigator-Logik ersetzen.

### Praeventiv

- Apollo-Quota-Telemetrie wochentlich pruefen (Apollo-Dashboard -> API usage)
- T2 retry mit baseDelay 1500ms ist defensive, sollte 99% der 429s schlucken
- Alternative Lead-Quellen vorbereiten (Common-Room-Plugin, LinkedIn-Sales-Navigator) BEVOR Apollo eskaliert

### Wo nachlesen

- Retry-Logik: `lib/util/retry.ts` `retryApollo()`
- Apollo-Search-Site: `lib/apollo.ts` `searchPeople()`
- Apollo-Migration-Historie: Header-Comment in `lib/apollo.ts` (URL-History 2024-2026)

---

**Status:** Drei Runbooks fuer die drei haeufigsten erwarteten Tech-Gap-Scenarios. Sollten neue Patterns auftreten, hier ergaenzen statt parallele Doku zu schreiben.

**Naechste Iteration:** Nach 30 Tagen Production-Erfahrung sollten die Runbooks anhand echter Incidents nachjustiert werden (Cycle-Time, Slack-Format-Anpassungen, neue Eskalations-Pfade).
