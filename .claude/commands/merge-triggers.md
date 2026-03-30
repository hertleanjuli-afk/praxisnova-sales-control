# /merge-triggers — Trigger-Slots konsolidieren

Alle Agenten in 3 Trigger-Slots zusammenführen, um das Limit zu respektieren.

## Problem
Claude Code Remote Triggers haben ein Limit. Wir brauchen alle 7 Agenten in max. 3 Sessions.

## Merge-Plan

### Session 1 — 08:00 Uhr Berlin (Mo/Mi/Fr UND Di/Do kombiniert)
Cron: `0 8 * * 1-5` (Mo–Fr täglich um 08:00)
Name: "Morning Research Session"

Logik im Prompt:
```
- Wenn heute Mo/Mi/Fr: Prospect Researcher ausführen (liest prospect-researcher.md)
- Wenn heute Di/Do: Partner Researcher ausführen (liest partner-researcher.md)
- Immer: Operations Manager ausführen (liest operations-manager.md) — nach dem Researcher
```

### Session 2 — 10:00 Uhr Berlin (täglich)
Cron: `0 10 * * 1-5` (Mo–Fr täglich um 10:00)
Name: "Supervisor Review Session"

Sequenziell ausführen:
1. Sales Supervisor (liest sales-supervisor.md)
2. Partner Supervisor (liest partner-supervisor.md)

### Session 3 — 12:00 Uhr Berlin (Mo–Fr)
Cron: `0 12 * * 1-5`
Name: "Outreach Session"

Sequenziell ausführen:
1. Outreach Strategist (liest outreach-strategist.md)
2. Partner Outreach Strategist (liest partner-outreach-strategist.md)

## Ausführung

1. Lies alle 7 `.agents/` Dateien
2. Nutze `Skill: schedule`:
   - Lösche oder update bestehende Einzeltasks
   - Erstelle/update die 3 kombinierten Sessions
3. Bestätige kurz welche Sessions jetzt aktiv sind
