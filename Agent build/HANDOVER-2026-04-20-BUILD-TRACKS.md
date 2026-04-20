# HANDOVER, Build Tracks, 2026-04-20

Zweck: Vollstaendiger Kontext-Uebergabe fuer die 3 parallelen Claude-Code-Builds. Dieses Dokument soll es einer anderen Claude-Session (oder einer kuenftigen Version von mir) erlauben, die Arbeit lueckenlos weiterzufuehren, ohne neue Fragen an Angie stellen zu muessen.

Stand: 2026-04-20, Abend. Owner: Angie (Anjuli Hertle, PraxisNova AI, Solo Operator).

---

## 1\. Erste Handlung der neuen Session, Pflichtlektuere

Bevor irgendetwas geaendert, gebaut, merged oder an Claude Code uebergeben wird, MUESSEN folgende Dokumente gelesen werden (in dieser Reihenfolge).

1. Dieses Handover (HANDOVER-2026-04-20-BUILD-TRACKS.md).  
2. PLATFORM-STANDARDS-2026-04-20.md, Master-Referenz fuer Legal, Security, Tech, Agent-Safety, Cost, Scale, Extensibility.  
3. CLAUDE-CODE-PROMPT-2026-04-20-TRACK-1-SALES-CONTROL-V2.md.  
4. CLAUDE-CODE-PROMPT-2026-04-20-TRACK-2-WEBSITE-NEUE-FIRMA.md.  
5. CLAUDE-CODE-PROMPT-2026-04-20-TRACK-3-AGENTS-ICP-SWITCH.md.  
6. TASKS.md, aktueller Stand inkl. PS-Tasks.  
7. CHANGELOG.md, letzte 3 Sessions.  
8. Session-Docs unter /sessions/inspiring-kind-pasteur/mnt/Agent build/session-docs/, besonders 2026-04-20\_evening-4-platform-standards-rollout.md.  
9. Relevante Memories unter /sessions/inspiring-kind-pasteur/mnt/.auto-memory/:  
   - project\_platform\_standards\_2026-04-20.md  
   - feedback\_legal\_phrases.md  
   - feedback\_skills\_in\_prompts.md  
   - feedback\_cowork\_briefing\_preflight.md  
   - feedback\_main\_state\_check.md  
   - feedback\_prompt\_main\_state\_precheck.md  
   - feedback\_writing\_style.md (Regel: keine em-dash / en-dash)  
   - feedback\_tasks\_md\_workflow.md  
   - project\_strategic\_pivot\_2026-04-17.md  
   - project\_skill\_architecture\_2026-04-17.md  
   - project\_solo\_operator\_pivot\_2026-04-17.md  
   - project\_vercel\_security\_rotation\_2026-04-20.md  
10. HANDOVER-2026-04-20-LINKEDIN-MARKETING.md (paralleler Track, wichtig fuer Funnel-Abhaengigkeiten).  
11. COMPANY-OVERVIEW-PRAXISNOVA-AI.md (Firmen-Snapshot, wird in Prompts referenziert).

Ohne diese Lektuere NICHT arbeiten, sonst drohen Doppel-Bau, Legal-Risiko, Scope-Kollision.

---

## 2\. Kurzfassung der Lage

Angie ist Solo-Founder bei PraxisNova AI. 30 Tage, 0 neue Kunden. Drei parallele Builds sollen jetzt starten, um Vertrieb, Auftritt und Agent-Netz auf den neuen Strategic Pivot (Option C Narrow Hybrid) auszurichten.

Neue Positionierung:

- Nicht nur Bau, sondern breitere AI-Consultancy \+ Service.  
- Kern-ICPs: PropTech, Hausverwaltung, Kanzlei, Agentur.  
- Entry-Produkt (vorgeschlagen, noch nicht gebaut): AI-Check, 390 Euro, 90 Min Call \+ PDF Report.  
- Hauptprodukte: Workshops ab 1.900 Euro, Done-for-you Projekte 2.900 bis 8.000 Euro, Beratungstage, Retainer.  
- Foerderung (go-digital, AZAV, uWM, Bildungsgutschein): NICHT zertifiziert, deshalb legal gehaertet, Foerderung bleibt von Website und Outreach weg bis entweder Antrag durch oder Partnervertrag unterschrieben ist.

