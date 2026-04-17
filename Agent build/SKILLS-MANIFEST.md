# SKILLS-MANIFEST

**Single Source of Truth fuer alle Skills, die in PraxisNova-Agenten und PraxisNova-Builds genutzt werden koennen.**

---

## Meta

| Feld | Wert |
|---|---|
| Created | 2026-04-17 |
| Created by | Claude Code (Initial Skill-Scan, Batch A Vorbereitung) |
| Schema | SKILL-ARCHITECTURE-2026-04-17.md Sektion 3 |
| Total unique skills | 220 (nach Dedup, ohne 24 "uploads" Cache-Eintraege) |
| Sources scanned | 9 (Cowork-Core, 19 Cowork-Plugins, Vercel-Plugin, Cursor, PraxisNova-Local, PraxisNova-Scheduled, Antigravity-Demo, External-Github, Project-Repo-Mirrors) |
| Scan duration | ca. 4 Minuten (parallele find-Befehle) |
| Naechster Scan | Wochentlich Freitags durch Operations-Manager-Agent (siehe Sektion 5.2 SKILL-ARCHITECTURE) |
| Source-Type Werte | `core`, `plugin`, `local`, `external-ref`, `external-cursor`, `praxisnova-owned`, `external-github` |
| Kategorien | sales, marketing, engineering, data, operations, content, legal, finance, hr, design, brand, customer-support, productivity, meta, search, product-management, vercel, scheduled-task, other |

**Mirror-Hinweis:** Skills, die in `<repo>/.claude/skills/` mehrfach vorhanden sind, werden im Manifest nur einmal mit ihrem kanonischen Pfad gelistet (`~/Desktop/PraxisNovaAI/skills/<name>/SKILL.md` als Master). Die Mirror-Pfade existieren in 8 weiteren Repos und werden bei Aenderungen via Symlink-Migration in Batch B konsolidiert.

---

## Kategorie: sales

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| sales.draft-outreach | Draft Outreach | ~/Library/.../rpm/plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/draft-outreach/SKILL.md | plugin (Cowork Sales) | Prospect-Profil | Personalisierter Outreach-Text | 2026-04-17 | [outreach_strategist] | active | local.cold-email | Primary Outreach-Skill fuer alle Kanaele |
| sales.account-research | Account Research | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/account-research/SKILL.md | plugin (Cowork Sales) | Firmenname/Domain | Strukturiertes Account-Profil | 2026-04-17 | [outreach_strategist, lead_ingestor] | active | apollo.prospect | Optional, ergaenzt Apollo-Daten |
| sales.call-prep | Call Prep | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/call-prep/SKILL.md | plugin (Cowork Sales) | Lead + Termin | Briefing-Doc Markdown | 2026-04-17 | [call_list_builder] | active | sales.daily-briefing | Verwendet auch von Real Estate Pilot Vorbereitung |
| sales.call-summary | Call Summary | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/call-summary/SKILL.md | plugin (Cowork Sales) | Call-Transkript | Strukturierte Notiz | 2026-04-17 | [reply_detector] | active | manual_notes | Nutzbar nach Discovery-Calls |
| sales.competitive-intelligence | Competitive Intelligence | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/competitive-intelligence/SKILL.md | plugin (Cowork Sales) | Konkurrent-Liste | Vergleichs-Brief | 2026-04-17 | [outreach_strategist] | active | sales.account-research | Battle-Card-Style |
| sales.create-an-asset | Create Sales Asset | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/create-an-asset/SKILL.md | plugin (Cowork Sales) | Use-Case + Branche | One-Pager / Slide | 2026-04-17 | [content_scheduler] | experimental | manual | Fuer Workshop-Angebote |
| sales.daily-briefing | Daily Briefing | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/daily-briefing/SKILL.md | plugin (Cowork Sales) | Pipeline-State | Tages-Briefing-Markdown | 2026-04-17 | [call_list_builder, operations_manager] | active | simple_sql_query | Tagestask 08:00 |
| sales.forecast | Forecast | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/forecast/SKILL.md | plugin (Cowork Sales) | Pipeline | Forecast-Tabelle | 2026-04-17 | [operations_manager] | experimental | spreadsheet_manual | Erst ab Pipeline >= 10 Deals sinnvoll |
| sales.pipeline-review | Pipeline Review | ~/Library/.../plugin_01XLdTqJWhdxY7QuErqYHnFL/skills/pipeline-review/SKILL.md | plugin (Cowork Sales) | Deals + Activities | Review-Notiz mit Risiken | 2026-04-17 | [call_list_builder] | active | sales.daily-briefing | Wochenraster Freitag |
| local.cold-email | Cold Email Writing | ~/Desktop/PraxisNovaAI/skills/cold-email/SKILL.md | local (downloaded marketing-skills) | ICP + Trigger | Cold-Email-Draft | 2026-04-17 | [outreach_strategist] | active | sales.draft-outreach | Fuer Englische Outbound-Texte; deutsch ggf. local.draft-content |
| local.sales-enablement | Sales Enablement Pack | ~/Desktop/PraxisNovaAI/skills/sales-enablement/SKILL.md | local (downloaded marketing-skills) | Produkt + ICP | Pitch-Deck/One-Pager | 2026-04-17 | [content_scheduler] | active | sales.create-an-asset | Fuer Workshop-Sales-Materialien |
| local.revops | RevOps | ~/Desktop/PraxisNovaAI/skills/revops/SKILL.md | local (downloaded marketing-skills) | Lead-Lifecycle-Daten | Lead-Scoring + Routing | 2026-04-17 | [lead_ingestor, call_list_builder] | active | manual_segmentation | Fuer Lead-Pipeline-Mechanik |
| common-room.prospect | Common Room Prospect | ~/Library/.../plugin_017g1fvepTa1LPLHZw93nEpJ/skills/prospect/SKILL.md | plugin (Common Room) | Community-Signal | Lead-Liste | 2026-04-17 | [lead_ingestor] | experimental | apollo.prospect | Sekundaere Lead-Quelle |
| common-room.account-research | Common Room Account Research | ~/Library/.../plugin_017g1fvepTa1LPLHZw93nEpJ/skills/account-research/SKILL.md | plugin (Common Room) | Firma | Community-Account-Profil | 2026-04-17 | [outreach_strategist] | experimental | sales.account-research | Bei Community-Tracking aktiv |
| common-room.compose-outreach | Compose Outreach | ~/Library/.../plugin_017g1fvepTa1LPLHZw93nEpJ/skills/compose-outreach/SKILL.md | plugin (Common Room) | Lead + Signal | Outreach-Text | 2026-04-17 | [outreach_strategist] | experimental | sales.draft-outreach | Fuer Community-Trigger |

