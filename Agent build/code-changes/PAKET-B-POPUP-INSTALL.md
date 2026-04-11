# Paket B Teil 3: Email-Popup Installation

**Stand:** 2026-04-12
**Gilt fuer:** praxisnovaai.com (praxisnova-website Repo)

## Was macht das Popup?

Das Popup erscheint auf praxisnovaai.com sobald einer dieser Trigger feuert:

1. **Exit-Intent**: der Besucher bewegt die Maus ueber die Viewport-Oberkante
2. **Timer**: 30 Sekunden nach Pageload

Whichever kommt zuerst. Nach Submit oder Close wird im Browser ein LocalStorage-Flag `pn_popup_dismissed=true` gesetzt, das Popup kommt dann nicht wieder.

Das Popup fragt ab:
- Email (Pflichtfeld)
- Firma (optional)
- Branche (Dropdown: Bau, Handwerk, Immobilien), wird aus dem URL-Pfad vorausgefuellt

Nach Submit:
- Der Lead landet im Sales-Tool (Pipeline-Stage "Neu", Source "website_popup")
- Angie bekommt sofort eine Brevo-Mail mit Lead-Details und Link zum Sales-Tool
- Der Besucher sieht "Vielen Dank! Wir melden uns innerhalb von 2 Stunden."

## Installation (praxisnova-website Repo)

Einfuegen im `<head>` oder kurz vor `</body>` **jeder Seite die Popup anzeigen soll**:

```html
<script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
```

### Next.js App-Router (app/layout.tsx)

```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {children}
        <Script
          src="https://praxisnova-sales-control.vercel.app/popup.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

### Next.js Pages-Router (pages/_app.tsx)

```tsx
import Script from 'next/script';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        src="https://praxisnova-sales-control.vercel.app/popup.js"
        strategy="afterInteractive"
      />
    </>
  );
}
```

### Plain HTML

```html
<!DOCTYPE html>
<html lang="de">
  <head>...</head>
  <body>
    ...Content...
    <script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
  </body>
</html>
```

## Wichtig: Zusammen mit tracking.js verwenden

Das Popup ist ein eigenstaendiger Script und unabhaengig von `tracking.js`. Beide koennen (und sollten) parallel eingebunden werden:

```html
<script async src="https://praxisnova-sales-control.vercel.app/tracking.js"></script>
<script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
```

## DSGVO-Hinweise

Das Popup:
- **Laedt keine Tracker** und sendet **keine Daten** bevor der Besucher die Form abschickt
- Setzt nur **ein LocalStorage-Item** (`pn_popup_dismissed`) nach Close oder Submit, kein Cookie
- Zeigt einen Hinweis im Footer: *"Mit dem Senden stimmen Sie zu, dass wir Sie per Email kontaktieren duerfen. Abmeldung jederzeit moeglich."*
- Der Abmelde-Link wird automatisch in jeder Email mitgeschickt (siehe `/api/unsubscribe`)

Wenn ihr ein Cookie-Banner habt, das Popup startet **unabhaengig davon**, es ist kein Tracking-Script. Falls ihr trotzdem eine Opt-In-Logik wollt, sagt Bescheid, dann bauen wir einen `window.pnConsentGiven` Hook ein.

## Wie testet Angie, ob es laeuft?

1. **Einmalig LocalStorage leeren**: in DevTools → Application → Local Storage → `https://praxisnovaai.com` → `pn_popup_dismissed` loeschen
2. **30 Sekunden auf einer Seite warten** → Popup sollte erscheinen
3. **Oder**: Maus zuegig Richtung Browser-Tabs bewegen → Exit-Intent triggert Popup
4. **Test-Email eingeben und absenden** → Sales-Tool pruefen ob neuer Lead mit Source `website_popup` auftaucht
5. **Brevo-Inbox pruefen** → Angie sollte innerhalb 30 Sekunden eine Benachrichtigung bekommen

## Wie schalte ich das Popup fuer einzelne Seiten aus?

Einfach den Script-Tag auf der Seite nicht einbinden. Oder: vor dem Script-Tag

```html
<script>
  try { localStorage.setItem('pn_popup_dismissed', 'true'); } catch(_) {}
</script>
<script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
```

## Rate-Limit und Spam-Schutz

Der Webhook `/api/webhooks/website-leads` akzeptiert maximal **5 POSTs pro IP pro 10 Minuten**. Das reicht fuer normale Nutzer locker, filtert aber Bot-Scans ab. Wenn legitime Nutzer gegen das Limit laufen, heben wir es auf 10 an.

Zusaetzlich:
- Nur POSTs mit `Origin: https://praxisnovaai.com` oder `https://www.praxisnovaai.com` werden akzeptiert (CORS/Origin-Auth)
- Email wird server-seitig nochmal validiert
- Doppelte Leads (gleiche Email) werden nicht neu angelegt, sondern nur mit einem Kommentar aktualisiert

## Troubleshooting

**"Popup erscheint nicht"**:
- LocalStorage pruefen: `pn_popup_dismissed` muss leer sein
- DevTools Console pruefen: Fehler beim Laden von `popup.js`?
- Script-Tag richtig eingebunden?

**"Submit gibt Error"**:
- DevTools Network-Tab: POST an `/api/webhooks/website-leads` pruefen
- Response-Status sollte 200 sein, nicht 401 (Origin-Fehler) oder 429 (Rate-Limit)
- Wenn 401: Origin-Header pruefen, muss `https://praxisnovaai.com` oder `https://www.praxisnovaai.com` sein (nicht `http://`, nicht Subdomain ausser www)

**"Lead taucht nicht im Sales-Tool auf"**:
- Vercel Logs pruefen: `app/api/webhooks/website-leads/route.ts`
- Neon-DB pruefen: `SELECT * FROM leads ORDER BY created_at DESC LIMIT 5`
- Source-Spalte muss `website_popup` sein

## Kontakt bei Problemen

Angie: hertle.anjuli@praxisnovaai.com, oder direkt im Sales-Tool unter /settings die System-Status-Ampel pruefen.
