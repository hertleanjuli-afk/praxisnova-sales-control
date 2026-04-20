# Sales Control V2 Spec

Erstellt: 2026-04-20 Cowork-Session Abend
Autor: Angie (Anforderungen), Claude (Struktur)
Status: Ready for Claude Code nach OAuth-Fix
Zielsetzung: Eine zentrale Sales-Command-Zentrale, in der Anrufliste, Sequenzen, LinkedIn, Blockliste und Dashboard-Metriken verbunden sind. Keine toten Infos, keine manuellen Refreshes.

---

## Teil 1: Dashboard-Metriken (P0)

Die Sales-Control-Startseite muss folgende Zahlen live zeigen. Alle Metriken per SQL aus Neon, keine Hartcodes.

### 1.1 Lead-Metriken
- Neue Leads heute (count leads WHERE created_at::date = CURRENT_DATE)
- Neue Leads diese Woche (ISO-Woche)
- Neue Leads letzte Woche
- Neue Leads letzter Monat

### 1.2 Sequenz-Metriken
- Neue Sequenzen heute gestartet
- Neue Sequenzen diese Woche
- Neue Sequenzen letzte Woche
- Aktive Sequenzen gesamt (Status = active)
- Sequenzen auf letztem Step (Step = Sequenz-Laenge, letzter Touch)
- Sequenzen pausiert
- Sequenzen beendet ohne Reply

### 1.3 LinkedIn-Metriken
- LinkedIn-Verknuepfungen verschickt heute / Woche / letzte Woche / Monat
- LinkedIn-Verknuepfungen angenommen (Proxy: wenn Nachricht-Button aktiv wurde oder manuell bestaetigt)
- LinkedIn-Nachrichten verschickt heute / Woche / letzte Woche / Monat
- LinkedIn-Nachrichten erhalten heute / Woche / letzte Woche / Monat
- Conversion-Rate: verschickte Anfragen vs. angenommene

### 1.4 Anruf-Metriken
- Offene Anrufe heute
- Anrufe erledigt heute
- Callbacks offen (zur spaeteren Uhrzeit geplant)

### 1.5 Block-Metriken
- Aktuell blockierte Personen gesamt
- Aktuell blockierte Firmen gesamt
- Blockierungen laufen aus (naechste 30 Tage)

**Acceptance:** Dashboard laedt <2s, alle Zahlen konsistent (wenn Summe Branchen > Gesamt, Alarm).

---

## Teil 2: LinkedIn-Workflow (P0)

Multi-Tab-Workflow mit State-Machine. Keine Seite darf nach Aktion manuell refreshed werden muessen.

### 2.1 States (leads.linkedin_state)

| State | Bedeutung | Naechste Aktion |
|-------|-----------|------------------|
| `open` | Noch keine Verknuepfung gesendet | Button "Verknuepfung senden" oder "Kein LinkedIn" |
| `no_linkedin` | Prospect hat kein LinkedIn | Land hier manuell, bleibt hier |
| `request_sent` | Verknuepfung manuell auf LinkedIn geschickt | Warte auf Annahme |
| `connected` | Verbindung angenommen (manuell markiert) | Button "Nachricht schreiben" |
| `message_sent` | Erste Nachricht geschickt, warte auf Antwort | Warte |
| `replied_positive` | Prospect hat geantwortet, Interesse | Termin planen / in Anrufliste |
| `replied_negative` | Prospect hat geantwortet, kein Interesse | Block 3/6/9 Monate |
| `blocked_person` | Person blockiert | Auto-Unblock nach Ablauf |
| `blocked_company` | Firma blockiert (alle Kontakte) | Auto-Unblock nach Ablauf |

### 2.2 Tabs in Sales Control `/sales-control/linkedin`

| Tab | Filter | Sortierung |
|-----|--------|------------|
| Offen | state = open | ICP-Score desc, Created_at desc |
| Anfrage raus | state = request_sent | Days_since_request desc |
| Verbunden | state = connected | Created_at desc (neueste oben) |
| Nachricht raus | state = message_sent | Days_since_message desc |
| Antworten | state = replied_positive | Received_at desc |
| Keine LinkedIn | state = no_linkedin | Created_at desc |
| Blockiert | state in (blocked_person, blocked_company) | Blocked_until asc |

Jede Zeile zeigt: Name, Firma, ICP, Sequenz-Step (wenn in Sequenz), letzte Aktion, CTA-Button.

### 2.3 Actions ohne Refresh

Jede State-Transition schreibt in DB + updated UI optimistisch:

- Button "Verknuepfung gesendet" -> state = request_sent, UI wechselt Tab automatisch
- Button "Kein LinkedIn" -> state = no_linkedin, wechselt Tab
- Button "Verbunden" (wenn Annahme bestaetigt) -> state = connected, wechselt Tab
- Textfeld "Nachricht" + Button "Geschickt" -> message_sent, Text in linkedin_messages speichern
- Eingang Antwort: Textfeld + Radio "Positiv / Negativ" + Button "Speichern" -> state update, Text in linkedin_messages, bei negativ auto-Vorschlag Block-Dauer