## Kategorie: marketing

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| marketing.draft-content | Draft Content | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/draft-content/SKILL.md | plugin (Cowork Marketing) | Brief + Brand-Voice | Content-Draft | 2026-04-17 | [content_scheduler, outreach_strategist] | active | local.copywriting | Universalskill fuer Content |
| marketing.email-sequence | Email Sequence | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/email-sequence/SKILL.md | plugin (Cowork Marketing) | ICP + Ziel | Multi-Step-Sequence | 2026-04-17 | [outreach_strategist] | active | local.email-sequence | Plugin-Variante 8 Skills bundle |
| marketing.content-creation | Content Creation | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/content-creation/SKILL.md | plugin (Cowork Marketing) | Topic + Format | Vollformat-Content | 2026-04-17 | [content_scheduler] | active | local.copywriting | Fuer LinkedIn-Posts und Blog |
| marketing.brand-review | Brand Review | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/brand-review/SKILL.md | plugin (Cowork Marketing) | Draft | Brand-Konformitaets-Check | 2026-04-17 | [content_scheduler] | active | local.brand-guidelines | Pflicht vor Versand |
| marketing.campaign-plan | Campaign Plan | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/campaign-plan/SKILL.md | plugin (Cowork Marketing) | Ziel + Timeline | Kampagnen-Plan | 2026-04-17 | [content_scheduler] | experimental | manual | Fuer ueber-Wochen-Kampagnen |
| marketing.competitive-brief | Competitive Brief | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/competitive-brief/SKILL.md | plugin (Cowork Marketing) | Konkurrenten-Liste | Competitive Brief | 2026-04-17 | [outreach_strategist] | active | sales.competitive-intelligence | Marketing-Cousin, eher Messaging |
| marketing.performance-report | Performance Report | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/performance-report/SKILL.md | plugin (Cowork Marketing) | Channel-Daten | KPI-Report | 2026-04-17 | [operations_manager] | experimental | dashboard_manual | Erst nach Tracking-Setup |
| marketing.seo-audit | SEO Audit (Plugin) | ~/Library/.../plugin_01XH8yMVJbQydrVkX6WgLvck/skills/seo-audit/SKILL.md | plugin (Cowork Marketing) | URL | SEO-Findings | 2026-04-17 | [content_scheduler] | active | local.seo-audit | Bevorzugt Plugin-Variante (neuer) |
| local.copywriting | Copywriting | ~/Desktop/PraxisNovaAI/skills/copywriting/SKILL.md | local | Page-Spec | Marketing-Copy | 2026-04-17 | [content_scheduler] | active | marketing.draft-content | Conversion-fokussierte Page-Copy |
| local.copy-editing | Copy Editing | ~/Desktop/PraxisNovaAI/skills/copy-editing/SKILL.md | local | Existing-Copy | Polished-Copy | 2026-04-17 | [content_scheduler] | active | local.copywriting | Polish-Pass nach Draft |
| local.email-sequence | Email Sequence (Local) | ~/Desktop/PraxisNovaAI/skills/email-sequence/SKILL.md | local | ICP | Drip-Sequence | 2026-04-17 | [outreach_strategist] | active | marketing.email-sequence | Fuer Lifecycle/Nurture |
| local.cold-email | Cold Email | ~/Desktop/PraxisNovaAI/skills/cold-email/SKILL.md | local | ICP + Trigger | Cold-Email-Draft + Sequence | 2026-04-17 | [outreach_strategist] | active | sales.draft-outreach | Multi-Touch-Sequence-Bauer |
| local.social-content | Social Content | ~/Desktop/PraxisNovaAI/skills/social-content/SKILL.md | local | Topic | LinkedIn/X/Insta-Posts | 2026-04-17 | [content_scheduler] | active | marketing.content-creation | LinkedIn-Carousel-Skills enthalten |
| local.content-strategy | Content Strategy | ~/Desktop/PraxisNovaAI/skills/content-strategy/SKILL.md | local | Audience + Goals | Editorial-Calendar | 2026-04-17 | [content_scheduler] | active | manual | Strategieebene, vor Erstellung |
| local.content-research-writer | Content Research Writer | ~/Desktop/PraxisNovaAI/skills/content-research-writer/SKILL.md | local | Topic | Research-backed Article | 2026-04-17 | [content_scheduler] | active | local.copywriting | Mit Citation-Mining |
| local.marketing-ideas | Marketing Ideas | ~/Desktop/PraxisNovaAI/skills/marketing-ideas/SKILL.md | local | Produkt | Idee-Liste | 2026-04-17 | [operations_manager] | active | manual | Brainstorm-Skill |
| local.marketing-psychology | Marketing Psychology | ~/Desktop/PraxisNovaAI/skills/marketing-psychology/SKILL.md | local | Copy/Funnel | Psych-Optimierungen | 2026-04-17 | [content_scheduler] | active | local.copywriting | Anwendung von Cialdini etc. |
| local.competitor-alternatives | Competitor Alternatives Pages | ~/Desktop/PraxisNovaAI/skills/competitor-alternatives/SKILL.md | local | Konkurrent | vs-Page-Content | 2026-04-17 | [content_scheduler] | active | sales.competitive-intelligence | Fuer Website-SEO-Pages |
| local.competitive-ads-extractor | Competitive Ads Extractor | ~/Desktop/PraxisNovaAI/skills/competitive-ads-extractor/SKILL.md | local | Ad-Library-URLs | Wettbewerbs-Insights | 2026-04-17 | [outreach_strategist] | experimental | manual_screenshots | Aus FB/LinkedIn Ad Library |
| local.ad-creative | Ad Creative | ~/Desktop/PraxisNovaAI/skills/ad-creative/SKILL.md | local | Produkt + Platform | Bulk-Ad-Variants | 2026-04-17 | [content_scheduler] | experimental | manual | Erst wenn Ads im Plan |
| local.paid-ads | Paid Ads Strategy | ~/Desktop/PraxisNovaAI/skills/paid-ads/SKILL.md | local | Budget + Goals | Kampagnen-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Out of scope Woche 1 (Option C: kein Ad-Spend) |
| local.launch-strategy | Launch Strategy | ~/Desktop/PraxisNovaAI/skills/launch-strategy/SKILL.md | local | Produkt | Launch-Checklist | 2026-04-17 | [operations_manager] | experimental | manual | Fuer Q3 Kurs-Launch |
| local.referral-program | Referral Program | ~/Desktop/PraxisNovaAI/skills/referral-program/SKILL.md | local | Produkt | Referral-Mechanik | 2026-04-17 | [operations_manager] | experimental | manual | Spaeterer Wachstumshebel |
| local.lead-magnets | Lead Magnets | ~/Desktop/PraxisNovaAI/skills/lead-magnets/SKILL.md | local | Audience | Lead-Magnet-Spec | 2026-04-17 | [content_scheduler] | active | manual | Foerdermittel-One-Pager Use-Case |
| local.lead-research-assistant | Lead Research Assistant | ~/Desktop/PraxisNovaAI/skills/lead-research-assistant/SKILL.md | local | Produkt | Hyper-qualifizierte Lead-Liste | 2026-04-17 | [lead_ingestor] | active | apollo.prospect | Fuer LinkedIn-Blitz Kanal C |
| local.churn-prevention | Churn Prevention | ~/Desktop/PraxisNovaAI/skills/churn-prevention/SKILL.md | local | Cohort | Retention-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Erst ab Retainer-Kunden |
| local.product-marketing-context | Product Marketing Context | ~/Desktop/PraxisNovaAI/skills/product-marketing-context/SKILL.md | local | Produkt + ICP | Context-Doc fuer alle Skills | 2026-04-17 | [all] | active | CLAUDE.md | Setup-Skill, vor allen anderen Marketing-Skills |
| local.free-tool-strategy | Free Tool Strategy | ~/Desktop/PraxisNovaAI/skills/free-tool-strategy/SKILL.md | local | Audience | Tool-Konzept | 2026-04-17 | [operations_manager] | experimental | manual | Foerdermittel-Calculator Use-Case |
| local.customer-research | Customer Research | ~/Desktop/PraxisNovaAI/skills/customer-research/SKILL.md | local | Bestandskunden | ICP-Insights | 2026-04-17 | [operations_manager] | active | customer-support.customer-research | Aus Calls/Reviews |

