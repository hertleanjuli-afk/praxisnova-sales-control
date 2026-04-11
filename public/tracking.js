/**
 * PraxisNova AI Website Tracking (Paket B Teil 1, 2026-04-12)
 *
 * Vanilla JS, keine Dependencies. Laeuft bei DOMContentLoaded einmal und
 * sendet einen Pageview an das Sales-Tool Webhook. POST geht an
 * /api/webhooks/website-clicks mit Origin-basiertem Auth (kein Secret im
 * public JS). Das Tool akzeptiert Origin-POSTs nur von praxisnovaai.com.
 *
 * DSGVO-Hinweis: Kein Cookie. Die visitor-ID liegt in localStorage,
 * laeuft also pro Browser/Geraet und nicht ueber Geraete hinweg. Keine
 * IP wird clientseitig gesammelt (server-seitig sieht Vercel die IP
 * ohnehin fuer Rate-Limiting, speichert sie aber nicht persistent).
 *
 * Einbindung auf praxisnovaai.com:
 *   <script async src="https://praxisnova-sales-control.vercel.app/tracking.js"></script>
 *
 * Script-Tag gehoert in den <head>.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://praxisnova-sales-control.vercel.app/api/webhooks/website-clicks';
  var STORAGE_KEY = 'pnova_session_id';

  // Sektor aus URL-Pfad ableiten. Falls kein passender Treffer: "unknown".
  function detectSector() {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('/immobilien') === 0 || path.indexOf('/immobilienmakler') === 0) return 'immobilien';
    if (path.indexOf('/bau') === 0 || path.indexOf('/bauunternehmen') === 0) return 'bau';
    if (path.indexOf('/handwerk') === 0 || path.indexOf('/handwerker') === 0) return 'handwerk';
    return 'unknown';
  }

  // Session-ID aus LocalStorage holen oder neu generieren.
  // Nutzt crypto.randomUUID() wo verfuegbar, sonst Math.random Fallback.
  function getOrCreateSessionId() {
    try {
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      var uuid;
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        uuid = window.crypto.randomUUID();
      } else {
        uuid = 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      }
      localStorage.setItem(STORAGE_KEY, uuid);
      return uuid;
    } catch (e) {
      // LocalStorage kann von Privacy-Tools oder Browser-Settings blockiert
      // sein. Fallback auf eine session-only ID die nur fuer diesen Request
      // existiert, damit das Tracking nicht ausfaellt.
      return 'sess-nostorage-' + Date.now().toString(36);
    }
  }

  // Query-Parameter aus URL extrahieren (utm_*).
  function getUtmParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_content: params.get('utm_content') || null,
      utm_term: params.get('utm_term') || null,
    };
  }

  // Payload zusammenbauen und per POST an das Sales-Tool schicken.
  // Kein Browser-Alert, kein console.error bei Fehlern. Wenn das Sales-Tool
  // down ist, soll die Website NICHT kaputt aussehen.
  function sendPageview() {
    try {
      var sessionId = getOrCreateSessionId();
      var utm = getUtmParams();
      var payload = {
        visitorId: sessionId,
        page: window.location.pathname,
        referrer: document.referrer || null,
        timestamp: new Date().toISOString(),
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
        event_type: 'pageview',
        section: detectSector(),
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      };
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        keepalive: true,
      }).catch(function () { /* silent fail, Website bleibt funktional */ });
    } catch (e) {
      /* silent fail */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendPageview);
  } else {
    sendPageview();
  }
})();
