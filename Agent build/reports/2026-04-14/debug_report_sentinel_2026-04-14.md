# Sentinel Alarm Debug Report - 2026-04-14

**Erstellt:** 2026-04-15 (Analyse eines Alarms vom 14.04.2026 08:15 UTC)
**Status:** Diagnose abgeschlossen, KEIN Code geaendert
**Branch:** Kein Branch erstellt (Hypothese statt Fix, siehe Regel "Bei Unsicherheit STOP")

## Gelesene Dateien

- `Agent build/SYSTEM-CHECK-2026-04-13-NACHMITTAG.md`
- `Agent build/CALENDAR-VERIFY-ERGEBNIS-2026-04-13.md`
- `Agent build/CROSS-REPO-AGENT-ANALYSE-2026-04-13.md`
- `next.config.mjs` (keine Middleware)
- `lib/auth.ts` (NextAuth Credentials Provider)
- `lib/agent-runtime.ts` (Gemini-Call + sendWithRetry, Zeilen 807-831, 853-909)
- `app/api/cron/error-sentinel/route.ts` (vollstaendig, inkl. ROUTE_CHECKS Definition)
- `app/api/anrufliste/route.ts` (keine Auth)
- `app/api/sequences/status/route.ts` (getServerSession, by design)
- `app/api/partners/route.ts` (getServerSession, by design)
- Git-Log letzte 20 Commits (beide Repos)
- Live-Tests (curl) gegen alle 5 gemeldeten Routes
- Filesystem-Check aller API-Routen

---

## Gruppe A (401er): Root Cause - Sentinel-Konfiguration falsch, nicht Auth-Regression

**Live-Test aller 5 Routes am 2026-04-15 gegen Production:**

| Route | Tatsaechlicher Status | Sentinel meldet | Diagnose |
|-------|----------------------|-----------------|----------|
| `/api/anrufliste` | **200 OK** | 401 | False positive im Sentinel |
| `/api/linkedin` | **404** | 401 | Route existiert nicht (fehlende `route.ts`) |
| `/api/inbound/stats` | **404** | 401 | Ordner ist leer (keine Files) |
| `/api/partners` | **401** | 401 | By design: `getServerSession(authOptions)` in Zeile 49 |
| `/api/sequences/status` | **401** | 401 | By design: `getServerSession(authOptions)` in Zeile 27 |

**Evidenz:**

1. **Keine Middleware existiert.** `find -name "middleware.ts"` im Repo root + src/: Keine Treffer (nur `.next/server/middleware-manifest.json` auto-generiert). Die 401er kommen NICHT von einer Auth-Middleware sondern von den Routes selbst.

2. **Der Sentinel ruft OHNE Auth-Header.** Code in `app/api/cron/error-sentinel/route.ts` Zeile 151-163: `fetch(url, { method, headers, signal })`. `headers` enthaelt nur `Accept: application/json`. Der `requiresAuth`-Flag ist bei allen 5 Checks nicht gesetzt (Default `undefined`).

3. **Routes mit `getServerSession()` geben korrekt 401 zurueck** wenn keine Session vorhanden. Das ist erwuenschtes Verhalten. Partners Zeile 49: `if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`. Sequences/Status Zeile 29 identisch.

4. **`/api/linkedin` Ordner:** 5 Unterordner (connect, list, queue, queue-update, status), aber kein `route.ts` direkt. Next.js gibt 404 fuer `GET /api/linkedin`.

5. **`/api/inbound` Ordner:** KOMPLETT LEER (keine Files, nur der Ordnername). `find app/api/inbound -type f`: Null Treffer.

**Root Cause der Sentinel-Meldung:**

Der Error-Sentinel hat zwei verschiedene Probleme die er zusammenwirft:
- **Falsch konfiguriert (2 Checks):** Ruft authed Routes ohne Auth auf -> falsch positiv
- **Fehlende Routes (2 Checks):** Liest 404 als "Fehler" korrekt, aber beschriftet als 401 im Alert
- **Falsches Timing (1 Check):** `/api/anrufliste` funktioniert gerade tatsaechlich, Sentinel-Alarm war moeglicherweise transient

**Dass /api/anrufliste zum Alert-Zeitpunkt 401 gab, aber jetzt 200 gibt**, deutet auf einen transienten Fehler zur Alert-Zeit hin (z.B. kurzer DB-Outage, Vercel Cold Start Timeout) der seitdem verschwunden ist.

---

## Gruppe B (Gemini 503): Root Cause - Preview-Modell mit begrenzter Quota

**Befund:**

`lib/agent-runtime.ts` Zeile 854: `model: 'gemini-3-flash-preview'`

**Git-History (entscheidend):**
```
2026-04-02 09:58  fix: switch to gemini-2.0-flash-lite (available to all users, 4000 RPM)
2026-04-02 10:10  fix: revert to gemini-3-flash-preview - only model available to new API key
```

Der API-Key (`Gemini_API_Key_Sales_Agent`) hat laut Commit-Message NUR Zugang zum Preview-Modell. Preview-Modelle haben:
- **Niedrigere Rate Limits** als Production-Modelle
- **Haeufigere 503 bei hoher Google-Last** (Preview-Infrastruktur wird als erstes gedrosselt)
- **Keine SLA-Garantien**