## Kategorie: cro (Marketing-Sub: Conversion Rate Optimization)

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| local.page-cro | Page CRO | ~/Desktop/PraxisNovaAI/skills/page-cro/SKILL.md | local | Page-URL | CRO-Recommendations | 2026-04-17 | [content_scheduler] | active | local.copywriting | Fuer /ki-fuer-hausverwaltungen |
| local.signup-flow-cro | Signup Flow CRO | ~/Desktop/PraxisNovaAI/skills/signup-flow-cro/SKILL.md | local | Flow | Optimierungen | 2026-04-17 | [content_scheduler] | experimental | manual | Spaeter, wenn Self-Service kommt |
| local.form-cro | Form CRO | ~/Desktop/PraxisNovaAI/skills/form-cro/SKILL.md | local | Form | Form-Verbesserungen | 2026-04-17 | [content_scheduler] | active | local.page-cro | Lead-Capture-Forms |
| local.popup-cro | Popup CRO | ~/Desktop/PraxisNovaAI/skills/popup-cro/SKILL.md | local | Popup | Popup-Strategie | 2026-04-17 | [content_scheduler] | experimental | manual | Erst Phase 2 |
| local.onboarding-cro | Onboarding CRO | ~/Desktop/PraxisNovaAI/skills/onboarding-cro/SKILL.md | local | Onboarding-Flow | Aktivierungs-Plan | 2026-04-17 | [content_scheduler] | experimental | manual | Spaeter, fuer Workshop-Onboarding |
| local.paywall-upgrade-cro | Paywall Upgrade CRO | ~/Desktop/PraxisNovaAI/skills/paywall-upgrade-cro/SKILL.md | local | Paywall | Upsell-Plan | 2026-04-17 | [content_scheduler] | experimental | manual | Erst ab Self-Serve-Produkt |
| local.ab-test-setup | A/B Test Setup | ~/Desktop/PraxisNovaAI/skills/ab-test-setup/SKILL.md | local | Hypothese | Test-Plan | 2026-04-17 | [content_scheduler] | experimental | manual | Fuer Phase 2 Optimierungen |
| local.analytics-tracking | Analytics Tracking | ~/Desktop/PraxisNovaAI/skills/analytics-tracking/SKILL.md | local | Site | GA4/Mixpanel-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Tracking-Setup-Skill |
| local.pricing-strategy | Pricing Strategy | ~/Desktop/PraxisNovaAI/skills/pricing-strategy/SKILL.md | local | Produkt | Pricing-Modell | 2026-04-17 | [operations_manager] | active | manual | Bereits im Master-Plan angewandt (2.900/4.900/3.500/8.000) |

## Kategorie: seo

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| local.seo-audit | SEO Audit (Local) | ~/Desktop/PraxisNovaAI/skills/seo-audit/SKILL.md | local | URL | SEO-Audit-Bericht | 2026-04-17 | [content_scheduler] | active | marketing.seo-audit | Lokale Variante mit Fokus auf SaaS |
| local.ai-seo | AI SEO | ~/Desktop/PraxisNovaAI/skills/ai-seo/SKILL.md | local | Content | LLM-Optimierung | 2026-04-17 | [content_scheduler] | active | local.seo-audit | Fuer ChatGPT/Perplexity-Sichtbarkeit |
| local.programmatic-seo | Programmatic SEO | ~/Desktop/PraxisNovaAI/skills/programmatic-seo/SKILL.md | local | Daten + Template | Mass-Pages | 2026-04-17 | [content_scheduler] | experimental | manual | Fuer /ki-fuer-{branche}/{stadt} |
| local.site-architecture | Site Architecture | ~/Desktop/PraxisNovaAI/skills/site-architecture/SKILL.md | local | Pages | IA + Sitemap | 2026-04-17 | [content_scheduler] | active | manual | Fuer Praxis-Website Restrukturierung |
| local.schema-markup | Schema Markup | ~/Desktop/PraxisNovaAI/skills/schema-markup/SKILL.md | local | Page | JSON-LD | 2026-04-17 | [content_scheduler] | active | manual | Fuer Rich Snippets |

## Kategorie: brand

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| brand-voice.brand-voice-enforcement | Brand Voice Enforcement | ~/Library/.../plugin_01FH9TqiaHWhhAGSQo7UCTZt/skills/brand-voice-enforcement/SKILL.md | plugin (Brand Voice) | Draft | Brand-konformer Text | 2026-04-17 | [content_scheduler, outreach_strategist] | active | local.brand-guidelines | Pflicht vor allen Customer-facing Texten |
| brand-voice.discover-brand | Discover Brand | ~/Library/.../plugin_01FH9TqiaHWhhAGSQo7UCTZt/skills/discover-brand/SKILL.md | plugin (Brand Voice) | Existing-Materials | Brand-Profil | 2026-04-17 | [operations_manager] | experimental | manual | Initialer Brand-Audit |
| brand-voice.guideline-generation | Brand Guideline Generation | ~/Library/.../plugin_01FH9TqiaHWhhAGSQo7UCTZt/skills/guideline-generation/SKILL.md | plugin (Brand Voice) | Brand-Profil | Voice-Guidelines | 2026-04-17 | [operations_manager] | experimental | manual | Output: brand-voice-doc |
| local.brand-guidelines | PraxisNova Brand Guidelines | ~/Desktop/PraxisNovaAI/skills/brand-guidelines/SKILL.md | local (PraxisNova) | (keine, statisch) | Color/Typo-Spec | 2026-04-17 | [content_scheduler, all] | active | manual | PraxisNova/PraxisAcademy Farben + Typo |

## Kategorie: engineering

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| engineering.architecture | Architecture | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/architecture/SKILL.md | plugin (Cowork Engineering) | Problem | ADR / Architektur-Skizze | 2026-04-17 | [operations_manager, claude_code_self] | active | manual | Pflicht-Skill fuer Architektur-Entscheidungen (siehe CLAUDE.md) |
| engineering.system-design | System Design | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/system-design/SKILL.md | plugin (Cowork Engineering) | Feature | System-Spec | 2026-04-17 | [claude_code_self] | active | engineering.architecture | Fuer neue Features |
| engineering.code-review | Code Review | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/code-review/SKILL.md | plugin (Cowork Engineering) | Diff/PR | Review-Notes | 2026-04-17 | [claude_code_self] | active | manual | Pflicht vor jedem PR |
| engineering.debug | Debug | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/debug/SKILL.md | plugin (Cowork Engineering) | Error/Repro | Root-Cause-Analyse | 2026-04-17 | [health_checker, claude_code_self] | active | manual | Fuer alle Bug-Fixes |
| engineering.deploy-checklist | Deploy Checklist | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/deploy-checklist/SKILL.md | plugin (Cowork Engineering) | Release | Deploy-Checkliste | 2026-04-17 | [claude_code_self] | active | manual | Vor jedem Vercel-Deploy |
| engineering.documentation | Documentation | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/documentation/SKILL.md | plugin (Cowork Engineering) | Code/Feature | Doc-Markdown | 2026-04-17 | [claude_code_self] | active | manual | Pflicht fuer alle Doku-Tasks (genutzt in diesem Scan!) |
| engineering.incident-response | Incident Response | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/incident-response/SKILL.md | plugin (Cowork Engineering) | Incident | Runbook + Postmortem | 2026-04-17 | [health_checker, email_sender] | active | manual | Fuer P0/P1 Faelle |
| engineering.standup | Standup | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/standup/SKILL.md | plugin (Cowork Engineering) | Tagesstand | Standup-Notiz | 2026-04-17 | [operations_manager] | experimental | manual | Bei Team >2 |
| engineering.tech-debt | Tech Debt | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/tech-debt/SKILL.md | plugin (Cowork Engineering) | Codebase | Tech-Debt-Backlog | 2026-04-17 | [health_checker] | active | manual | Wochenraster |
| engineering.testing-strategy | Testing Strategy | ~/Library/.../plugin_01GC5sHmfRpUwySPemYHW7n5/skills/testing-strategy/SKILL.md | plugin (Cowork Engineering) | Feature | Test-Plan | 2026-04-17 | [claude_code_self] | active | manual | Pflicht bei neuen Features |