Drei Builds:

- Track 1: Sales Control V2 (das zentrale Repo, VERALTET-praxisnova-sales-control trotz Name) mit neuer Pipeline, Dashboard-Ausbau, ICP-Wechsel-Mechanik.  
- Track 2: Neue Website praxisnova-website, legal gehaertet, kein Foerderclaim, Brand-Voice gemaess Angie, bilingual DE \+ EN.  
- Track 3: Agents ICP-Switch, 11 Agents auf Gemini 3 Flash werden Config-gesteuert (icp\_config), DSGVO-Footer-Pflicht, idempotente Crons.

Alles drei startet auf Basis von PLATFORM-STANDARDS-2026-04-20.md. Ohne die Standards kein Merge.

---

## 3\. Status der 3 Claude-Code-Prompts

Alle 3 Prompts sind fertig, paste-ready, geprueft auf Legal-Wording, und enden mit "Ende Prompt. Freigabe durch Angie".

| Track | Datei | Zeilen | Repo | Status |
| :---- | :---- | :---- | :---- | :---- |
| 1 | CLAUDE-CODE-PROMPT-2026-04-20-TRACK-1-SALES-CONTROL-V2.md | 410 | \~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control | Paste-ready |
| 2 | CLAUDE-CODE-PROMPT-2026-04-20-TRACK-2-WEBSITE-NEUE-FIRMA.md | 371 | \~/Desktop/PraxisNovaAI/repos/praxisnova-website | Paste-ready |
| 3 | CLAUDE-CODE-PROMPT-2026-04-20-TRACK-3-AGENTS-ICP-SWITCH.md | 355 | \~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control | Paste-ready |
| \- | PLATFORM-STANDARDS-2026-04-20.md | 530 | kein eigenes Repo, wird im Sales-Control Repo gespiegelt | Master-Ref |

Jeder Prompt beginnt mit Section 0 "Lies PLATFORM-STANDARDS-2026-04-20.md" und endet mit einer Compliance-Section (Legal / Security / Tech / Agent / Cost / Scale / Extensibility Gates). Kein Merge ohne gruene Gates.

Erwartete Reports von Claude Code (bitte alle speichern, per Projekt-Instruction):

- Track 1: SALES-CONTROL-V2-REPORT-.md  
- Track 2: WEBSITE-NEUE-FIRMA-REPORT-.md  
- Track 3: AGENTS-ICP-SWITCH-REPORT-.md  
- Jeweils plus Gate-Audit: LEGAL-AUDIT.md, SECURITY-AUDIT.md, AGENT-AUDIT.md, COST-AUDIT.md.

---

## 4\. Start-Reihenfolge, 3 Terminals

Empfohlen: Terminals staffeln, nicht gleichzeitig starten, um Token-Budget, Git-Konflikte und Rate-Limits sauber zu halten.

Terminal 1, Track 1 (Sales Control V2):

1. cd \~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control  
2. git fetch \--all && git checkout main && git pull  
3. Claude Code starten.  
4. Prompt aus CLAUDE-CODE-PROMPT-2026-04-20-TRACK-1-SALES-CONTROL-V2.md komplett einfuegen.  
5. Beobachten bis Report erstellt, dann PR review, erst dann mergen (Gates gruen Pflicht).

Terminal 2, Track 2 (Website):

1. cd \~/Desktop/PraxisNovaAI/repos/praxisnova-website  
2. git fetch \--all && git checkout main && git pull  
3. Claude Code starten.  
4. Prompt aus CLAUDE-CODE-PROMPT-2026-04-20-TRACK-2-WEBSITE-NEUE-FIRMA.md einfuegen.  
5. Nach erstem Preview: Brand-Voice-Check, Legal-Scan, dann Vercel-Preview teilen.

Terminal 3, Track 3 (Agents ICP-Switch): Start erst nach Track 1 Merge (Abhaengigkeit icp\_config-Tabelle).

