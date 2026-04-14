# Error Catalog Update 2026-04-14

## Pattern 1: Sentinel meldet 401 auf eigentlich geschuetzte Routes

**Pattern:**
Error-Sentinel-Cron meldet HTTP 401 auf API-Route, obwohl die Route korrekt mit NextAuth gesichert ist.

**Symptom:**
```
[error-sentinel] /api/partners -> 401 Unauthorized
[error-sentinel] /api/sequences/status -> 401 Unauthorized
```

**Root Cause:**
Error-Sentinel sendet `fetch()` ohne Authorization Header. Routes mit `getServerSession(authOptions)` geben korrekt 401 zurueck.

**Loesung:**
- Entweder solche Routes aus dem Sentinel entfernen (empfohlen, da keine sinnvolle externe Pruefung moeglich ist)
- Oder einen speziellen Health-Check-Endpoint hinter CRON_SECRET bauen der die authed Routes intern aufruft

**Praevention:**
Bei jeder neuen `getServerSession`-Route pruefen ob sie im Sentinel referenziert wird. Wenn ja: entfernen oder ueber internen Health-Check wrappen.

---

## Pattern 2: Sentinel meldet 401 auf nicht-existente Routes

**Pattern:**
Sentinel ROUTE_CHECKS enthaelt Pfade zu Routes die code-seitig nicht existieren.

**Symptom:**
```
[error-sentinel] /api/linkedin -> 404 (im Log als 401 gemeldet)
[error-sentinel] /api/inbound/stats -> 404
```

**Root Cause:**
Entweder wurden die Routes nie implementiert, oder sie wurden umbenannt (linkedin/list, linkedin/queue existieren) und der Sentinel wurde nicht mit-aktualisiert.

**Loesung:**
Routes existieren lassen oder Sentinel-Konfiguration aktualisieren. Keine echte Feature-Fehlende, nur Monitoring-Konfigurationsfehler.

**Praevention:**
Test fuer ROUTE_CHECKS im error-sentinel: Build-Step der prueft ob alle gelisteten Routes tatsaechlich als route.ts existieren.

---

## Pattern 3: Gemini 503 Service Unavailable bei Preview-Modell

**Pattern:**
`gemini-3-flash-preview` gibt 503 bei hoher Google-Last, besonders wenn mehrere Agenten gleichzeitig laufen.

**Symptom:**
```
[sales_supervisor] sendMessage failed: 503 Service Unavailable
[inbound_response] sendMessage failed: 503 Service Unavailable
Endpoint: generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
```

**Root Cause:**
1. Preview-Modelle haben niedrige Quota und keine SLA
2. Retry-Strategie ist linear (15s, 25s, 35s), bei laengerer Google-Outage zu kurz
3. Mehrere Agenten teilen sich denselben API-Key und damit dieselbe Quota

**Loesung:**
- Retry auf exponential umstellen: 15s, 60s, 180s
- Agent-Cron-Slots so staffeln dass nicht zwei gleichzeitig starten
- Langfristig: API-Key-Upgrade auf Production-Modell-Zugang

**Praevention:**
- Sentinel-Check fuer "Agent-503-Fehler in den letzten 2 Stunden > 3" einbauen
- Optional: Fallback-Modell in `sendWithRetry` nach 3 Retries

---

## Pattern 4: Stille Ausfaelle durch OAuth-Problem

**Pattern:**
KPIs zeigen "0 Termine" obwohl Buchungen stattfinden. Cron `google-calendar-sync` gibt kein Event mehr.

**Root Cause:**
OAuth-Refresh-Token `invalid_grant`. Cron laeuft, findet aber keine Events (oder: Cron crashed und liefert 0 Events).

**Loesung:**
Neuen Refresh Token generieren (siehe CALENDAR-VERIFY-ERGEBNIS-2026-04-13.md).

**Praevention:**
Sentinel-Check fuer "calendar_sync status != completed in den letzten 30 Minuten" einbauen. Bei Dauerausfall > 1h Alert-Mail an Angie mit Fix-Anleitung.

---

## Pattern 5: API-Routen existieren nur als Unterordner

**Pattern:**
`/api/linkedin/connect` existiert, aber `/api/linkedin` selbst nicht. Next.js antwortet auf `/api/linkedin` mit 404.

**Root Cause:**
Design-Entscheidung: LinkedIn-Endpoints sind nested, aber kein Parent-Endpoint definiert. Nicht wirklich ein Fehler, aber Monitoring-Tools gehen faelschlich von einem Parent-Endpoint aus.

**Loesung:**
Entweder `app/api/linkedin/route.ts` als Overview/Index-Route anlegen, oder Monitoring-Tools auf konkrete Sub-Routes richten.

**Praevention:**
Bei neuen Routen-Gruppen entscheiden ob Parent-Index-Endpoint noetig ist.