## Kategorie: data

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| data.validate-data | Validate Data | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/validate-data/SKILL.md | plugin (Data Analyst) | Dataset | Validierungs-Bericht | 2026-04-17 | [lead_ingestor] | active | manual | Pflicht fuer Apollo-Imports |
| data.write-query | Write SQL Query | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/write-query/SKILL.md | plugin (Data Analyst) | Frage + Schema | SQL | 2026-04-17 | [operations_manager, call_list_builder] | active | manual | Fuer Neon-Queries |
| data.sql-queries | SQL Queries | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/sql-queries/SKILL.md | plugin (Data Analyst) | Query | Strukturierte Query-Sammlung | 2026-04-17 | [operations_manager] | experimental | data.write-query | Reusable Query Lib |
| data.explore-data | Explore Data | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/explore-data/SKILL.md | plugin (Data Analyst) | Dataset | EDA-Notiz | 2026-04-17 | [operations_manager] | active | manual | Fuer Pipeline-Anomaly-Detection |
| data.statistical-analysis | Statistical Analysis | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/statistical-analysis/SKILL.md | plugin (Data Analyst) | Dataset + Hypothese | Stat-Output | 2026-04-17 | [operations_manager] | experimental | manual | Fuer Conversion-Tests |
| data.create-viz | Create Visualization | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/create-viz/SKILL.md | plugin (Data Analyst) | Dataset | Chart-HTML | 2026-04-17 | [operations_manager] | active | manual | Fuer Daily-Summary-Email |
| data.build-dashboard | Build Dashboard | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/build-dashboard/SKILL.md | plugin (Data Analyst) | Datenquellen | Dashboard-HTML | 2026-04-17 | [operations_manager] | experimental | manual | Fuer System-Health-Page |
| data.data-context-extractor | Data Context Extractor | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/data-context-extractor/SKILL.md | plugin (Data Analyst) | DB-Schema | Context-Doc | 2026-04-17 | [operations_manager] | active | manual | Fuer Onboarding neuer DB-Queries |
| data.data-visualization | Data Visualization | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/data-visualization/SKILL.md | plugin (Data Analyst) | Dataset | Chart | 2026-04-17 | [operations_manager] | active | data.create-viz | Differentiator: Best-Practice-Charts |
| data.analyze | Analyze | ~/Library/.../plugin_01YS7PZc73j8hf4aEJiRr2KQ/skills/analyze/SKILL.md | plugin (Data Analyst) | Dataset + Frage | Analyse-Bericht | 2026-04-17 | [operations_manager] | active | manual | Genereller Analyse-Skill |

## Kategorie: operations

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| operations.runbook | Runbook | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/runbook/SKILL.md | plugin (Cowork Operations) | Procedure | Runbook-Doc | 2026-04-17 | [email_sender, health_checker, claude_code_self] | active | manual | Pflicht fuer wiederholbare Prozesse (genutzt in diesem Scan!) |
| operations.process-doc | Process Doc | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/process-doc/SKILL.md | plugin (Cowork Operations) | Process | Process-Doc | 2026-04-17 | [operations_manager] | active | operations.runbook | Lighter-Weight als Runbook |
| operations.process-optimization | Process Optimization | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/process-optimization/SKILL.md | plugin (Cowork Operations) | Existing-Process | Optimierungs-Vorschlag | 2026-04-17 | [operations_manager] | active | manual | Fuer kontinuierliche Verbesserung |
| operations.compliance-tracking | Compliance Tracking | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/compliance-tracking/SKILL.md | plugin (Cowork Operations) | Regulation | Tracking-Liste | 2026-04-17 | [operations_manager] | active | legal.compliance-check | Fuer DSGVO |
| operations.risk-assessment | Risk Assessment | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/risk-assessment/SKILL.md | plugin (Cowork Operations) | Project | Risk-Matrix | 2026-04-17 | [operations_manager] | active | manual | Fuer Batch-Releases |
| operations.capacity-plan | Capacity Plan | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/capacity-plan/SKILL.md | plugin (Cowork Operations) | Workload | Capacity-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Bei Team-Wachstum |
| operations.change-request | Change Request | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/change-request/SKILL.md | plugin (Cowork Operations) | Change | CR-Doc | 2026-04-17 | [operations_manager] | experimental | manual | Bei Customer-Engagements |
| operations.status-report | Status Report | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/status-report/SKILL.md | plugin (Cowork Operations) | Period | Status-Report | 2026-04-17 | [operations_manager] | active | manual | Daily-Summary-Basis |
| operations.vendor-review | Vendor Review | ~/Library/.../plugin_01S5vijNgfCWGfVaeNbYCdNz/skills/vendor-review/SKILL.md | plugin (Cowork Operations) | Vendor | Review-Bericht | 2026-04-17 | [operations_manager] | experimental | manual | Bei neuer Tool-Auswahl |

## Kategorie: legal

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| legal.triage-nda | Triage NDA | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/triage-nda/SKILL.md | plugin (Legal Productivity) | NDA-Text | NDA-Triage-Notiz | 2026-04-17 | [outreach_strategist] | active | manual | Fuer Real Estate Pilot Workshop-NDAs |
| legal.review-contract | Review Contract | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/review-contract/SKILL.md | plugin (Legal Productivity) | Contract | Risiko-Markup | 2026-04-17 | [operations_manager] | active | manual | Fuer Workshop-Vertraege |
| legal.compliance-check | Compliance Check | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/compliance-check/SKILL.md | plugin (Legal Productivity) | Doc/Process | Compliance-Score | 2026-04-17 | [operations_manager, content_scheduler] | active | operations.compliance-tracking | Fuer DSGVO und go-digital |
| legal.brief | Legal Brief | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/brief/SKILL.md | plugin (Legal Productivity) | Issue | Brief-Doc | 2026-04-17 | [operations_manager] | experimental | manual | Bei rechtlichen Fragen |
| legal.legal-response | Legal Response | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/legal-response/SKILL.md | plugin (Legal Productivity) | Anfrage | Antwort-Draft | 2026-04-17 | [operations_manager] | experimental | manual | Fuer Mandanten-Anfragen |
| legal.legal-risk-assessment | Legal Risk Assessment | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/legal-risk-assessment/SKILL.md | plugin (Legal Productivity) | Project | Risk-Bericht | 2026-04-17 | [operations_manager] | experimental | manual | Pre-Launch-Check |
| legal.meeting-briefing | Legal Meeting Briefing | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/meeting-briefing/SKILL.md | plugin (Legal Productivity) | Meeting + Topic | Briefing | 2026-04-17 | [operations_manager] | experimental | manual | Vor Anwalts-Calls |
| legal.signature-request | Signature Request | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/signature-request/SKILL.md | plugin (Legal Productivity) | Doc + Recipients | DocuSign-Spec | 2026-04-17 | [outreach_strategist] | experimental | manual | Fuer Workshop-Bestaetigungen |
| legal.vendor-check | Legal Vendor Check | ~/Library/.../plugin_01MDPHx1gWYn4qF2NfPQJSM1/skills/vendor-check/SKILL.md | plugin (Legal Productivity) | Vendor + Contract | Vendor-Risk | 2026-04-17 | [operations_manager] | experimental | manual | Vor neuen Vendor-Vertraegen |

## Kategorie: customer-support

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| customer-support.ticket-triage | Ticket Triage | ~/Library/.../plugin_01LE8tT9qAeeXKkpJ3yvTHUM/skills/ticket-triage/SKILL.md | plugin (Customer Support) | Inbox-Reply | Triage-Label + Action | 2026-04-17 | [reply_detector] | active | keyword_matching | Pflicht fuer Reply-Detector |
| customer-support.draft-response | Draft Response | ~/Library/.../plugin_01LE8tT9qAeeXKkpJ3yvTHUM/skills/draft-response/SKILL.md | plugin (Customer Support) | Ticket | Response-Draft | 2026-04-17 | [reply_detector] | active | manual | Fuer Auto-Replies bei FAQ |
| customer-support.kb-article | KB Article | ~/Library/.../plugin_01LE8tT9qAeeXKkpJ3yvTHUM/skills/kb-article/SKILL.md | plugin (Customer Support) | Topic | KB-Artikel | 2026-04-17 | [content_scheduler] | experimental | manual | Fuer FAQ-Aufbau |
| customer-support.customer-research | Customer Research | ~/Library/.../plugin_01LE8tT9qAeeXKkpJ3yvTHUM/skills/customer-research/SKILL.md | plugin (Customer Support) | Customer-Cohort | Insights-Bericht | 2026-04-17 | [operations_manager] | active | local.customer-research | Bei N>10 Kunden sinnvoll |
| customer-support.customer-escalation | Customer Escalation | ~/Library/.../plugin_01LE8tT9qAeeXKkpJ3yvTHUM/skills/customer-escalation/SKILL.md | plugin (Customer Support) | Issue + Customer | Escalation-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Bei P1-Kundenproblem |

