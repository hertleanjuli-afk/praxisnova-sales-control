# /agent-status — Agenten Status prüfen

Prüfe den aktuellen Status aller Agenten und Scheduled Tasks. Gib eine kurze Übersicht auf Deutsch.

## Was zu prüfen ist:

1. **Scheduled Tasks** — Nutze `Skill: schedule` zum Abrufen der Task-Liste.
   Zeige: welche Tasks aktiv sind, wann sie zuletzt gelaufen sind, nächste Ausführung.

2. **Letzte Agent-Aktivität** — Rufe die API ab:
   `GET https://praxisnova-sales-control.vercel.app/api/agent?action=reports&hours=48`
   Header: `x-agent-secret: b3016b7b0229726679583118750244d40649247e639fca0b`

   Zeige: Welche Agenten haben in den letzten 48h Reports geschrieben?

3. **Fehlende Tasks** — Vergleiche `.agents/` Dateien mit den Scheduled Tasks.
   Fehlt ein Agent in den Tasks? → Melde es.

## Ausgabe-Format:

```
✅ Session 1 (08:00): [aktiv/inaktiv] — letzter Lauf: [datum]
✅ Session 2 (10:00): [aktiv/inaktiv] — letzter Lauf: [datum]
✅ Session 3 (12:00): [aktiv/inaktiv] — letzter Lauf: [datum]

Letzte Reports:
- prospect_researcher: [datum]
- operations_manager: [datum]
- [etc.]

Handlungsbedarf: [nichts / liste von problemen]
```