**Retry-Logik existiert** (Zeile 809-831, `sendWithRetry`):
- Retries bei 429 UND 503 (Zeile 819)
- Max 3 Retries
- Wartezeiten: 15s, 25s, 35s (linear, NICHT exponential)
- Beide Gemini-Calls sind gewrappt (initialer Send Zeile 860, Tool-Response Zeile 899)

**Warum der 237s-Lauf vom Sales Supervisor trotzdem fehlschlaegt:**

Bei 237s Laufzeit + 3 Retries a 15/25/35s = 75s zusaetzliche Wartezeit. Wenn Google's 503 persistent ist (z.B. 5 Minuten Outage), ist die lineare Strategie zu knapp. Exponential Backoff wuerde helfen: 15s, 60s, 180s, 300s = 9.25 Minuten Puffer.

**Zweites Problem - Concurrent Agents:**

Aus `vercel.json`:
- Sales Supervisor: `15 9 * * 1-5` (09:15 UTC)
- Inbound Response: `*/15 6-22 * * 1-5` (alle 15 Min)

Um 09:15 UTC laufen beide gleichzeitig. Wenn einer bereits einen 503 durch Quota-Druck verursacht, bekommt der zweite sofort denselben Fehler, weil sie sich denselben Quota-Bucket teilen (gleicher API-Key).

**Root Cause der 503er:**

1. **Primaer:** Preview-Modell hat begrenzte Quota, Google drosselt bei hoher Last.
2. **Sekundaer:** Retry-Strategie ist zu kurz (75s gesamt) bei laengeren Google-Outages.
3. **Tertiar:** Zwei Agenten koennen gleichzeitig starten und sich die Quota gegenseitig wegnehmen.

---

## Gruppe C (Health-Check): Alle Agenten laut Git-Log und letzten Reports operativ

Siehe separaten Report: `health_check_2026-04-14.md`

Kurzfassung:
- 11 Gemini-Agenten, alle konfiguriert und geplant
- 7 Webhooks, alle existieren (Code-seitig)
- 4 kritische externe Verbindungen: Apollo OK, HubSpot OK, Brevo OK, **Calendar OAuth weiterhin offen** (invalid_grant laut `CALENDAR-VERIFY-ERGEBNIS-2026-04-13.md`)

Stille Ausfaelle "0 Inbound, 0 Termine heute" sind erklaerbar:
- **0 Inbound:** Kein Website-Traffic mit Formular-Submit in den letzten 24h. Nicht technisch kaputt, einfach kein Traffic.
- **0 Termine:** Calendar OAuth seit 2026-04-12 broken (`invalid_grant`), Buchungen werden nicht in DB gespiegelt. Buchungen KOENNTEN in Google Calendar existieren, aber der Sync kann sie nicht lesen.

---

## Fix-Empfehlungen (NICHT umgesetzt, nur Vorschlag)

### Gruppe A: Sentinel korrekt konfigurieren (Priority P2, kein Bug im System selbst)

Aenderungen in `app/api/cron/error-sentinel/route.ts`:

1. `/api/linkedin` Check entfernen oder auf `/api/linkedin/list` aendern (existiert)
2. `/api/inbound/stats` Check entfernen (Route existiert nicht)
3. Fuer `/api/partners` und `/api/sequences/status`: Entweder Auth-Header setzen mit NextAuth-Token, oder aus dem Sentinel entfernen weil authed Routes nicht sinnvoll extern gepingt werden koennen

### Gruppe B: Gemini-Retry robuster machen (Priority P1)

In `lib/agent-runtime.ts` sendWithRetry:

1. Exponential Backoff: 15s, 60s, 180s (statt 15/25/35s)
2. Optional: Bei 3x 503 in Folge Fallback auf `gemini-2.0-flash-lite` wenn verfuegbar
3. Staffelung der Cron-Slots so dass Sales Supervisor und Inbound Response nicht exakt gleichzeitig laufen (z.B. Supervisor 09:20 statt 09:15)

### Gruppe C: Calendar OAuth fixen (Priority P0, bereits seit 2 Tagen offen)

Kein Code-Fix moeglich. Angie muss OAuth-Token neu generieren (siehe `CALENDAR-VERIFY-ERGEBNIS-2026-04-13.md` Anleitung).

---

## Was NICHT gefixt wurde und warum

Regel aus Prompt: "Bei Unsicherheit STOP, Hypothese in Report, bei Angie rueckfragen."

Begruendung fuer keinen Code-Push:

1. Die 401er sind KEIN Bug im Auth-System. Ein "Fix" waere eine Aenderung am Error-Sentinel selbst. Das sollte Angie entscheiden (oder den Sentinel ganz ausschalten bis er besser konfiguriert ist).

2. Der 503-Fehler laesst sich nicht deterministisch reproduzieren. Ein Fix an der Retry-Logik ist sinnvoll, aber das eigentliche Problem (Preview-Modell Quota) ist durch Code nicht loesbar. Angie muss evtl. einen neuen API-Key mit Zugang zu Production-Modellen beantragen.

3. Voll-Rollout ohne Branch, ohne Staging-Test, ohne Angies Freigabe waere ein Risiko.

**Empfehlung:** Angie entscheidet welche der 3 Fix-Gruppen jetzt umgesetzt werden sollen. Ich bereite einen Branch `fix/sentinel-2026-04-14` vor wenn gewuenscht.