## Kategorie: design

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| design.design-system | Design System | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/design-system/SKILL.md | plugin (Cowork Design) | Brand | Design-Tokens | 2026-04-17 | [content_scheduler] | experimental | local.brand-guidelines | Fuer Tailwind-Theme-Generator |
| design.design-critique | Design Critique | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/design-critique/SKILL.md | plugin (Cowork Design) | Mockup | Critique-Notiz | 2026-04-17 | [content_scheduler] | active | manual | Vor Page-Launch |
| design.design-handoff | Design Handoff | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/design-handoff/SKILL.md | plugin (Cowork Design) | Mockup | Dev-Spec | 2026-04-17 | [content_scheduler] | experimental | manual | Bei eigenem Design-Output |
| design.accessibility-review | Accessibility Review | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/accessibility-review/SKILL.md | plugin (Cowork Design) | Page/Mockup | A11y-Findings | 2026-04-17 | [content_scheduler] | active | manual | Pflicht fuer Customer-facing Pages |
| design.user-research | User Research | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/user-research/SKILL.md | plugin (Cowork Design) | Question | Research-Plan | 2026-04-17 | [operations_manager] | experimental | local.customer-research | Fuer Workshop-Discovery |
| design.research-synthesis | Research Synthesis | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/research-synthesis/SKILL.md | plugin (Cowork Design) | Raw-Findings | Synthese | 2026-04-17 | [operations_manager] | active | manual | Nach Discovery-Calls |
| design.ux-copy | UX Copy | ~/Library/.../plugin_011VCCbVFqAn2m9NLT6tYcch/skills/ux-copy/SKILL.md | plugin (Cowork Design) | UI-Element | UX-Texte | 2026-04-17 | [content_scheduler] | active | local.copywriting | Fuer Form-Labels, Errors, etc. |
| local.artifacts-builder | Artifacts Builder | ~/Desktop/PraxisNovaAI/skills/artifacts-builder/SKILL.md | local | Spec | React/HTML-Artifact | 2026-04-17 | [content_scheduler] | active | manual | Fuer komplexe HTML-Artifacts (claude.ai) |

## Kategorie: hr

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| hr.recruiting-pipeline | Recruiting Pipeline | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/recruiting-pipeline/SKILL.md | plugin (Cowork HR) | Open-Roles | Pipeline-Stand | 2026-04-17 | [-] | inactive | - | Erst bei Hiring relevant |
| hr.draft-offer | Draft Offer | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/draft-offer/SKILL.md | plugin (Cowork HR) | Candidate | Offer-Letter | 2026-04-17 | [-] | inactive | - | Erst bei Hiring relevant |
| hr.interview-prep | Interview Prep | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/interview-prep/SKILL.md | plugin (Cowork HR) | Role | Interview-Plan | 2026-04-17 | [-] | inactive | - | Erst bei Hiring |
| hr.onboarding | HR Onboarding | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/onboarding/SKILL.md | plugin (Cowork HR) | Hire | Onboarding-Plan | 2026-04-17 | [-] | inactive | - | Erst bei Hiring |
| hr.org-planning | Org Planning | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/org-planning/SKILL.md | plugin (Cowork HR) | Strategy | Org-Plan | 2026-04-17 | [-] | inactive | - | Erst ab Team >5 |
| hr.comp-analysis | Comp Analysis | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/comp-analysis/SKILL.md | plugin (Cowork HR) | Role + Market | Comp-Bericht | 2026-04-17 | [-] | inactive | - | Spaeter |
| hr.people-report | People Report | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/people-report/SKILL.md | plugin (Cowork HR) | Team | Report | 2026-04-17 | [-] | inactive | - | Spaeter |
| hr.performance-review | Performance Review | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/performance-review/SKILL.md | plugin (Cowork HR) | Employee | Review-Doc | 2026-04-17 | [-] | inactive | - | Spaeter |
| hr.policy-lookup | Policy Lookup | ~/Library/.../plugin_01M1e3zn4FaacRqzf1kNsSAN/skills/policy-lookup/SKILL.md | plugin (Cowork HR) | Question | Policy-Antwort | 2026-04-17 | [-] | inactive | - | Spaeter |

## Kategorie: finance

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| finance.financial-statements | Financial Statements | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/financial-statements/SKILL.md | plugin (Cowork Finance) | Bookings | Statements | 2026-04-17 | [-] | experimental | manual | Spaeter, ab Jahresende |
| finance.variance-analysis | Variance Analysis | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/variance-analysis/SKILL.md | plugin (Cowork Finance) | Plan + Actual | Varianz-Bericht | 2026-04-17 | [-] | experimental | manual | Bei Forecast-vs-Actual |
| finance.reconciliation | Reconciliation | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/reconciliation/SKILL.md | plugin (Cowork Finance) | Books | Reconciliation | 2026-04-17 | [-] | inactive | - | Spaeter |
| finance.audit-support | Audit Support | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/audit-support/SKILL.md | plugin (Cowork Finance) | Audit-Anfrage | Antwort-Pack | 2026-04-17 | [-] | inactive | - | Spaeter |
| finance.close-management | Close Management | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/close-management/SKILL.md | plugin (Cowork Finance) | Period-End | Close-Plan | 2026-04-17 | [-] | inactive | - | Spaeter |
| finance.journal-entry | Journal Entry | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/journal-entry/SKILL.md | plugin (Cowork Finance) | Transaction | Journal-Eintrag | 2026-04-17 | [-] | inactive | - | Spaeter |
| finance.journal-entry-prep | Journal Entry Prep | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/journal-entry-prep/SKILL.md | plugin (Cowork Finance) | Source-Doc | JE-Vorbereitung | 2026-04-17 | [-] | inactive | - | Spaeter |
| finance.sox-testing | SOX Testing | ~/Library/.../plugin_015mMo6NfTokoNVaKCDw72FM/skills/sox-testing/SKILL.md | plugin (Cowork Finance) | Control | Test-Plan | 2026-04-17 | [-] | inactive | - | Erst bei US-Boersengang |

## Kategorie: product-management

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| product.write-spec | Write Spec | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/write-spec/SKILL.md | plugin (Product Management) | Feature-Idee | PRD | 2026-04-17 | [operations_manager] | active | manual | Fuer neue Agenten/Features |
| product.competitive-brief | Competitive Brief (PM) | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/competitive-brief/SKILL.md | plugin (Product Management) | Konkurrent | PM-Brief | 2026-04-17 | [operations_manager] | experimental | sales.competitive-intelligence | PM-Lens |
| product.product-brainstorming | Product Brainstorming | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/product-brainstorming/SKILL.md | plugin (Product Management) | Constraint | Idee-Liste | 2026-04-17 | [operations_manager] | experimental | manual | Fuer Workshop-Konzepte |
| product.metrics-review | Metrics Review | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/metrics-review/SKILL.md | plugin (Product Management) | Metrics | Review-Notiz | 2026-04-17 | [operations_manager] | active | manual | Wochenraster |
| product.roadmap-update | Roadmap Update | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/roadmap-update/SKILL.md | plugin (Product Management) | Backlog | Roadmap | 2026-04-17 | [operations_manager] | experimental | manual | Quarterly |
| product.sprint-planning | Sprint Planning | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/sprint-planning/SKILL.md | plugin (Product Management) | Backlog | Sprint-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Bei Multi-Person-Build |
| product.stakeholder-update | Stakeholder Update | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/stakeholder-update/SKILL.md | plugin (Product Management) | Period | Stakeholder-Update | 2026-04-17 | [operations_manager] | experimental | manual | Bei Investor-Update spaeter |
| product.synthesize-research | Synthesize Research | ~/Library/.../plugin_01NwRqPNp2fymu8ctzJhD4fx/skills/synthesize-research/SKILL.md | plugin (Product Management) | Research | Synthese | 2026-04-17 | [operations_manager] | active | design.research-synthesis | Fuer Discovery-Auswertung |

