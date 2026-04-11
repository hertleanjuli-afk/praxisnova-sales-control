/**
 * PraxisNova Email-Capture Popup (Paket B Teil 3, 2026-04-12)
 *
 * Vanilla JS, keine Dependencies. Wird auf praxisnovaai.com via
 *   <script async src="https://praxisnova-sales-control.vercel.app/popup.js"></script>
 * eingebunden. Zeigt einen Modal-Overlay an, sobald einer dieser Trigger
 * feuert:
 *   - Exit-Intent: Mausbewegung ueber die Viewport-Oberkante (clientY < 10)
 *   - Timer: 30 Sekunden nach Pageload
 * Whichever kommt zuerst. Nach Submit oder Close wird ein LocalStorage-Flag
 * `pn_popup_dismissed=true` gesetzt damit das Popup nicht nervt.
 *
 * User-facing Texte in Sie-Form, ohne em-dash, mit echten Umlauten.
 *
 * Datenschutz: das Popup laedt keine Tracker und setzt nur ein
 * LocalStorage-Item. Der Submit geht per fetch() an den Sales-Tool-Webhook,
 * der die Email im Lead-Sales-Tool speichert und Angie per Brevo
 * benachrichtigt.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://praxisnova-sales-control.vercel.app/api/webhooks/website-leads';
  var DISMISS_KEY = 'pn_popup_dismissed';
  var TIMER_MS = 30000;

  // Nicht zeigen wenn schon weggeklickt wurde
  try {
    if (window.localStorage && window.localStorage.getItem(DISMISS_KEY) === 'true') {
      return;
    }
  } catch (_e) {
    // localStorage disabled (private mode) - wir zeigen trotzdem
  }

  // Branche aus dem Pfad ableiten damit Angie Leads automatisch segmentieren kann
  function detectSector() {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('immobilien') !== -1) return 'immobilien';
    if (path.indexOf('handwerk') !== -1) return 'handwerk';
    if (path.indexOf('bau') !== -1) return 'bau';
    return 'unknown';
  }

  function dismissForever() {
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch (_e) {
      // Ignore - Popup kommt dann halt nochmal beim naechsten Besuch
    }
  }

  function buildPopup() {
    var overlay = document.createElement('div');
    overlay.id = 'pn-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pn-popup-title');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.65)',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'animation:pnPopupFadeIn 0.25s ease-out',
    ].join(';');

    var style = document.createElement('style');
    style.textContent =
      '@keyframes pnPopupFadeIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes pnPopupSlideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}' +
      '#pn-popup-box input,#pn-popup-box select{font-family:inherit}' +
      '#pn-popup-box input:focus,#pn-popup-box select:focus{outline:2px solid #E8472A;outline-offset:1px}' +
      '#pn-popup-submit:hover{background:#d13e23}' +
      '#pn-popup-close:hover{color:#333}';
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.id = 'pn-popup-box';
    box.style.cssText = [
      'background:#ffffff',
      'border-radius:16px',
      'box-shadow:0 20px 60px rgba(0,0,0,0.4)',
      'max-width:440px',
      'width:100%',
      'padding:32px 28px 24px',
      'position:relative',
      'animation:pnPopupSlideIn 0.3s ease-out',
      'box-sizing:border-box',
    ].join(';');

    box.innerHTML =
      '<button id="pn-popup-close" type="button" aria-label="Popup schliessen" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:24px;color:#999;cursor:pointer;padding:4px 8px;line-height:1">&times;</button>' +
      '<h2 id="pn-popup-title" style="margin:0 0 8px;font-size:22px;line-height:1.3;color:#0A0A0A;font-weight:700">Sie wollen mehr über KI für Ihr Unternehmen wissen?</h2>' +
      '<p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.5">Lassen Sie uns Ihre Email da, wir melden uns innerhalb von 2 Stunden.</p>' +
      '<form id="pn-popup-form" novalidate>' +
        '<label style="display:block;margin-bottom:12px"><span style="display:block;font-size:13px;color:#333;margin-bottom:4px;font-weight:500">Email<span style="color:#E8472A"> *</span></span>' +
          '<input type="email" name="email" required placeholder="ihre.email@firma.de" style="width:100%;padding:11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box"></label>' +
        '<label style="display:block;margin-bottom:12px"><span style="display:block;font-size:13px;color:#333;margin-bottom:4px;font-weight:500">Firma <span style="color:#999;font-weight:400">(optional)</span></span>' +
          '<input type="text" name="company" placeholder="Mustermann GmbH" style="width:100%;padding:11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box"></label>' +
        '<label style="display:block;margin-bottom:20px"><span style="display:block;font-size:13px;color:#333;margin-bottom:4px;font-weight:500">Branche</span>' +
          '<select name="sector" style="width:100%;padding:11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;background:#fff">' +
            '<option value="unknown">Bitte wählen</option>' +
            '<option value="bau">Bau</option>' +
            '<option value="handwerk">Handwerk</option>' +
            '<option value="immobilien">Immobilien</option>' +
          '</select></label>' +
        '<div id="pn-popup-error" style="display:none;color:#E8472A;font-size:13px;margin-bottom:12px"></div>' +
        '<button id="pn-popup-submit" type="submit" style="width:100%;background:#E8472A;color:#fff;border:none;border-radius:8px;padding:13px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.15s">Senden</button>' +
      '</form>' +
      '<button id="pn-popup-later" type="button" style="display:block;width:100%;margin-top:10px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;padding:6px">Jetzt nicht</button>' +
      '<p style="margin:16px 0 0;font-size:11px;color:#999;text-align:center;line-height:1.4">Mit dem Senden stimmen Sie zu, dass wir Sie per Email kontaktieren dürfen. Abmeldung jederzeit möglich.</p>';

    // Pre-fill die Branche aus dem Pfad falls erkennbar
    var detectedSector = detectSector();
    if (detectedSector !== 'unknown') {
      var select = box.querySelector('select[name="sector"]');
      if (select) select.value = detectedSector;
    }

    overlay.appendChild(box);
    return overlay;
  }

  function showSuccess(overlay) {
    var box = overlay.querySelector('#pn-popup-box');
    if (!box) return;
    box.innerHTML =
      '<div style="text-align:center;padding:20px 0">' +
        '<div style="font-size:48px;margin-bottom:12px">✓</div>' +
        '<h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:700">Vielen Dank!</h2>' +
        '<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5">Wir melden uns innerhalb von 2 Stunden bei Ihnen.</p>' +
        '<button type="button" id="pn-popup-done" style="background:#E8472A;color:#fff;border:none;border-radius:8px;padding:11px 28px;font-size:14px;font-weight:600;cursor:pointer">Schliessen</button>' +
      '</div>';
    var done = box.querySelector('#pn-popup-done');
    if (done) {
      done.addEventListener('click', function () {
        overlay.remove();
      });
    }
    setTimeout(function () {
      if (overlay.parentNode) overlay.remove();
    }, 4000);
  }

  function wireUpPopup(overlay) {
    var form = overlay.querySelector('#pn-popup-form');
    var errorDiv = overlay.querySelector('#pn-popup-error');
    var submitBtn = overlay.querySelector('#pn-popup-submit');
    var closeBtn = overlay.querySelector('#pn-popup-close');
    var laterBtn = overlay.querySelector('#pn-popup-later');

    function closePopup() {
      dismissForever();
      overlay.remove();
    }

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (laterBtn) laterBtn.addEventListener('click', closePopup);

    // ESC-Taste schliesst Popup
    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closePopup();
        document.removeEventListener('keydown', onKey);
      }
    }
    document.addEventListener('keydown', onKey);

    if (!form || !submitBtn) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
      }

      var emailInput = form.querySelector('input[name="email"]');
      var companyInput = form.querySelector('input[name="company"]');
      var sectorSelect = form.querySelector('select[name="sector"]');

      var email = emailInput ? String(emailInput.value || '').trim() : '';
      var company = companyInput ? String(companyInput.value || '').trim() : '';
      var sector = sectorSelect ? String(sectorSelect.value || 'unknown') : 'unknown';

      // Einfache Client-seitige Email-Validierung (Server validiert nochmal)
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errorDiv) {
          errorDiv.textContent = 'Bitte eine gültige Email-Adresse eingeben.';
          errorDiv.style.display = 'block';
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird gesendet...';

      // UTM-Parameter aus URL lesen
      var params = {};
      try {
        var url = new URL(window.location.href);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
          var v = url.searchParams.get(k);
          if (v) params[k] = v;
        });
      } catch (_e) {
        // Alte Browser ohne URL API - UTM egal
      }

      var payload = {
        email: email,
        company: company || null,
        sector: sector,
        source: 'popup',
        page_url: window.location.href,
        utm_source: params.utm_source || null,
        utm_medium: params.utm_medium || null,
        utm_campaign: params.utm_campaign || null,
        utm_content: params.utm_content || null,
      };

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }
          return res.json();
        })
        .then(function () {
          dismissForever();
          showSuccess(overlay);
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Senden';
          if (errorDiv) {
            errorDiv.textContent = 'Senden fehlgeschlagen. Bitte später nochmal versuchen oder direkt an hertle.anjuli@praxisnovaai.com schreiben.';
            errorDiv.style.display = 'block';
          }
        });
    });
  }

  var popupShown = false;
  function triggerPopup() {
    if (popupShown) return;
    popupShown = true;
    try {
      var overlay = buildPopup();
      document.body.appendChild(overlay);
      wireUpPopup(overlay);
    } catch (_e) {
      // Build fehlgeschlagen - nichts kaputt machen
    }
  }

  function install() {
    // Timer-Trigger: 30 Sekunden nach Pageload
    setTimeout(triggerPopup, TIMER_MS);

    // Exit-Intent Trigger: Maus verlaesst Viewport nach oben
    document.addEventListener('mouseout', function (e) {
      if (!e.toElement && !e.relatedTarget && e.clientY < 10) {
        triggerPopup();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
