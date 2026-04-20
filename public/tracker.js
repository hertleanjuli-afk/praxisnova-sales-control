/**
 * PraxisNova AI — Website Click Tracker
 * Nur anonyme Visitor-ID, keine IP, kein Name ohne Einwilligung
 *
 * Einbindung auf praxisnovaai.com:
 * <script src="https://praxisnova-sales-control.vercel.app/tracker.js" defer></script>
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://praxisnova-sales-control.vercel.app/api/track-click';
  var STORAGE_KEY = 'pnova_vid';

  // Generate or retrieve visitor ID
  function getVisitorId() {
    var vid = localStorage.getItem(STORAGE_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, vid);
    }
    return vid;
  }

  // Get UTM params from URL
  function getUtmParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
    };
  }

  // Send tracking event
  function track(buttonName, extra) {
    var utm = getUtmParams();
    var payload = {
      button: buttonName,
      page: window.location.pathname,
      visitor_id: getVisitorId(),
      timestamp: new Date().toISOString(),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content,
    };
    if (extra) {
      for (var key in extra) {
        payload[key] = extra[key];
      }
    }
    // Use sendBeacon for reliability, fallback to fetch
    var data = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([data], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(function () {});
    }
  }

  // Expose globally for manual calls: window.pnovaTrack('button_name')
  window.pnovaTrack = track;
  window.pnovaGetVisitorId = getVisitorId;

  // --- Tracked buttons (by text content) ---
  var TRACKED_BUTTONS = [
    'Kostenlosen Audit buchen',
    'Workshop anfragen',
    'Pakete ansehen',
    'Mehr erfahren',
    'Jetzt Platz sichern',
    'Termin buchen',
    'Erstgespräch buchen',
    'Kostenloses Erstgespräch',
    'Jetzt starten',
    'Kontakt aufnehmen',
    'Demo anfordern',
  ];

  // Normalize text for matching
  function normalize(text) {
    return (text || '').trim().replace(/\s+/g, ' ');
  }

  // Match button text against tracked list
  function matchButton(text) {
    var normalized = normalize(text).toLowerCase();
    for (var i = 0; i < TRACKED_BUTTONS.length; i++) {
      if (normalized.indexOf(TRACKED_BUTTONS[i].toLowerCase()) !== -1) {
        return TRACKED_BUTTONS[i];
      }
    }
    return null;
  }

  // --- Auto-track: page view ---
  track('pageview');

  // --- Auto-track: button clicks ---
  document.addEventListener('click', function (e) {
    var target = e.target;

    // Walk up to find a button or link
    var el = target;
    for (var i = 0; i < 5 && el; i++) {
      // Check for Calendly links
      if (el.tagName === 'A' && el.href && el.href.indexOf('calendly.com') !== -1) {
        track('Calendly Link', { button: 'Calendly: ' + normalize(el.textContent || el.innerText) });
        return;
      }

      // Check for tracked button text
      var text = normalize(el.textContent || el.innerText);
      var matched = matchButton(text);
      if (matched && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button')) {
        track(matched);
        return;
      }

      el = el.parentElement;
    }
  }, true);

  // --- Auto-track: time on page ---
  var pageStart = Date.now();
  window.addEventListener('beforeunload', function () {
    var seconds = Math.round((Date.now() - pageStart) / 1000);
    if (seconds > 2) {
      track('page_time', { button: 'time_on_page_' + seconds + 's' });
    }
  });

  // --- Link popup email to visitor ID ---
  // If the website popup sends data, include visitor_id
  // Override fetch to inject visitor_id into popup submissions
  var originalFetch = window.fetch;
  window.fetch = function (url, options) {
    if (url && typeof url === 'string' && url.indexOf('/api/webhooks/inbound') !== -1 && options && options.body) {
      try {
        var body = JSON.parse(options.body);
        body.visitorId = getVisitorId();
        options.body = JSON.stringify(body);
      } catch (e) {}
    }
    return originalFetch.apply(this, arguments);
  };
})();