## Kategorie: search-knowledge

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| search.knowledge-synthesis | Knowledge Synthesis | ~/Library/.../plugin_01C5Vqmi896cvokigm3MZSVU/skills/knowledge-synthesis/SKILL.md | plugin (Enterprise Search) | Multi-Source | Synthese | 2026-04-17 | [operations_manager] | experimental | manual | Bei N>5 Quellen |
| search.search-strategy | Search Strategy | ~/Library/.../plugin_01C5Vqmi896cvokigm3MZSVU/skills/search-strategy/SKILL.md | plugin (Enterprise Search) | Question | Search-Plan | 2026-04-17 | [operations_manager] | experimental | manual | Fuer Discovery |
| search.digest | Digest | ~/Library/.../plugin_01C5Vqmi896cvokigm3MZSVU/skills/digest/SKILL.md | plugin (Enterprise Search) | Sources | Digest | 2026-04-17 | [operations_manager] | experimental | manual | Wochenraster Newsletter |
| search.search | Search | ~/Library/.../plugin_01C5Vqmi896cvokigm3MZSVU/skills/search/SKILL.md | plugin (Enterprise Search) | Query | Treffer-Liste | 2026-04-17 | [operations_manager] | experimental | manual | Generische Suche |
| search.source-management | Source Management | ~/Library/.../plugin_01C5Vqmi896cvokigm3MZSVU/skills/source-management/SKILL.md | plugin (Enterprise Search) | Sources | Indexierte Quellen | 2026-04-17 | [operations_manager] | experimental | manual | Fuer Repo-Indizierung |

## Kategorie: productivity

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| productivity.task-management | Task Management | ~/Library/.../plugin_01MKcJsEAmPJswuCytbMJYZJ/skills/task-management/SKILL.md | plugin (Productivity) | TODO | Strukturierte Tasks | 2026-04-17 | [operations_manager] | active | manual_md | Fuer TASKS.md Pflege |
| productivity.memory-management | Memory Management | ~/Library/.../plugin_01MKcJsEAmPJswuCytbMJYZJ/skills/memory-management/SKILL.md | plugin (Productivity) | Memory-Files | Konsolidierte Memory | 2026-04-17 | [operations_manager] | active | core.consolidate-memory | Fuer Memory-Hygiene |

## Kategorie: apollo

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| apollo.prospect | Apollo Prospect | ~/Library/.../plugin_01578WzEQ99fNAkr5AEQ2qY4/skills/prospect/SKILL.md | plugin (Apollo) | ICP-Filter | Lead-Liste | 2026-04-17 | [lead_ingestor] | active | manual_apollo_export | Pflicht-Skill fuer Lead-Sourcing |
| apollo.enrich-lead | Apollo Enrich Lead | ~/Library/.../plugin_01578WzEQ99fNAkr5AEQ2qY4/skills/enrich-lead/SKILL.md | plugin (Apollo) | Lead | Angereicherte Lead-Daten | 2026-04-17 | [lead_ingestor] | active | manual | Pflicht fuer Lead-Anreicherung |
| apollo.sequence-load | Apollo Sequence Load | ~/Library/.../plugin_01578WzEQ99fNAkr5AEQ2qY4/skills/sequence-load/SKILL.md | plugin (Apollo) | Sequence + Leads | Sequence-Status | 2026-04-17 | [outreach_strategist] | active | manual | Bei Apollo-Sequence-Sync |

## Kategorie: vercel

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| vercel.nextjs | Next.js | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/nextjs/SKILL.md | plugin (Vercel) | Feature | Next.js-Code | 2026-04-17 | [claude_code_self] | active | manual | Pflicht bei Next.js-Aenderungen |
| vercel.next-cache-components | Next Cache Components | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/next-cache-components/SKILL.md | plugin (Vercel) | Page | Cache-Strategie | 2026-04-17 | [claude_code_self] | active | manual | Fuer PPR/use cache |
| vercel.next-upgrade | Next Upgrade | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/next-upgrade/SKILL.md | plugin (Vercel) | Aktuelle Version | Migration-Plan | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Major-Upgrades |
| vercel.deployments-cicd | Deployments CI/CD | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/deployments-cicd/SKILL.md | plugin (Vercel) | Build-Issue | CI/CD-Fix | 2026-04-17 | [claude_code_self] | active | manual | Pflicht vor Production-Deploy |
| vercel.env-vars | Env Vars | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/env-vars/SKILL.md | plugin (Vercel) | Env-Setup | env-Plan | 2026-04-17 | [claude_code_self] | active | manual | Bei neuen Secrets |
| vercel.vercel-functions | Vercel Functions | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/vercel-functions/SKILL.md | plugin (Vercel) | API-Spec | Function-Code | 2026-04-17 | [claude_code_self] | active | manual | Fuer Cron-Routes |
| vercel.vercel-cli | Vercel CLI | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/vercel-cli/SKILL.md | plugin (Vercel) | Aufgabe | CLI-Snippet | 2026-04-17 | [claude_code_self] | active | manual | Operativ |
| vercel.routing-middleware | Routing Middleware | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/routing-middleware/SKILL.md | plugin (Vercel) | Routing-Bedarf | Middleware-Code | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Auth/Personalization |
| vercel.runtime-cache | Runtime Cache | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/runtime-cache/SKILL.md | plugin (Vercel) | API-Output | Cache-Spec | 2026-04-17 | [claude_code_self] | experimental | manual | Bei wiederholten API-Calls |
| vercel.shadcn | shadcn | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/shadcn/SKILL.md | plugin (Vercel) | UI-Bedarf | Komponenten-Code | 2026-04-17 | [claude_code_self] | active | manual | Fuer Dashboard-Komponenten |
| vercel.turbopack | Turbopack | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/turbopack/SKILL.md | plugin (Vercel) | Build-Issue | Turbopack-Config | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Bundler-Problemen |
| vercel.ai-sdk | AI SDK | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/ai-sdk/SKILL.md | plugin (Vercel) | LLM-Spec | AI-SDK-Code | 2026-04-17 | [claude_code_self] | active | manual | Fuer Streaming/Provider-Routing |
| vercel.ai-gateway | AI Gateway | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/ai-gateway/SKILL.md | plugin (Vercel) | Multi-Provider | Gateway-Config | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Provider-Failover |
| vercel.workflow | Vercel Workflow (WDK) | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/workflow/SKILL.md | plugin (Vercel) | Long-Running-Task | Workflow-Code | 2026-04-17 | [claude_code_self] | experimental | manual | Fuer durable Workflows |
| vercel.vercel-sandbox | Vercel Sandbox | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/vercel-sandbox/SKILL.md | plugin (Vercel) | Untrusted-Code | Sandbox-Setup | 2026-04-17 | [claude_code_self] | experimental | manual | Fuer User-Generated Code |
| vercel.vercel-storage | Vercel Storage | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/vercel-storage/SKILL.md | plugin (Vercel) | Storage-Bedarf | Storage-Config | 2026-04-17 | [claude_code_self] | experimental | manual | Blob/Edge Config |
| vercel.auth | Vercel Auth | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/auth/SKILL.md | plugin (Vercel) | Auth-Bedarf | Auth-Config | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Clerk/Auth0-Integration |
| vercel.bootstrap | Vercel Bootstrap | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/bootstrap/SKILL.md | plugin (Vercel) | Repo | Bootstrap-Plan | 2026-04-17 | [claude_code_self] | active | manual | Bei neuem Repo-Setup |
| vercel.marketplace | Vercel Marketplace | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/marketplace/SKILL.md | plugin (Vercel) | Service-Bedarf | Marketplace-Plan | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Add-on-Auswahl |
| vercel.knowledge-update | Vercel Knowledge Update | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/knowledge-update/SKILL.md | plugin (Vercel) | (auto) | Korrigiertes Wissen | 2026-04-17 | [claude_code_self] | active | - | Wird in jeder Session geladen |
| vercel.verification | Vercel Verification | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/verification/SKILL.md | plugin (Vercel) | Feature | E2E-Verifikation | 2026-04-17 | [claude_code_self] | active | manual | Fuer "Why isn't this working?" |
| vercel.chat-sdk | Chat SDK | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/chat-sdk/SKILL.md | plugin (Vercel) | Multi-Platform | Chat-Code | 2026-04-17 | [claude_code_self] | experimental | manual | Fuer Slack/Telegram-Bots |
| vercel.next-forge | Next Forge | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/next-forge/SKILL.md | plugin (Vercel) | Monorepo | next-forge-Setup | 2026-04-17 | [claude_code_self] | experimental | manual | Bei Turborepo-Migration |
| vercel.react-best-practices | React Best Practices | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/react-best-practices/SKILL.md | plugin (Vercel) | TSX-Diff | Review-Findings | 2026-04-17 | [claude_code_self] | active | engineering.code-review | Auto nach TSX-Edits |
| vercel.vercel-agent | Vercel Agent | ~/.claude/plugins/cache/.../vercel/0.40.0/skills/vercel-agent/SKILL.md | plugin (Vercel) | PR | Agent-Setup | 2026-04-17 | [claude_code_self] | experimental | manual | Fuer Auto-PR-Review |

