---
name: brand-guidelines
description: Applies PraxisAcademy AI and PraxisNova AI official brand colors and typography to any artifact, document, presentation, or design. Use whenever brand colors, style guidelines, visual formatting, or company design standards apply.
---

# PraxisAcademy AI & PraxisNova AI Brand Styling

## Overview

Use this skill to apply the official PraxisAcademy AI / PraxisNova AI brand identity to any output — presentations, documents, websites, flyers, emails, and artifacts.

**Keywords**: branding, corporate identity, visual identity, styling, brand colors, typography, PraxisAcademy, PraxisNova, visual formatting, visual design

## Brand Guidelines

### Colors

**Main Colors:**

- Cream (Primary Background): `#f7f4ef` - Light backgrounds, page backgrounds
- Ink (Primary Text): `#0f0e0c` - Body text, headings, dark elements
- Terracotta (Accent): `#c8522a` - CTAs, highlights, buttons, accent elements

**Usage Rules:**

- Cream (`#f7f4ef`) is the dominant background — warm, approachable, professional
- Ink (`#0f0e0c`) for all body text and headings
- Terracotta (`#c8522a`) sparingly for CTAs, important links, and accent elements
- Never use harsh white (#ffffff) as a background — always cream
- Avoid tech-heavy colors (bright blue, neon green) — the brand is warm and human

### Typography

- **Headlines**: Playfair Display (Serif) — elegant, professional, trustworthy
- **Body Text**: DM Sans — clean, modern, highly readable
- **Fallbacks**: Georgia (headlines), Arial/Helvetica (body)
- **Note**: Both fonts are available on Google Fonts

### Tone of Voice

- Professional but warm
- No tech jargon — plain language that non-technical people understand
- Confident but not aggressive
- Bilingual: German (primary) and English
- USP messaging: "Kein Technik-Jargon. Sie bringen Ihre Aufgaben mit — wir zeigen live, wie KI sie lost."

### Brand Hierarchy

| Element | PraxisNova AI | PraxisAcademy AI |
|---------|--------------|-----------------|
| Focus | Automation & Implementation | Training, Workshops & Coaching |
| Audience | Direct clients (Real estate, Trades, Construction) | Partner clients (all non-tech industries) |
| Tone | Solutions-oriented | Educational, empowering |

## Features

### Smart Font Application

- Applies Playfair Display to headings (24pt and larger)
- Applies DM Sans to body text
- Automatically falls back to Georgia/Arial if custom fonts unavailable
- Preserves readability across all systems

### Text Styling

- Headings: Playfair Display, Ink color
- Body text: DM Sans, Ink color
- Smart color selection based on background
- Preserves text hierarchy and formatting

### Accent Colors

- CTAs and buttons: Terracotta (`#c8522a`)
- Backgrounds: Cream (`#f7f4ef`)
- Subtle dividers and borders: Light warm gray
- Maintains professional warmth while staying on-brand

## Technical Details

### Font Management

- Uses Google Fonts: Playfair Display and DM Sans
- Provides automatic fallback to Georgia (headings) and Arial (body)
- No font installation required for web — use Google Fonts CDN
- For presentations: pre-install both fonts in your environment

### Color Application

- Uses RGB/HEX color values for precise brand matching
- Cream background: rgb(247, 244, 239) / #f7f4ef
- Ink text: rgb(15, 14, 12) / #0f0e0c
- Terracotta accent: rgb(200, 82, 42) / #c8522a

### Web Implementation

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap');

:root {
  --color-cream: #f7f4ef;
  --color-ink: #0f0e0c;
  --color-terracotta: #c8522a;
  --font-heading: 'Playfair Display', Georgia, serif;
  --font-body: 'DM Sans', Arial, sans-serif;
}
```
