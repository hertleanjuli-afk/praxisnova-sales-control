# Skills Raw Scan 2026-04-17

**Erstellt:** 2026-04-17
**Scope:** Voll-Scan aller `SKILL.md` und `plugin.json` Dateien unter `$HOME` (ausser System-Caches)
**Scan-Dauer:** ca. 4 Minuten (find-Befehle parallel)
**Auftraggeber:** Angie Hertle (Option C Master Plan, Skill-Architecture Sektion 2)

---

## 1. Aggregat-Zahlen

| Metrik | Wert |
|---|---|
| Gefundene `SKILL.md` Dateien | 827 |
| Eindeutige Skill-Namen (Parent-Dir) | 282 |
| Gefundene `plugin.json` Dateien | 61 |
| Skill-relevante Verzeichnisse (Pattern: marketing/skill/praxisnova/agency-agent/.claude/.agents) | 119 |

**Hinweis:** Die hohe Zahl an `SKILL.md` Dateien ist durch Mirroring ueber acht Repos (jeder Repo hat `.claude/skills/` mit den 39 lokalen PraxisNova-Skills) erklaerbar. Die effektive Skill-Anzahl liegt nach Dedup bei ca. 220 (nach Abzug Duplikate, Cowork-Cache-Kopien, "uploads" Cache-Eintraegen).

---

## 2. Quellen-Inventar

### 2.1 Cowork Core Skills (Claude-distributed)

**Pfad:** `~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/3a028f4d-57f6-4c63-babd-68968b0d0bac/c9aee0ef-9f89-4c36-a848-05e962d19dfd/skills/`
**Anzahl:** 15
**Source-Type:** `claude-code-builtin`

Skills:
algorithmic-art, brand-guidelines, canvas-design, consolidate-memory, doc-coauthoring, docx, internal-comms, mcp-builder, pdf, pptx, schedule, setup-cowork, skill-creator, web-artifacts-builder, xlsx

### 2.2 Cowork Plugin Skills (Knowledge-Work Plugins)

**Pfad-Pattern:** `~/Library/Application Support/Claude/local-agent-mode-sessions/c9aee0ef-9f89-4c36-a848-05e962d19dfd/3a028f4d-57f6-4c63-babd-68968b0d0bac/rpm/plugin_*/skills/`
**Anzahl Plugins:** 19
**Anzahl Skills gesamt:** ca. 119
**Source-Type:** `plugin`

| Plugin-ID | Plugin-Name | Skills (Count) | Skill-Liste |
|---|---|---|---|
| plugin_01YS7PZc73j8hf4aEJiRr2KQ | Data Analyst | 10 | analyze, build-dashboard, create-viz, data-context-extractor, data-visualization, explore-data, sql-queries, statistical-analysis, validate-data, write-query |
| plugin_01GC5sHmfRpUwySPemYHW7n5 | Engineering | 10 | architecture, code-review, debug, deploy-checklist, documentation, incident-response, standup, system-design, tech-debt, testing-strategy |
| plugin_01XLdTqJWhdxY7QuErqYHnFL | Sales | 9 | account-research, call-prep, call-summary, competitive-intelligence, create-an-asset, daily-briefing, draft-outreach, forecast, pipeline-review |
| plugin_01S5vijNgfCWGfVaeNbYCdNz | Operations | 9 | capacity-plan, change-request, compliance-tracking, process-doc, process-optimization, risk-assessment, runbook, status-report, vendor-review |
| plugin_01M1e3zn4FaacRqzf1kNsSAN | HR | 9 | comp-analysis, draft-offer, interview-prep, onboarding, org-planning, people-report, performance-review, policy-lookup, recruiting-pipeline |
| plugin_01MDPHx1gWYn4qF2NfPQJSM1 | Legal Productivity | 9 | brief, compliance-check, legal-response, legal-risk-assessment, meeting-briefing, review-contract, signature-request, triage-nda, vendor-check |
| plugin_01XH8yMVJbQydrVkX6WgLvck | Marketing | 8 | brand-review, campaign-plan, competitive-brief, content-creation, draft-content, email-sequence, performance-report, seo-audit |
| plugin_01NwRqPNp2fymu8ctzJhD4fx | Product Management | 8 | competitive-brief, metrics-review, product-brainstorming, roadmap-update, sprint-planning, stakeholder-update, synthesize-research, write-spec |
| plugin_015mMo6NfTokoNVaKCDw72FM | Finance and Accounting | 8 | audit-support, close-management, financial-statements, journal-entry, journal-entry-prep, reconciliation, sox-testing, variance-analysis |
| plugin_01KjzMcMh2RYCovBRPy8VJC8 | Bio-Research | 6 | instrument-data-to-allotrope, nextflow-development, scientific-problem-selection, scvi-tools, single-cell-rna-qc, start |
| plugin_017g1fvepTa1LPLHZw93nEpJ | Common Room | 6 | account-research, call-prep, compose-outreach, contact-research, prospect, weekly-prep-brief |
| plugin_01LE8tT9qAeeXKkpJ3yvTHUM | Customer Support | 5 | customer-escalation, customer-research, draft-response, kb-article, ticket-triage |
| plugin_01C5Vqmi896cvokigm3MZSVU | Enterprise Search | 5 | digest, knowledge-synthesis, search, search-strategy, source-management |
| plugin_011VCCbVFqAn2m9NLT6tYcch | Design | 7 | accessibility-review, design-critique, design-handoff, design-system, research-synthesis, user-research, ux-copy |
| plugin_01MKcJsEAmPJswuCytbMJYZJ | Productivity | 5 | dashboard.html, memory-management, start, task-management, update |
| plugin_01FH9TqiaHWhhAGSQo7UCTZt | Brand Voice | 3 | brand-voice-enforcement, discover-brand, guideline-generation |
| plugin_01578WzEQ99fNAkr5AEQ2qY4 | Apollo (Claude Code and Cowork) | 3 | enrich-lead, prospect, sequence-load |
| plugin_018pLNd4CGF8vEEmyztWR7fi | Cowork Plugin Customizer | 2 | cowork-plugin-customizer, create-cowork-plugin |
| plugin_0113jG9ujs2aj4giJ7X4SQ3d | PDF Viewer | 1 | view-pdf |