1. cd \~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control  
2. git fetch \--all && git checkout main && git pull  
3. Claude Code starten.  
4. Prompt aus CLAUDE-CODE-PROMPT-2026-04-20-TRACK-3-AGENTS-ICP-SWITCH.md einfuegen.

Wichtig: Vor jedem Prompt zur Sicherheit git log im Live-Repo pruefen (Lesson learned 2026-04-20, siehe feedback\_prompt\_main\_state\_precheck.md). Wenn main seit Prompt-Erstellung geaendert wurde, Prompt kurz abgleichen, sonst drohen Doppel-Bauten.

---

## 5\. Kern-Entscheidungen, die getroffen sind

- Solo Operator. Samantha nicht mehr im Loop. Jede Architektur muss von einer Person wartbar sein.  
- Option C Narrow Hybrid bleibt die strategische Linie (kein Foerder-Claim ohne Certification).  
- Platform Standards sind Pflicht, nicht optional. Alle Builds laufen durch die 7 Gates.  
- icp\_config als Extensibility-Pattern. Neue Branche \= neue Row, kein neuer Code.  
- cron\_locks mit idempotentem unblock-expired, Sicherheit gegen Doppel-Runs.  
- DSGVO-Footer in jeder Outbound-Mail, Apollo-Templates inklusive.  
- Brand Voice: enthusiastischer Nerd, warm, "basically a chat box"-Analogien, aber B2B-kalibriert. Keine em-dash / en-dash.  
- Legal-Forbidden-Phrases hart gesperrt (Bildungsgutschein, "bis 80% foerderbar", Testsieger, garantierter ROI, usw.). Details in feedback\_legal\_phrases.md.

---

## 6\. Offene Entscheidungen, die NICHT blockieren, aber bald gebraucht werden

1. Certification-Entscheidung: Option A (go-digital selbst, 2 bis 4 Monate), Option B (Partner, 1 bis 2 Wochen, Marge statt Direkt), Option C (Foerderung ganz raus, nur ROI-Story). Pending. Bis Entscheidung laeuft neutral "Orientierung \+ Vermittlung"-Wording.  
2. AI-Check 390 Euro Entry-Produkt: Vorgeschlagen, noch nicht final freigegeben. Wenn ja, kurzer eigener Build-Scope fuer Landing-Page \+ Stripe-Link \+ PDF-Template.  
3. Realty-Pilot Deal (Amelie Chwalinski, Termin Do 2026-04-23): Uhrzeit noch offen, Dry-Run am Mi 18:00 geplant.  
4. Content-Funnel: Free-Email-Kurs als Lead-Magnet, LinkedIn-CTA zeigt dort hin, vgl. LinkedIn-Handover.

---

## 7\. Alle Aenderungen dieser Session im Ueberblick (Log)

Session-Name: 2026-04-20 Abend, Part 4, Platform Standards Rollout.

Neu erstellte Dokumente (alle in /sessions/inspiring-kind-pasteur/mnt/Agent build/):

- PLATFORM-STANDARDS-2026-04-20.md (ca. 530 Zeilen): Master-Referenz, Forbidden-Phrases-Liste, 4 Auto-Check-Scripts (legal-scan, security-scan, preflight, agent-audit), DSGVO-Footer-Text, icp\_config-Schema, PR-Body-Template.  
- CLAUDE-CODE-PROMPT-2026-04-20-TRACK-1-SALES-CONTROL-V2.md (410 Zeilen): Section 0 \+ 7 Gates gehaertet.  
- CLAUDE-CODE-PROMPT-2026-04-20-TRACK-2-WEBSITE-NEUE-FIRMA.md (371 Zeilen): Bildungsgutschein-Kalkulator raus, durch Foerder-Check-Widget mit Disclaimer ersetzt, bilingual DE \+ EN.  
- CLAUDE-CODE-PROMPT-2026-04-20-TRACK-3-AGENTS-ICP-SWITCH.md (355 Zeilen): DSGVO-Footer Pflicht, icp\_config-Pattern, cron\_locks.  
- session-docs/2026-04-20\_evening-4-platform-standards-rollout.md.  
- HANDOVER-2026-04-20-BUILD-TRACKS.md (dieses Dokument).  
- HANDOVER-2026-04-20-LINKEDIN-MARKETING.md (separat).  
- COMPANY-OVERVIEW-PRAXISNOVA-AI.md (separat, bilingual).

