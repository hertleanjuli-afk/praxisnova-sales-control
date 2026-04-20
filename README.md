# PraxisNova Sales Control

Internes Sales-Dashboard fuer Lead-Tracking, E-Mail-Sequenzen und Abonnement-Management mit Double-Opt-In und Unsubscribe-Handling.

## Features

- **Lead-Management**: Suche, Enrollment, Scoring, Sequenz-Tracking
- **E-Mail-Sequenzen**: 5 branchenspezifische Sequenzen (Immobilien, Handwerk, Bau, Allgemein, Inbound)
- **Website-Klick-Tracking**: Besucher, Buttons, Scroll-Tiefe, UTM-Parameter
- **Analytics-Dashboard**: Recharts-Grafiken, KPIs, Conversion-Funnel
- **Wochenberichte**: Automatische Performance-Reports mit Trend-Vergleich
- **LinkedIn-Integration**: Export, Verbindungs-Tracking, Branchen-Aufschlüsselung
- **DSGVO-Compliance**: HMAC-signierte Abmeldelinks, permanente Sperrliste
- **Email-Tracking**: Wer hat geöffnet, geklickt, beantwortet — mit Lead-Details
- **7 Cron Jobs**: Sequenz-Verarbeitung, tägliche Zusammenfassung, Wochen/Monats/Quartalsberichte
- **Dark Theme**: Durchgehend #0A0A0A/#111/#E8472A auf allen Seiten

## Tech Stack

- Next.js 14 (App Router)
- TypeScript / Tailwind CSS
- Neon PostgreSQL (@neondatabase/serverless)
- NextAuth v4 (Credentials)
- Recharts (Diagramme)
- Brevo (E-Mail-Versand)
- HubSpot (CRM-Sync)

## Setup

```bash
npm install
cp .env.example .env.local   # Werte ausfüllen
npm run dev                   # http://localhost:3000
```

## Cron Jobs (vercel.json)

| Job | Schedule | Beschreibung |
|-----|----------|-------------|
| process-sequences | Täglich 08:00 UTC | E-Mail-Sequenzen verarbeiten |
| sequence-check | Alle 6 Stunden | Status-Prüfung und Korrekturen |
| daily-summary | Täglich 17:00 UTC | Tägliche KPI-Zusammenfassung |
| weekly-report | Montag 08:00 UTC | Wöchentlicher Performance-Report |
| weekly-linkedin | Montag 09:00 UTC | LinkedIn-Export neue Leads |
| monthly-report | 1. des Monats 08:00 | Monatlicher Rollup |
| quarterly-report | 1. des Quartals 08:00 | Quartals-Rollup |

## API-Endpunkte

| Endpoint | Auth | Beschreibung |
|----------|------|-------------|
| `/api/health` | Keine | DB-Verbindungsstatus und Latenz |
| `/api/track-click` | CORS | Website-Klick-Tracking (öffentlich) |
| `/api/webhooks/website-clicks` | Secret | Website → Sales Control Webhook |
| `/api/webhooks/brevo` | HMAC | Brevo E-Mail-Events |
| `/api/webhooks/inbound` | Secret | Inbound-Lead Webhook |
| `/api/dashboard` | Session | Konsolidierte Dashboard-Daten (KPIs, Hot Leads, Funnel) |
| `/api/analytics` | Session | Dashboard-KPIs |
| `/api/analytics/performance` | Session | Recharts-Daten |
| `/api/email-tracking` | Session | Email-Events mit Lead-Daten |
| `/api/reports` | Session | Wochen/Monatsberichte |

## Dashboard-Seiten

| Seite | Pfad | Beschreibung |
|-------|------|-------------|
| Dashboard | `/` | KPIs mit Trends, Hot Leads, Conversion-Funnel, Activity Feed |
| Lead-Suche | `/leads` | Apollo-Suche, Bulk-Enrollment, Branche/Bundesland Filter |
| Eingehende Leads | `/inbound` | Neue Anfragen, Status-Tracking, KPI Cards |
| Sequenzen | `/sequences` | Sector-Cards, Lead-Tabelle, Detail-Modal |
| Email-Tracking | `/email-tracking` | Geöffnet/Geklickt/Beantwortet mit Lead-Details |
| Website-Klicks | `/website-clicks` | Live-Feed + Analyse (Charts, UTM, Heatmap) |
| Analytics | `/analytics` | Recharts-Grafiken, Funnel, Heatmap |
| Berichte | `/reports` | Wochen/Monatsberichte mit Sparklines |
| LinkedIn | `/linkedin` | LinkedIn-Verbindungen |
| Einstellungen | `/settings` | DB-Status, Health-Check, Feature-Flags |