### 2.3 Vercel Plugin Skills (Claude Code Marketplace)

**Pfad:** `~/.claude/plugins/cache/claude-plugins-official/vercel/0.40.0/skills/`
**Anzahl:** 25
**Source-Type:** `plugin`

Skills: ai-gateway, ai-sdk, auth, bootstrap, chat-sdk, deployments-cicd, env-vars, knowledge-update, marketplace, next-cache-components, next-forge, next-upgrade, nextjs, react-best-practices, routing-middleware, runtime-cache, shadcn, turbopack, vercel-agent, vercel-cli, vercel-functions, vercel-sandbox, vercel-storage, verification, workflow

**Weitere Marketplace Plugins ohne Skills (nur Commands/Hooks):** claude-code-setup, mcp-server-dev, feature-dev, claude-md-management, playground, example-plugin, learning-output-style, code-review, plugin-dev, math-olympiad, pr-review-toolkit, skill-creator, security-guidance, frontend-design, agent-sdk-dev, explanatory-output-style, commit-commands, ralph-loop, hookify, code-simplifier, terraform, discord, gitlab, context7, linear, greptile, serena.

### 2.4 Cursor Skills

**Pfad:** `~/.cursor/skills-cursor/`
**Anzahl:** 8
**Source-Type:** `external-cursor`

Skills: canvas, create-rule, create-skill, create-subagent, cursor-blame, migrate-to-skills, shell, update-cursor-settings

### 2.5 PraxisNova Local Skills (Angie's Marketing-Sammlung)

**Pfad A (Master-Sammlung 39 Skills):** `~/Desktop/PraxisNovaAI/skills/`
**Pfad B (Marketing-Subset 36 Skills):** `~/Desktop/PraxisNovaAI/skills/marketing/skills/`
**Mirror-Pfad:** `~/.agents/skills/marketing/skills/` (identisch, nur Spiegel)
**Source-Type:** `user-downloaded` (gedownloaded von marketing-skills.dev oder Anthropic Skills Marketplace, last_modified 2026-04-15)

**Master-Liste (39 Skills, ~/Desktop/PraxisNovaAI/skills/):**
ab-test-setup, ad-creative, ai-seo, analytics-tracking, artifacts-builder, brand-guidelines, churn-prevention, cold-email, competitive-ads-extractor, competitor-alternatives, content-research-writer, content-strategy, copy-editing, copywriting, customer-research, email-sequence, form-cro, free-tool-strategy, launch-strategy, lead-magnets, lead-research-assistant, marketing, marketing-ideas, marketing-psychology, onboarding-cro, page-cro, paid-ads, paywall-upgrade-cro, popup-cro, pricing-strategy, product-marketing-context, programmatic-seo, referral-program, revops, sales-enablement, schema-markup, seo-audit, signup-flow-cro, site-architecture, social-content

