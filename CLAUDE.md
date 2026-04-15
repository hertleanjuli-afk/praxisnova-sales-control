# PraxisNova Sales Control Dashboard

## Project Overview
Sales and lead management dashboard for PraxisNova. Tracks leads throughout the sales funnel, manages email sequences, and ensures DSGVO (German GDPR) compliance for subscriber management and unsubscribe handling.

## Tech Stack
- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Core Features**: Lead tracking, email sequence automation, DSGVO compliance

## Key Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm start        # Run production build
npm run lint     # Run ESLint
```

## Skills
**Before starting ANY work, check `.claude/skills/` for auto-selected skills:**

**IMPORTANT: Before starting ANY task, scan .claude/skills/ and auto-select the most relevant skills. Always start with product-marketing-context to establish company context, then layer on task-specific skills.**

- `product-marketing-context` — establishes company/product context for all other skills
- `revops` — lead scoring, pipeline management, routing
- `sales-enablement` — pitch decks, objection handling, demo scripts
- `cold-email` — personalized outreach frameworks
- `pricing-strategy` — pricing models and optimization
- `email-sequence` — lifecycle, nurture, onboarding sequences
- `copywriting` — conversion-focused copy
- `copy-editing` — polish and refine content
- `social-content` — LinkedIn posts, carousels, engagement
- `content-strategy` — content planning and calendars
- `marketing-ideas` — brainstorm marketing campaigns
- `marketing-psychology` — persuasion and behavioral triggers
- `ad-creative` — ad copy and creative concepts
- `paid-ads` — paid advertising campaigns
- `launch-strategy` — product launches, PR, media outreach
- `seo-audit` — technical SEO analysis
- `ai-seo` — AI-optimized SEO strategies
- `programmatic-seo` — templated pages at scale
- `site-architecture` — information architecture
- `schema-markup` — structured data for search
- `page-cro` — landing page conversion optimization
- `signup-flow-cro` — registration flow optimization
- `form-cro` — form conversion optimization
- `onboarding-cro` — onboarding flow optimization
- `popup-cro` — popup conversion optimization
- `paywall-upgrade-cro` — upgrade flow optimization
- `customer-research` — customer interviews and insights
- `competitor-alternatives` — competitive analysis
- `ab-test-setup` — A/B testing frameworks
- `analytics-tracking` — measurement and tracking
- `lead-magnets` — lead generation assets
- `free-tool-strategy` — free tools for acquisition
- `referral-program` — referral system design
- `churn-prevention` — retention strategies
- `lead-research-assistant` — lead identification
- `artifacts-builder` — complex UI artifacts
- `brand-guidelines` — PraxisNova/PraxisAcademy brand colors and typography
- `competitive-ads-extractor` — competitor ad analysis
- `content-research-writer` — research-backed content

**To use a skill**: `Skill: lead-research-assistant` or `Skill: artifacts-builder`

## Key Features
- Lead intake and qualification
- Email sequence management and automation
- Unsubscribe handling (DSGVO-compliant)
- Sales pipeline visualization
- Lead status tracking
- Integration with Brevo for email delivery
- HubSpot CRM sync

## Important: DSGVO Compliance
- All unsubscribe requests must be logged and honored immediately
- Double opt-in required for email subscriptions
- No unsolicited marketing emails
- User data deletion on request
- Privacy policy and consent terms visible

## Directory Structure
- `/src` - Next.js components and pages
- `/.claude/skills/` - Available skills for this project

## Development Notes
- Brevo API for email automation
- HubSpot lead sync
- Database: Neon PostgreSQL (credentials in Vercel environment variables, not .env.local)
- State management for lead pipeline
- Real-time updates for sales team

---

## 🤖 Agent System (Multi-Agent Sales Team)

### Agent API
All agents communicate via: `https://praxisnova-sales-control.vercel.app/api/agent`
Auth header: `x-agent-secret: [CRON_SECRET from Vercel env vars]`

### Agent Files
All 7 agent prompts live in `.agents/`:
- `prospect-researcher.md` — Qualifies leads Mon/Wed/Fri at 08:00
- `partner-researcher.md` — Qualifies partners Tue/Thu at 08:00
- `operations-manager.md` — Morning briefing email daily at 08:00
- `sales-supervisor.md` — Reviews prospect decisions daily at 10:00
- `partner-supervisor.md` — Reviews partner decisions daily at 10:00
- `outreach-strategist.md` — Sends personalized outreach Mon-Fri at 12:00
- `partner-outreach-strategist.md` — Sends partner proposals Mon-Fri at 12:00

### Email Routing (CRITICAL — never change this)
- Immobilien automation: `info@praxisnovaai.com`
- Handwerk/Bau automation: `meyer.samantha@praxisnovaai.com`
- All agent-personalized outreach: `hertle.anjuli@praxisnovaai.com`
- Partner outreach: `hertle.anjuli@praxisnovaai.com`

### LinkedIn
Agents do NOT send LinkedIn messages directly. They write to `linkedin_queue` table.
Angie reviews and sends manually.

