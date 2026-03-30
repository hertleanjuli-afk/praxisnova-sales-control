# /setup-agents — Alle Agenten einrichten

Lies alle Agenten-Dateien aus dem `.agents/` Ordner und richte die zugehörigen Scheduled Tasks ein.

## Schritt 1: Agenten lesen

Lies alle folgenden Dateien:
- `.agents/prospect-researcher.md`
- `.agents/partner-researcher.md`
- `.agents/operations-manager.md`
- `.agents/sales-supervisor.md`
- `.agents/partner-supervisor.md`
- `.agents/outreach-strategist.md`
- `.agents/partner-outreach-strategist.md`

## Schritt 2: Scheduled Tasks prüfen

Nutze `Skill: schedule`, um die Liste der bestehenden Scheduled Tasks abzurufen.
Prüfe, welche Agenten bereits als Scheduled Task existieren.

## Schritt 3: Fehlende oder veraltete Tasks einrichten

**ZEITPLAN (Berlin Zeit):**
```
08:00 Mon/Mi/Fr  → Session 1: prospect-researcher.md + operations-manager.md (sequenziell)
08:00 Di/Do      → Session 1 (alternative Tage): partner-researcher.md + operations-manager.md
10:00 täglich    → Session 2: sales-supervisor.md + partner-supervisor.md (sequenziell)
12:00 Mo-Fr      → Session 3: outreach-strategist.md + partner-outreach-strategist.md (sequenziell)
```

**SLOT-STRATEGIE:**
Es gibt max. 3 Trigger-Slots. Merge-Strategie: Mehrere Agenten laufen sequenziell in einem einzigen Task.

Für jeden fehlenden oder veralteten Task:
1. Lies den entsprechenden `.agents/` Inhalt
2. Erstelle einen kombinierten Prompt für den Slot (Agenten sequenziell zusammengeführt)
3. Nutze `Skill: schedule` zum Erstellen

## Schritt 4: Zusammenfassung

Am Ende: Berichte kurz (auf Deutsch), welche Tasks erstellt/aktualisiert wurden und welche bereits existiert haben.
Keine langen Erklärungen — nur eine kurze Statusliste.