Hinweis: Diese 39 Skills sind in 8 weiteren Repos unter `.claude/skills/` als Mirror vorhanden:
- `~/Documents/GitHub/praxisnova-sales-control/.claude/skills/` (das Working-Repo)
- `~/VERALTET-praxisnova-sales-control/.claude/skills/`
- `~/praxisnova-website/.claude/skills/`
- `~/Desktop/PraxisNovaAI/repos/praxisnova-website/.claude/skills/`
- `~/Desktop/PraxisNovaAI/repos/praxisnova-leads-tool/.claude/skills/`
- `~/Desktop/PraxisNovaAI/repos/praxisnova-content-pipeline/.claude/skills/`
- `~/Desktop/PraxisNovaAI/repos/praxisnova-carousel-generator/.claude/skills/`
- `~/Desktop/PraxisAcademyAI/skills/` und `~/Desktop/PraxisAcademyAI/repos/praxisacademy-website/.claude/skills/`

**Aelterer Marketing-Skill-Snapshot (34 Skills, vermutlich vorgaenger-Download):**
`~/Documents/Claude/Projects/Webseite/marketingskills/`

### 2.6 PraxisNova Scheduled Tasks (one-shot Skills)

**Pfad:** `~/Documents/Claude/Scheduled/`
**Anzahl:** 13
**Source-Type:** `praxisnova-owned`

Skills: api-key-upgrade-reminder, daily-build-planner, daily-session-documenter, fix1-brevo-retry-assessment, monday-cron-check, phase2-kickoff-2026-05-04, phase3-kickoff-2026-06-01, praxisnova-apollo-pipeline-refresh, praxisnova-inbound-response-agent, praxisnova-lead-enrollment, praxisnova-market-intelligence, week2-kickoff-2026-04-20, weekly-friday-retrospective

### 2.7 Antigravity / VSCode-Python Beispiel-Skills

**Pfad:** `~/.antigravity/extensions/ms-python.vscode-python-envs-1.20.1-universal/.github/skills/`
**Anzahl:** 9
**Source-Type:** `external-github` (Sample-Skills aus GitHub Skills-Tutorial fuer Python-Env-Plugin)
**Relevanz fuer uns:** Niedrig (Python-Tutorials)

### 2.8 Local Cache "uploads"

**Pfad-Pattern:** `~/Library/Application Support/Claude/local-agent-mode-sessions/.../local_*/uploads/SKILL.md`
**Anzahl:** 24
**Source-Type:** `cache` (vom Cowork-Client aus Sessions hochgeladene Skills)
**Relevanz:** Niedrig, sind temporaere Snapshots, nicht stabil als Quelle.

### 2.9 External Reference: msitarzewski/agency-agents

**Pfad:** `~/praxisnovaai-external/agency-agents/`
**Cloned:** 2026-04-17 (frisch geklont fuer diesen Scan)
**Source-Type:** `external-github`

Struktur: 20 Top-Level-Kategorien, jeweils mit role-basierten Agent-Files (Markdown mit YAML-Frontmatter):
- academic, design, engineering, examples, finance, game-development, integrations, marketing, paid-media, product, project-management, sales, scripts, spatial-computing, specialized, strategy, support, testing

**Sales-Agenten (8):** sales-account-strategist, sales-coach, sales-deal-strategist, sales-discovery-coach, sales-engineer, sales-outbound-strategist, sales-pipeline-analyst, sales-proposal-strategist

**Marketing-Agenten (30):** marketing-agentic-search-optimizer, marketing-ai-citation-strategist, marketing-app-store-optimizer, marketing-content-creator, marketing-growth-hacker, marketing-instagram-curator, marketing-linkedin-content-creator, marketing-podcast-strategist, marketing-reddit-community-builder, marketing-seo-specialist, marketing-tiktok-strategist, marketing-twitter-engager, marketing-video-optimization-specialist, plus China-Spezifika.

**Workflow-Beispiele:** examples/workflow-startup-mvp.md, workflow-landing-page.md, workflow-book-chapter.md, workflow-with-memory.md (zeigen Multi-Agent-Sequenzierung mit Hand-off zwischen Agenten)

---

## 3. Lookup-Tabelle: SKILL.md Dateien pro Top-Level-Verzeichnis (>=5 Treffer)

