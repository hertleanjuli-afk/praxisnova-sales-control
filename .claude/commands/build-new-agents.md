# /build-new-agents — Neue Agenten einrichten

Lies die neuen Agenten-Dateien und erstelle die zugehörigen Scheduled Tasks mit den richtigen Skills.

## Schritt 1: Skills laden

Lies zuerst diese Skills:
- `product-marketing-context` (immer zuerst)
- `cold-email` (für Inbound Response Agent)
- `copywriting` (für Email-Personalisierung)
- `analytics-tracking` (für Market Intelligence)
- `content-research-writer` (für Branchennews-Recherche)

## Schritt 2: Neue Agenten-Dateien lesen

Lies beide Dateien vollständig:
- `.agents/inbound-response-agent.md`
- `.agents/market-intelligence.md`

## Schritt 3: Scheduled Tasks erstellen

**Task 1 — Inbound Response Agent:**
- Cron: `*/15 6-22 * * *` (alle 15 Min, 06:00-22:00 Uhr Berlin)
- Prompt: Vollständiger Inhalt aus `inbound-response-agent.md`
- Name: "Inbound Response: reagiert auf neue Website-Leads innerhalb 15 Min"

**Task 2 — Market Intelligence Agent:**
- Cron: `0 7 * * 0` (Sonntag 07:00 Uhr Berlin)
- Prompt: Vollständiger Inhalt aus `market-intelligence.md`
- Name: "Market Intelligence: wöchentliche Branchenanalyse + Trends für alle Agenten"

Nutze `Skill: schedule` für beide Tasks.

## Schritt 4: Bestätigung

Zeige kurz welche Tasks erstellt wurden und wann sie das erste Mal laufen.
Dann alle neuen .agents/ Dateien committen und pushen:
```
git add .agents/inbound-response-agent.md .agents/market-intelligence.md .claude/commands/build-new-agents.md
git commit -m "feat: add Inbound Response Agent + Market Intelligence Agent"
git push
```
