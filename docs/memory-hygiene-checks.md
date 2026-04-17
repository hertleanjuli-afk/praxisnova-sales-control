# Memory-Hygiene-Checks pro Agent

**Owner:** Claude Code (T4 Tech-Gaps, 2026-04-18)
**Quelle:** `lib/memory/agent-facts.ts`
**Aufgerufen von:** `lib/memory/hygiene.ts` `verifyMemoryFacts(facts, context)`

---

## Ziel

Vor jedem LLM-Agent-Run wird eine Schnell-Verifikation der wichtigsten 3 Facts ausgefuehrt. Wenn ein Fact nicht mehr stimmt:

- Status `stale`: Fact existiert noch, ist aber falsch (z.B. Apollo-URL hat sich geaendert).
- Status `verify_failed`: Verifikation hat geworfen (z.B. DB-Query fehlgeschlagen). Behandeln wie stale aber zusaetzlich Slack-Alert.
- Agent laeuft weiter, der Caller entscheidet ob ein Fallback verwendet werden soll.

Pflicht-Eigenschaften pro Fact:
- Schnell: max 2s pro Verifikation (Default-Timeout)
- Idempotent: kein Side-Effect (kein DB-Write, keine externe Mutation)
- Eindeutig: pro Fact eine stable `id` (Snake-Case mit Agent-Praefix)

---

## Lead-Ingestor

| ID | Was wird verifiziert | Failure-Bedeutung |
|---|---|---|
| `lead_ingestor.apollo_endpoint_active` | `APOLLO_API_KEY` ist gesetzt und plausibel lang (> 10 Zeichen) | Apollo-Sync wird komplett ausfallen, Lead-Pipeline trocknet aus. ESC: Angie pruefen ob Vercel-ENV uebernommen ist nach letztem Deploy. |
| `lead_ingestor.leads_table_exists` | `SELECT 1 FROM leads LIMIT 1` antwortet | Neon-DB nicht erreichbar oder Schema-Migration fehlt. ESC: `SELECT * FROM information_schema.tables WHERE table_name='leads'` in Neon Console. |
| `lead_ingestor.icp_filters_match_segments` | ICP-Filter im apollo-Modul deckt mind. immobilien/handwerk ab | Falls Master-Plan-Update den ICP-Stack erweitert (PropTech, Steuerberater) und apollo.ts noch alte Sektoren hat. ESC: `lib/apollo.ts` ICP_FILTERS pruefen. |

---

## Outreach-Strategist

| ID | Was wird verifiziert | Failure-Bedeutung |
|---|---|---|
| `outreach_strategist.brevo_sender_configured` | Mindestens eine Brevo-Sender-ENV gesetzt (`BREVO_SENDER_EMAIL_ANGIE` / `_FALLBACK` / `_EMAIL`) | Sonst koennen keine Mails verschickt werden. ESC: Vercel-ENV pruefen. |
| `outreach_strategist.icp_segments_match_master_plan` | leads-Tabelle enthaelt min 1 Lead mit segment matching `(hausverw|proptech|kanzlei|steuerber)` ODER ist leer (Setup-Phase) | Falls Master-Plan-Update neue Segmente eingefuehrt hat (Option C ICP-Umbau) und leads-Tabelle noch alte Bau/Handwerk-Segmente vorherrschen. ESC: Anrufliste-Filter pruefen. |
| `outreach_strategist.gemini_model_configured` | `GEMINI_API_KEY` oder `Gemini_API_Key_Sales_Agent` existiert | LLM-Drafts kollabieren, Outreach-Strategist faellt auf Templates zurueck. ESC: Vercel-ENV nachsehen. |

---

## Reply-Detector

| ID | Was wird verifiziert | Failure-Bedeutung |
|---|---|---|
| `reply_detector.gmail_oauth_configured` | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` alle gesetzt | Reply-Detection ist tot. Sequenzen werden nicht gestoppt. **Hoechstes Risiko**, weil Customer-facing. ESC: Real Estate Pilot Replies von Hand pruefen, OAuth-Flow neu starten. |
| `reply_detector.email_log_table_exists` | `SELECT 1 FROM email_log LIMIT 1` | Reply-Korrelation broken, neue Replies haben keinen Verbindungspunkt zu Sequenzen. ESC: Neon-Schema. |
| `reply_detector.processed_label_name_consistent` | Label-Name `praxisnova-processed` als Konstante exists | Statisch, sollte nie failen. Falls doch: Codebase-Suche nach geaenderten String-Konstanten. |

---

## Verwendung im Agent-Code (Beispiel)

```ts
import { verifyMemoryFacts, getStaleFacts } from '@/lib/memory/hygiene';
import { leadIngestorFacts } from '@/lib/memory/agent-facts';

export async function runLeadIngestor(): Promise<void> {
  const factResults = await verifyMemoryFacts(
    leadIngestorFacts,
    { agent: 'lead_ingestor', run_id: `li-${Date.now()}` },
    { topN: 3, timeoutMs: 2000 },
  );

  const staleFacts = getStaleFacts(factResults);
  if (staleFacts.length > 0) {
    // Stale-Facts blocken nicht den Run, aber loggen + entscheiden ob
    // wir auf Fallback gehen sollen
    if (staleFacts.some((f) => f.fact_id === 'lead_ingestor.apollo_endpoint_active')) {
      // Apollo aus, direkt auf Fallback wechseln
      await runLegacyApolloPipeline();
      return;
    }
    // Andere stale facts: weiter, aber mit Warning-Tag
  }

  await runApolloEnrichmentPath();
}
```

---

## Erweiterung neuer Facts

1. Pro Agent in `lib/memory/agent-facts.ts` ein neues `MemoryFact`-Object hinzufuegen.
2. ID nach Schema `<agent_name>.<fact_short_name>` (snake_case).
3. `verify` async function mit max 2s Laufzeit, never-throw-pattern bevorzugt.
4. Diese Doku ergaenzen mit Beschreibung + Failure-Bedeutung + ESC-Pfad.
5. Test-Coverage: bei kritischen Facts (z.B. neue API-Endpoints) einen `verify_failed`-Mock-Test hinzufuegen.

---

## Maintenance-Regeln

- **Wochenraster:** Operations-Manager-Agent pruefen die Stale-Quote der letzten 7 Tage. Wenn ein Fact zu oft stale wird, entweder fixen oder als deprecated markieren.
- **Quartalsweise:** Ueberarbeitung der Fact-Liste anhand neuer Master-Plan-Aenderungen.
- **Nie:** Fact mit > 2s Verifikations-Zeit hinzufuegen (Agent-Run-Latency).

---

**Verbindlich ab:** 2026-04-18 (T4 PR Merge).
**Naechster Review:** Freitag 2026-04-24 als Teil des Wochen-Retros.