| Anzahl | Pfad |
|---|---|
| 39 | `~/praxisnova-website/.claude/skills` |
| 39 | `~/VERALTET-praxisnova-sales-control/.claude/skills` |
| 39 | `~/Documents/GitHub/praxisnova-sales-control/.claude/skills` |
| 39 | `~/Desktop/PraxisNovaAI/skills` |
| 39 | `~/Desktop/PraxisNovaAI/repos/praxisnova-website/.claude/skills` |
| 39 | `~/Desktop/PraxisNovaAI/repos/praxisnova-leads-tool/.claude/skills` |
| 39 | `~/Desktop/PraxisNovaAI/repos/praxisnova-content-pipeline/.claude/skills` |
| 39 | `~/Desktop/PraxisNovaAI/repos/praxisnova-carousel-generator/.claude/skills` |
| 39 | `~/Desktop/PraxisNovaAI/repos/VERALTET-praxisnova-sales-control/.claude/skills` |
| 39 | `~/Desktop/PraxisAcademyAI/skills` |
| 39 | `~/Desktop/PraxisAcademyAI/repos/praxisacademy-website/.claude/skills` |
| 36 | `~/Desktop/PraxisNovaAI/skills/marketing/skills` |
| 36 | `~/.agents/skills/marketing/skills` |
| 34 | `~/Documents/Claude/Projects/Webseite/marketingskills` |
| 27 | `~/.agents/skills` |
| 25 | `~/.claude/plugins/cache/claude-plugins-official/vercel/0.40.0/skills` |
| 15 | `~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/.../skills` |
| 13 | `~/Documents/Claude/Scheduled` |
| 8-10 | (mehrere Cowork plugin_* Dirs) |

---

## 4. Top-50 Eindeutige Skill-Namen (nach Vorkommens-Haeufigkeit)

| Count | Skill-Name |
|---|---|
| 24 | uploads (Cache, kein echter Skill-Name) |
| 15 | seo-audit |
| 15 | email-sequence |
| 15 | customer-research |
| 14 | social-content, site-architecture, signup-flow-cro, schema-markup, sales-enablement, revops, referral-program, programmatic-seo, product-marketing-context, pricing-strategy, popup-cro, paywall-upgrade-cro, paid-ads, page-cro, onboarding-cro, marketing-psychology, marketing-ideas, lead-magnets, launch-strategy, free-tool-strategy, form-cro, copywriting, copy-editing, content-strategy, competitor-alternatives, cold-email, churn-prevention, analytics-tracking, ai-seo, ad-creative, ab-test-setup |
| 13 | brand-guidelines |
| 12 | lead-research-assistant, content-research-writer, competitive-ads-extractor, artifacts-builder |
| 10 | upstream (Antigravity-Beispiel) |

Die Skills mit count >=12 sind die "Mirror-Standardpaket", das in jedem Repo `.claude/skills/` Ordner liegt. Skills mit count =1 sind Plugin-spezifisch oder lokal-spezifisch (echte Unikate).

---

## 5. Bekannte Luecken und Beobachtungen

- **Es wurde keine eigene PraxisNova-Skill-Sammlung gefunden, die ueber das Marketing-Skill-Paket hinausgeht.** Das deckt sich mit SKILL-ARCHITECTURE Sektion 2.1: "PraxisAI-Local-Skills sind Start-Zustand 0 bis 20."
- **Design-Skills:** Im Cowork-Plugin "Design" gibt es 7 Skills (accessibility-review, design-critique, design-handoff, design-system, research-synthesis, user-research, ux-copy). In den lokalen 39 PraxisNova-Skills ist nur `brand-guidelines` als Design-Skill enthalten. **Empfehlung:** Cowork-Design-Plugin als primaer nutzen.
- **Sales-Skills lokal:** In den 39 PraxisNova-Skills sind `sales-enablement`, `revops` und `cold-email` als Sales-relevant. Ergaenzend gibt es 9 Cowork-Plugin-Skills im Sales-Plugin (call-prep, draft-outreach, etc.) und 8 Agency-Agents (sales-coach, sales-outbound-strategist, etc.).
- **Skills-Mirror in 8 Repos:** Wahrscheinlich entstanden durch CLAUDE.md-getriebene Auto-Installation. Empfehlung in Manifest: nur kanonischen Pfad pflegen, Mirror nur erwaehnen.
- **Praxis-Marketing-Skill `marketing` (im Wurzel-Skills-Ordner):** Eigentlich der Container fuer das marketing-skills-Bundle. Nicht als eigener Skill listen.
- **`uploads/SKILL.md`:** Cache-Artefakt, ignorieren.

---

## 6. Scan-Befehle (zur Reproduzierbarkeit)

```bash
find "$HOME" -type f \( -name "SKILL.md" -o -name "skill.md" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/Library/Caches/*" -not -path "*/.Trash/*" -not -path "*/.cache/*" \
  2>/dev/null

find "$HOME" -type f -name "plugin.json" \
  -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/Library/Caches/*" 2>/dev/null

find "$HOME" -type d \( -iname "*marketing*skill*" -o -iname "*skill*marketing*" \
  -o -iname "*design*skill*" -o -iname "*praxisnova*" -o -iname "*agency-agent*" \
  -o -iname ".claude" -o -iname ".agents" \) \
  -not -path "*/node_modules/*" -not -path "*/Library/Caches/*" 2>/dev/null
```

---

**Status:** Roh-Scan abgeschlossen, dient als Input fuer SKILLS-MANIFEST.md (kuratiert, dedupliziert, kategorisiert).