### 2.4 Block-System

Block-Button erscheint bei state = replied_negative ODER auf dediziert-Seite `/sales-control/block`.

Optionen beim Block:
- [ ] 3 Monate
- [ ] 6 Monate
- [ ] 9 Monate
- [ ] Nur Person blockieren
- [ ] Gesamte Firma blockieren (alle Kontakte mit gleichem companies.id)
- Freitext: Grund (optional)

Wirkung: betroffene Leads bekommen state = blocked_person / blocked_company, blocked_until = NOW + Dauer. Cron-Job `unblock-expired` laeuft taeglich, setzt abgelaufene Blocks zurueck auf `open`.

### 2.5 Daten-Modell

Neue Tabelle `linkedin_messages`:
- id, lead_id, direction (sent/received), body, sent_at, received_at
- state_at_send (snapshot)

Neue Spalte in `leads`:
- linkedin_state (enum oben)
- linkedin_state_changed_at
- blocked_until (timestamp, nullable)
- block_reason (text, nullable)
- block_scope (person/company, nullable)

Migration schreibt fuer bestehende Leads state = open falls linkedin_url vorhanden, sonst no_linkedin.

---

## Teil 3: Anrufliste-Trigger (P0)

Anrufliste muss automatisch aus folgenden Quellen gefuettert werden:

| Trigger | Aktion |
|---------|--------|
| Lead antwortet LinkedIn positiv | Anrufliste-Eintrag erstellen, Prio high |
| Sequenz-Reply (Email-Reply-Detection) positiv | Anrufliste-Eintrag, Prio high |
| Sequenz beendet ohne Reply (letzter Step) | Anrufliste-Eintrag, Prio medium, Hinweis "Follow-up nach Kampagne" |
| Manueller "Call planen" Button auf Lead | Anrufliste-Eintrag, Prio selbst setzen |
| Inbound-Form mit Demo-Wunsch | Anrufliste-Eintrag, Prio high, Hinweis "Inbound" |

Anrufliste-Table bekommt Spalte `source_trigger` (enum oben) zum Nachvollziehen woher der Eintrag kam.

**Acceptance:** Test-Trigger 10x -> Anrufliste wird 10x befuellt, keine Duplikate bei identischem Lead + gleichem Tag.

---

## Teil 4: Globale Block-Seite (P0)

`/sales-control/block-manager`

Funktion: Manuelles Blocken aus Email-Eingang.

UI:
- Email/Domain/Firmenname als Suchfeld
- Autocomplete findet Firma + alle Kontakte
- Block-Optionen wie in 2.4
- "Firma blockieren" -> alle Kontakte + Domain blockiert
- Historie der letzten 50 Blocks mit Datum + Grund

---

## Teil 5: Cross-Verknuepfungen (Pflicht)

Alle Seiten muessen sich gegenseitig kennen:

- Anrufliste-Eintrag -> Klick oeffnet Lead-Detail mit LinkedIn-State + Sequenz-Step
- LinkedIn-Tab-Zeile -> Klick oeffnet Lead-Detail mit Anrufliste + Sequenz
- Sequenz-Uebersicht -> Klick auf Lead oeffnet LinkedIn-Tab passender State
- Dashboard-KPI "Sequenzen auf letztem Step" -> Klick filtert Sequenz-Uebersicht

Datenmodell: lead_id ist universeller Key ueber leads, linkedin_messages, call_list, sequences.

---

## Teil 6: Nicht enthalten (explizit abgegrenzt)

- Automatische LinkedIn-API-Aktionen (LinkedIn-TOS-Risiko). Nutzer schickt Verknuepfung manuell, markiert in App.
- Sales Navigator Integration (spaeter, braucht eigene Entscheidung)
- Auto-Reply-Drafting (kommt in separate Marketing-Batch)

---

## Teil 7: Rollout-Plan

1. **B1 + B2 tonight (2.5-3h):** Dashboard-WHERE-Fix, LinkedIn-Passthrough (leads.linkedin_url wird gemappt). Ohne das geht nichts.
2. **B3 Metriken-Batch (Di 06:00, 4h):** Alle Dashboard-Metriken aus Teil 1 bauen.
3. **B ICP-Switch (Di 14:00, 6-8h):** Wie geplant, Apollo + Templates.
4. **B Website (Mi, 4-6h):** Wie geplant.
5. **B SalesControlV2 (Fr-Sa, 12-16h):** Teil 2-5 dieses Specs.

---

## Offene Entscheidungen

1. Block-Default-Dauer (Vorschlag: 6 Monate)
2. Anrufliste-Prio-Algorithmus (nur nach Source, oder auch ICP-Score?)
3. Firmen-Block: gilt er auch fuer zukuenftige Leads der Firma (neuer Kontakt wird geblockt beim Import)?
4. UI-Framework fuer Tabs (existierendes UI, oder neu mit shadcn/ui?)

Antworten per Chat genuegen, Claude Code setzt um.
