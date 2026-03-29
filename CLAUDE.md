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
- Database: check `.env.local` for connection details
- State management for lead pipeline
- Real-time updates for sales team