Aktualisiert:

- TASKS.md: Neuer Block PLATFORM-STANDARDS ROLLOUT (PS.1 bis PS.14).  
- CHANGELOG.md: Part-4-Eintrag oben.

Memory Index:

- feedback\_legal\_phrases.md neu.  
- project\_platform\_standards\_2026-04-20.md neu.  
- MEMORY.md um 2 Eintraege ergaenzt.

Keine direkten Code-Aenderungen an den Live-Repos in dieser Session. Alle Aenderungen passieren erst durch Claude Code nach Prompt-Uebergabe.

---

## 8\. Wichtige Regeln fuer die naechste Session

1. Nie em-dash oder en-dash verwenden. Ersatz: Komma, Punkt, Klammer, Bindestrich (-). Siehe feedback\_writing\_style.md.  
2. Jeder Prompt an Claude Code beginnt mit einer Skills-Pflicht-Sektion und einer Platform-Standards-Referenz. Siehe feedback\_skills\_in\_prompts.md.  
3. Erst Notizen lesen, dann Code lesen, dann erst debuggen, nie raten. Siehe feedback\_debug\_rule.md.  
4. Vor Apply/Fix-Briefings an Claude Code: git log \+ HTTP-Probe pruefen. Siehe feedback\_cowork\_briefing\_preflight.md.  
5. Vor autonomen Multi-Batch-Builds: aktuellen main scannen, Scope-Kollisionen pruefen. Siehe feedback\_main\_state\_check.md.  
6. TASKS.md ist Single-Source-of-Truth fuer Daily Planning. Nach jeder Session updaten.  
7. Alle Reports von Claude Code speichern (Project-Instruction von Angie). Ablage: /sessions/inspiring-kind-pasteur/mnt/Agent build/reports//.  
8. Legal-Wording-Gate Pflicht: siehe feedback\_legal\_phrases.md. Bildungsgutschein, "bis 80% foerderbar" etc. sind BLOCKIERT.

---

## 9\. Was die naechste Session zuerst tun soll, Checkliste

1. Pflichtlektuere durchgehen (Section 1).  
2. git log der beiden Live-Repos pruefen (main, letzte 20 Commits).  
3. Angie kurz status-fragen: "Certification Option A/B/C bereits entschieden?" und "AI-Check Entry-Produkt soll ich fest einplanen?".  
4. Wenn Entscheidungen da: Prompts entsprechend nachschaerfen (kleiner Patch, nicht Neubau).  
5. Claude Code Terminals in der in Section 4 beschriebenen Reihenfolge starten.  
6. Reports nach Abschluss sichern unter /sessions/inspiring-kind-pasteur/mnt/Agent build/reports//.  
7. CHANGELOG.md \+ TASKS.md updaten.  
8. Neues Session-Doc schreiben unter /sessions/inspiring-kind-pasteur/mnt/Agent build/session-docs/.

---

## 10\. Bekannte Risiken

- Scope-Drift bei Track 2 (Website), wenn Foerderclaims durch Hintertuer reinkommen. Legal-Scan zwingend.  
- Doppel-Bau wenn main-State nicht gecheckt wird vor Prompt (Learn 2026-04-20).  
- Agent-Loop bei Track 3, wenn cron\_locks nicht idempotent sind. Hard-Gate im Prompt.  
- DSGVO-Beschwerden bei Outreach ohne korrekten Art.-6-Abs.-1-lit.-f Footer. Apollo-Templates MUESSEN aktualisiert werden.  
- Token-/Cost-Overrun, wenn Tracks parallel gestartet werden ohne Staffelung.

---

## 11\. Kontakt / Escalation

Wenn die neue Session auf harte Blocker stoesst (z. B. Build bricht durch, Legal-Gate rot, Angie nicht erreichbar): Arbeit stoppen, Status in CHANGELOG.md \+ session-doc dokumentieren, Angie Gmail \+ SMS benachrichtigen, nichts auf main mergen.

Ende Handover Build-Tracks.  