## Kategorie: bio-research

(8 Skills, fuer PraxisNova nicht relevant - inactive markiert; vollstaendig in Raw-Scan dokumentiert)

| id | status | notes |
|---|---|---|
| bio.* | inactive | Nicht relevant fuer PraxisNova-Use-Case |

## Kategorie: cowork-core (Document Skills)

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| core.docx | DOCX | ~/Library/.../skills-plugin/.../skills/docx/SKILL.md | core (Cowork) | Doc-Spec | .docx Datei | 2026-04-17 | [content_scheduler] | active | manual | Fuer Workshop-Angebote |
| core.pptx | PPTX | ~/Library/.../skills-plugin/.../skills/pptx/SKILL.md | core (Cowork) | Slide-Spec | .pptx Datei | 2026-04-17 | [content_scheduler] | active | manual | Fuer Workshop-Slides |
| core.xlsx | XLSX | ~/Library/.../skills-plugin/.../skills/xlsx/SKILL.md | core (Cowork) | Daten | .xlsx Datei | 2026-04-17 | [operations_manager] | active | manual | Fuer KPI-Reports |
| core.pdf | PDF | ~/Library/.../skills-plugin/.../skills/pdf/SKILL.md | core (Cowork) | Doc-Spec | .pdf Datei | 2026-04-17 | [content_scheduler] | active | manual | Fuer Foerdermittel-One-Pager |
| core.canvas-design | Canvas Design | ~/Library/.../skills-plugin/.../skills/canvas-design/SKILL.md | core (Cowork) | Design-Spec | Canvas-Output | 2026-04-17 | [content_scheduler] | experimental | manual | Fuer Carousel-Slides |
| core.algorithmic-art | Algorithmic Art | ~/Library/.../skills-plugin/.../skills/algorithmic-art/SKILL.md | core (Cowork) | Spec | SVG-Art | 2026-04-17 | [-] | experimental | manual | Niedrige Prio fuer PraxisNova |
| core.brand-guidelines | Brand Guidelines (Core) | ~/Library/.../skills-plugin/.../skills/brand-guidelines/SKILL.md | core (Cowork) | Brand | Guidelines | 2026-04-17 | [-] | experimental | local.brand-guidelines | Lokale Variante hat PraxisNova-Spezifika |
| core.consolidate-memory | Consolidate Memory | ~/Library/.../skills-plugin/.../skills/consolidate-memory/SKILL.md | core (Cowork) | Memory-Files | Konsolidiert | 2026-04-17 | [operations_manager] | active | manual | Wochenraster |
| core.doc-coauthoring | Doc Co-Authoring | ~/Library/.../skills-plugin/.../skills/doc-coauthoring/SKILL.md | core (Cowork) | Outline | Vollform-Doc | 2026-04-17 | [content_scheduler] | active | manual | Fuer Playbook-Erstellung |
| core.internal-comms | Internal Comms | ~/Library/.../skills-plugin/.../skills/internal-comms/SKILL.md | core (Cowork) | Topic | Internal-Comm-Doc | 2026-04-17 | [operations_manager] | experimental | manual | Bei Team-Updates |
| core.mcp-builder | MCP Builder | ~/Library/.../skills-plugin/.../skills/mcp-builder/SKILL.md | core (Cowork) | MCP-Bedarf | MCP-Server | 2026-04-17 | [claude_code_self] | experimental | manual | Bei MCP-Tool-Bau |
| core.schedule | Schedule | ~/Library/.../skills-plugin/.../skills/schedule/SKILL.md | core (Cowork) | Task | Cron/Scheduled | 2026-04-17 | [operations_manager] | active | manual | Wird mit /schedule getriggert |
| core.skill-creator | Skill Creator | ~/Library/.../skills-plugin/.../skills/skill-creator/SKILL.md | core (Cowork) | Capability | SKILL.md | 2026-04-17 | [claude_code_self] | active | manual | Fuer Tier-1-Skill-Bau (Foerdermittel-Calc, etc.) |
| core.web-artifacts-builder | Web Artifacts Builder | ~/Library/.../skills-plugin/.../skills/web-artifacts-builder/SKILL.md | core (Cowork) | Spec | Web-Artifact | 2026-04-17 | [content_scheduler] | active | local.artifacts-builder | Fuer Standalone-HTML-Tools |
| core.setup-cowork | Setup Cowork | ~/Library/.../skills-plugin/.../skills/setup-cowork/SKILL.md | core (Cowork) | (init) | Setup-Doc | 2026-04-17 | [-] | inactive | - | Erstes Setup, danach nicht mehr noetig |

## Kategorie: cursor-tooling

| id | name | path | source | input_type | output_type | last_checked | used_by_agents | status | fallback_skill | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| cursor.create-skill | Create Skill (Cursor) | ~/.cursor/skills-cursor/create-skill/SKILL.md | external-cursor | Capability | SKILL.md | 2026-04-17 | [claude_code_self] | experimental | core.skill-creator | Cursor-spezifisch, weniger relevant |
| cursor.canvas | Cursor Canvas | ~/.cursor/skills-cursor/canvas/SKILL.md | external-cursor | (Cursor-context) | Canvas | 2026-04-17 | [-] | inactive | - | Nur in Cursor IDE |
| cursor.shell | Cursor Shell | ~/.cursor/skills-cursor/shell/SKILL.md | external-cursor | Command | Output | 2026-04-17 | [-] | inactive | - | - |
| cursor.create-rule | Create Rule | ~/.cursor/skills-cursor/create-rule/SKILL.md | external-cursor | Pattern | Cursor-Rule | 2026-04-17 | [-] | inactive | - | - |
| cursor.create-subagent | Create Subagent | ~/.cursor/skills-cursor/create-subagent/SKILL.md | external-cursor | Spec | Subagent | 2026-04-17 | [-] | inactive | - | - |
| cursor.cursor-blame | Cursor Blame | ~/.cursor/skills-cursor/cursor-blame/SKILL.md | external-cursor | Code | Blame-Info | 2026-04-17 | [-] | inactive | - | - |
| cursor.migrate-to-skills | Migrate To Skills | ~/.cursor/skills-cursor/migrate-to-skills/SKILL.md | external-cursor | Existing | Migration | 2026-04-17 | [-] | inactive | - | - |
| cursor.update-cursor-settings | Update Cursor Settings | ~/.cursor/skills-cursor/update-cursor-settings/SKILL.md | external-cursor | Settings | Settings-Patch | 2026-04-17 | [-] | inactive | - | - |