### Trigger Slot Strategy (Multiple Daily Slots)
```
MORNING (07:00-08:30):
- Partner Researcher (07:00)
- Operations Manager (07:15)
- Prospect Researcher (06:00, 09:45, 13:45)

MIDDAY (09:00-17:00):
- Outreach Strategist (08:00, 11:00, 13:00, 15:00, 17:00)
- Sales Supervisor (09:15, 14:30)
- Partner Outreach Strategist (12:30 - weekdays only)
- Follow-Up Tracker (09:00)

INBOUND (HIGH FREQUENCY):
- Inbound Response Agent (*/15 06:00-22:00 - every 15 min, Mon-Fri)

PROCESS JOBS:
- Process Sequences (07:30, 10:30, 13:30, 16:30)

MONITORING:
- Health Monitor (07:05, 11:50, 15:20)
- Error Sentinel (06:15, 09:30, 12:00, 15:15, 18:00)
- LinkedIn Response Check (08:10)
- LinkedIn Posting Check (15:30)
- Daily Summary (11:45, 17:45)
- Weekly Report (Monday 06:45)
```

### Custom Commands (type these in Claude Code terminal)
- `/setup-agents` — create/update all 3 scheduled trigger sessions
- `/agent-status` — check which agents are running and last activity
- `/merge-triggers` — consolidate all agents into 3 trigger slots

### Pipeline Stages
Neu → In Outreach → Nurture | Nicht qualifiziert | Cooldown → Wieder aufnehmen (passive)
- 'Wieder aufnehmen' leads are PROTECTED — only touched by future Re-Engagement Agent
- Never contact 'Wieder aufnehmen' leads unless positive signal exists

### KPI Goals
- Customer meetings: 10/week (tracked via pipeline stage proxies)
- Partner meetings: 10/month (tracked via partner outreach count)
- Agents change approach (A/B/C) if KPIs not met — never just add volume

---

## Boris-Regeln (Anthropic Daily Workflow)

### 1. Plan Mode Default
- Plan Mode fuer ALLE non-trivial Tasks (3+ Schritte oder Architektur)
- Plan Mode fuer Verification, nicht nur Bauen
- Plan Mode fuer Refactoring

### 2. Subagent Strategy
- Subagents liberal nutzen fuer Context-Hygiene
- Research, Exploration, Parallel-Analyse an Subagents
- Ein Task pro Subagent

### 3. Self-Improvement Loop
- Schreibe Regeln die du nutzt: update `tasks/lessons.md`
- Regeln gegen gleiche Fehler
- Lessons iterieren bis Fehlerrate sinkt

### 4. Verification Before Done
- Nie als erledigt markieren ohne Beweis
- Behavior zwischen main und Aenderung diffen
- Frage: Wuerde ein Staff Engineer das genehmigen?
- Tests + Logs + Korrektheit demonstrieren

### 5. Demand Elegance (Balanced)
- Non-trivial: pausiere, frage "gibt es einen eleganteren Weg?"
- Simple obvious fixes: skip, nicht ueber-engineeren

### 6. Autonomous Bug Fixing
- Bug-Report: einfach fixen, kein Hand-Holding
- Auf Logs/Errors/failing Tests zeigen, dann loesen

## Skill-Search Before Build (PFLICHT)
Vor JEDEM Bau:
1. `ls ~/.agents/skills/`
2. `ls ~/Desktop/PraxisNovaAI/skills/`
3. Relevante SKILL.md lesen
4. Nutzung im Session-Doc dokumentieren

## Model-Selection
- Opus: Architektur, Multi-File-Refactor, Debugging, neuer Agent, Security
- Sonnet: Edits, Fixes, Doku, Tests

## Writing Style fuer neuen Code und Docs
- KEIN em-dash oder en-dash. Komma, Punkt, Hyphen (-).
- KEIN DACH. Stattdessen "europaweit" oder "Europa".
- Deutsch intern, Englisch wenn explizit angefragt.
- Bestehender Code mit em-dash wird NICHT nachtraeglich angepasst.

## No-Go Regeln fuer Autonomous-Build
- KEIN `vercel --prod` ohne Angie.
- KEIN Merge zu main ohne Angie.
- KEINE DB-Migration auf Neon ausfuehren, nur SQL-File schreiben.
- KEINE Live-Emails (nur Drafts).
- Die 9 bestehenden Sales-Agent-Routes (app/api/cron/daily-summary, morning-agents, operations-manager, partner-supervisor, partner-outreach-strategist, partner-researcher, outreach-strategist, inbound-response, market-intelligence, monthly-report) NICHT anfassen.

## Referenzen
- Autonome Sessions: `~/Desktop/PraxisNovaAI/Agent build/prompts/MEGA-PROMPT-STANDALONE-2026-04-15.md`
- Task-Liste: `~/Desktop/PraxisNovaAI/Agent build/TASKS.md`
- Master-Plan-Kurzform: `~/Desktop/PraxisNovaAI/Agent build/docs/MASTER-PLAN-REFERENCE.md`
- Batch-Reports: `~/Desktop/PraxisNovaAI/Agent build/reports/`