## Kategorie: praxisnova-scheduled (one-shot tasks)

| id | name | path | source | last_checked | status | notes |
|---|---|---|---|---|---|---|
| sched.daily-build-planner | Daily Build Planner | ~/Documents/Claude/Scheduled/daily-build-planner/SKILL.md | praxisnova-owned | 2026-04-17 | active | Taeglicher Plan-Updater |
| sched.daily-session-documenter | Daily Session Documenter | ~/Documents/Claude/Scheduled/daily-session-documenter/SKILL.md | praxisnova-owned | 2026-04-17 | active | Doku-Generator nach Sessions |
| sched.weekly-friday-retrospective | Weekly Friday Retrospective | ~/Documents/Claude/Scheduled/weekly-friday-retrospective/SKILL.md | praxisnova-owned | 2026-04-17 | active | Wochen-Retro automatisch |
| sched.monday-cron-check | Monday Cron Check | ~/Documents/Claude/Scheduled/monday-cron-check/SKILL.md | praxisnova-owned | 2026-04-17 | active | Cron-Health Montag |
| sched.api-key-upgrade-reminder | API Key Upgrade Reminder | ~/Documents/Claude/Scheduled/api-key-upgrade-reminder/SKILL.md | praxisnova-owned | 2026-04-17 | active | Auto-Reminder fuer API-Keys |
| sched.fix1-brevo-retry-assessment | Brevo Retry Assessment | ~/Documents/Claude/Scheduled/fix1-brevo-retry-assessment/SKILL.md | praxisnova-owned | 2026-04-17 | experimental | One-Shot Brevo-Diagnose |
| sched.praxisnova-apollo-pipeline-refresh | Apollo Pipeline Refresh | ~/Documents/Claude/Scheduled/praxisnova-apollo-pipeline-refresh/SKILL.md | praxisnova-owned | 2026-04-17 | active | Apollo-Refresh-Routine |
| sched.praxisnova-inbound-response-agent | Inbound Response Agent | ~/Documents/Claude/Scheduled/praxisnova-inbound-response-agent/SKILL.md | praxisnova-owned | 2026-04-17 | active | Inbound-Routing |
| sched.praxisnova-lead-enrollment | Lead Enrollment | ~/Documents/Claude/Scheduled/praxisnova-lead-enrollment/SKILL.md | praxisnova-owned | 2026-04-17 | active | Onboard neue Leads |
| sched.praxisnova-market-intelligence | Market Intelligence | ~/Documents/Claude/Scheduled/praxisnova-market-intelligence/SKILL.md | praxisnova-owned | 2026-04-17 | active | Market-Watch |
| sched.week2-kickoff-2026-04-20 | Week 2 Kickoff | ~/Documents/Claude/Scheduled/week2-kickoff-2026-04-20/SKILL.md | praxisnova-owned | 2026-04-17 | active | One-shot fuer 20.04. |
| sched.phase2-kickoff-2026-05-04 | Phase 2 Kickoff | ~/Documents/Claude/Scheduled/phase2-kickoff-2026-05-04/SKILL.md | praxisnova-owned | 2026-04-17 | active | One-shot fuer 04.05. |
| sched.phase3-kickoff-2026-06-01 | Phase 3 Kickoff | ~/Documents/Claude/Scheduled/phase3-kickoff-2026-06-01/SKILL.md | praxisnova-owned | 2026-04-17 | active | One-shot fuer 01.06. |

---

## External References

### agency-agents (msitarzewski)

**Pfad:** `~/praxisnovaai-external/agency-agents/`
**Status:** Cloned 2026-04-17, MIT-Lizenz
**Inhalt:** ca. 80+ role-basierte Agent-Files in 20 Kategorien

**5 Uebernahme-Muster fuer PraxisNova-Architektur:**

| Pattern-ID | Pattern | Quelle | Uebernahme |
|---|---|---|---|
| ext.AAR-1 | Agent-Declaration als YAML-Frontmatter (name, description, color, emoji, vibe, services) plus Markdown-Body | jeder agent.md im Repo | Wir uebernehmen das Schema in unserer `agent.yaml`, ergaenzen `primary_skills`, `optional_skills`, `fallback_mode`, `trigger`, `data_sources`, `outputs` |
| ext.AAR-2 | Persona-vs-Operations-Trennung im Agent-Body (Identity/Memory/Personality vs Mission/Deliverables/Workflow/Metrics) | CONTRIBUTING.md "Agent Structure" | Wir spiegeln das in unseren 8 Agent-Specs (Sektion fuer "Wer ist dieser Agent" vs "Was tut er konkret") |
| ext.AAR-3 | Multi-Agent-Workflow mit explizitem Hand-off (sequenziell, mit Reality-Checker als Gate) | examples/workflow-startup-mvp.md | Wir nutzen das in unserem Outreach-Pipeline-Flow: Lead-Ingestor → Outreach-Strategist → Email-Sender → Reply-Detector mit Health-Checker als Gate |
| ext.AAR-4 | Convert-Script fuer portable Agent-Format (claude-code, cursor, copilot, gemini, etc.) | scripts/convert.sh | Niedrige Prio: nur wenn wir spaeter Cursor/Copilot-Output brauchen, dann Skill-zu-Agent-Adapter bauen |
| ext.AAR-5 | Reality-Checker Agent als Quality-Gate vor Milestone-Closures | examples/workflow-startup-mvp.md "Reality Check at midpoint" | Mapped auf unseren Health-Checker-Agent. Wir erweitern ihn um "Pre-Send-Review" fuer Customer-facing Emails (passt zu OPTION-C Sektion 6.4 Approval-Gates) |

**Was wir explizit NICHT uebernehmen:**
- Multi-Agent-Debatten (Reviewer-vs-Implementer-Diskurse): zu viel Overhead fuer unseren Case
- Eigene Runtime: wir bleiben bei Next.js + Vercel Cron
- Personality-driven Communication-Style fuer Customer-facing Output: wir nutzen brand-voice-enforcement statt Agent-Personality

---

## Verwendung des Manifests

**Lookup im Code:**
```ts
// lib/skill-router.ts
import { manifest } from "./skills-manifest";

export function findSkillsForTask(task_type: string, context: object): SkillCandidate[] {
  return manifest.skills
    .filter(s => s.status === "active")
    .filter(s => matchCategory(s.category, task_type))
    .sort(byPriority(context))
    .slice(0, 3);
}
```

**Update-Prozess:**
1. Operations-Manager-Agent triggert Skill-Scan jeden Freitag (siehe SKILL-ARCHITECTURE Sektion 7.1)
2. Neue Skills mit `status=experimental` markiert
3. Entfernte Skills auf `status=deprecated` (nicht loeschen)
4. Skills mit Success-Rate <70% auf `status=broken`

**Wo dieses Manifest gepflegt wird:** `Agent build/SKILLS-MANIFEST.md` im Repo `praxisnova-sales-control`. Dieses File ist Single Source of Truth.

---

**Status:** Initial-Manifest 2026-04-17. Naechste Aktualisierung erwartet 2026-04-24 (woechentlich Freitag).
