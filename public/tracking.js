/**
 * PraxisNova Website Tracking Script
 * Standalone IIFE for embedded tracking on praxisnovaai.com
 *
 * Features:
 * - Generates/persists visitor_id in localStorage
 * - Tracks pageviews with section detection
 * - Auto-tracks CTA clicks (Calendly, Potenzialrechner, custom buttons)
 * - Tracks scroll depth (25/50/75/100%)
 * - Tracks section clicks ("Details ansehen")
 * - Tracks email form submissions
 * - Device type detection
 * - Captures referrer and UTM params
 * - Uses sendBeacon with fetch fallback
 *
 * Configuration (optional):
 * window.PraxisNovaTracking = {
 *   endpoint: 'https://your-api.com/api/track-click',
 *   debug: true
 * }
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    endpoint: (window.PraxisNovaTracking && window.PraxisNovaTracking.endpoint) ||
              'https://praxisnova-sales-control.vercel.app/api/track-click',
    debug: (window.PraxisNovaTracking && window.PraxisNovaTracking.debug) || false,
    storageKeyVisitorId: 'praxisnova_visitor_id',
  };

  // State
  const state = {
    visitorId: null,
    pageSection: null,
    scrollDepthTracked: {
      25: false,
      50: false,
      75: false,
      100: false,
    },
    isReady: false,
  };

  /**
   * Log helper for debug mode
   */
  function log(message, data) {
    if (CONFIG.debug) {
      console.log('[PraxisNova Tracking]', message, data || '');
    }
  }

  /**
   * Generate UUID v4
   */
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get or create visitor_id from localStorage
   */
  function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem(CONFIG.storageKeyVisitorId);
    if (!visitorId) {
      visitorId = generateUUID();
      try {
        localStorage.setItem(CONFIG.storageKeyVisitorId, visitorId);
      } catch (e) {
        log('localStorage unavailable, using session visitorId');
      }
    }
    return visitorId;
  }

  /**
   * Detect device type from screen width
   */
  function getDeviceType() {
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  }

  /**
   * Extract section from URL pathname
   * /immobilien -> 'immobilien'
   * /handwerk -> 'handwerk'
   * /bau -> 'bau'
   * /automatisierung -> 'automatisierung'
   * / -> 'homepage'
   */
  function detectPageSection() {
    const pathname = window.location.pathname.toLowerCase();
    const segments = pathname.split('/').filter(Boolean);

    if (!segments.length) {
      return 'homepage';
    }

    const validSections = ['immobilien', 'handwerk', 'bau', 'automatisierung'];
    const firstSegment = segments[0];

    return validSections.includes(firstSegment) ? firstSegment : 'homepage';
  }

  /**
   * Parse UTM parameters from URL
   */
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_content: params.get('utm_content') || null,
    };
  }

  /**
   * Get document referrer
   */
  function getReferrer() {
    return document.referrer || null;
  }

  /**
   * Send tracking event to API
   * Uses sendBeacon if available, falls back to fetch
   */
  function sendTrackingEvent(eventData) {
    const payload = JSON.stringify(eventData);
    const blob = new Blob([payload], { type: 'application/json' });

    // Try sendBeacon first (preferred for reliability)
    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon(CONFIG.endpoint, blob);
      log('sendBeacon result:', success, eventData);
      return;
    }

    // Fallback to fetch
    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      keepalive: true, // Allows request to complete even if page unloads
    }).catch((error) => {
      log('fetch error:', error);
    });
  }

  /**
   * Build base event payload
   */
  function buildBasePayload(buttonId, buttonText) {
    const utmParams = getUTMParams();
    return {
      visitor_id: state.visitorId,
      page: window.location.pathname,
      button: buttonId || 'pageview',
      timestamp: new Date().toISOString(),
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content,
      device_type: getDeviceType(),
      referrer: getReferrer(),
    };
  }

  /**
   * Track pageview
   */
  function trackPageview() {
    state.pageSection = detectPageSection();
    const payload = buildBasePayload('pageview');
    payload.section = state.pageSection;
    sendTrackingEvent(payload);
    log('pageview tracked:', payload);
  }

  /**
   * Track scroll depth
   */
  function trackScrollDepth() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;

    if (documentHeight === 0) return;

    const scrollPercent = Math.round((window.scrollY / documentHeight) * 100);
    const depthThresholds = [25, 50, 75, 100];

    depthThresholds.forEach((threshold) => {
      if (scrollPercent >= threshold && !state.scrollDepthTracked[threshold]) {
        state.scrollDepthTracked[threshold] = true;
        const payload = buildBasePayload('scroll');
        payload.event_type = 'scroll';
        payload.scroll_depth = threshold;
        sendTrackingEvent(payload);
        log('scroll depth tracked:', threshold);
      }
    });
  }

  /**
   * Track CTA click
   * Calendly: data-track='cta-calendly' or href to calendly.com
   * Potenzialrechner: href contains 'potenzialrechner'
   * Custom buttons: data-track attribute
   */
  function trackCTAClick(element) {
    const href = element.href || '';
    const dataTrack = element.getAttribute('data-track');
    let buttonId = null;

    // Check data-track first
    if (dataTrack) {
      buttonId = dataTrack;
    }
    // Check for Calendly link
    else if (href.includes('calendly.com')) {
      buttonId = 'cta-calendly';
    }
    // Check for Potenzialrechner
    else if (href.includes('potenzialrechner')) {
      buttonId = 'cta-potenzialrechner';
    }

    if (buttonId) {
      const payload = buildBasePayload(buttonId);
      payload.event_type = 'cta_click';
      payload.element_text = (element.textContent || '').trim().substring(0, 100);
      sendTrackingEvent(payload);
      log('CTA click tracked:', buttonId);
    }
  }

  /**
   * Track section click ("Details ansehen")
   */
  function trackSectionClick(element) {
    const text = (element.textContent || '').trim().toLowerCase();
    if (text.includes('details ansehen') || text.includes('mehr erfahren')) {
      // Try to infer section from nearby content or data attribute
      let section = element.getAttribute('data-section') || state.pageSection;
      const payload = buildBasePayload('section-click');
      payload.event_type = 'section_click';
      payload.section = section;
      payload.element_text = (element.textContent || '').trim().substring(0, 100);
      sendTrackingEvent(payload);
      log('section click tracked:', section);
    }
  }

  /**
   * Track email form submission
   */
  function trackFormSubmit(email) {
    if (email && isValidEmail(email)) {
      const payload = buildBasePayload('form-submit');
      payload.event_type = 'form_submit';
      payload.email = email;
      sendTrackingEvent(payload);
      log('form submission tracked:', email);
    }
  }

  /**
   * Simple email validation
   */
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Attach click handlers to relevant elements
   */
  function attachClickHandlers() {
    // Track all links and buttons
    document.addEventListener('click', function(event) {
      let target = event.target;

      // Traverse up to find link or button
      while (target && target !== document.body) {
        if (target.tagName === 'A') {
          trackCTAClick(target);
          break;
        }
        if (target.tagName === 'BUTTON' && target.getAttribute('data-track')) {
          const buttonId = target.getAttribute('data-track');
          const payload = buildBasePayload(buttonId);
          payload.event_type = 'button_click';
          payload.element_text = (target.textContent || '').trim().substring(0, 100);
          sendTrackingEvent(payload);
          log('button click tracked:', buttonId);
          break;
        }
        target = target.parentElement;
      }

      // Check for section clicks
      target = event.target;
      while (target && target !== document.body) {
        const text = (target.textContent || '').trim().toLowerCase();
        if (text.includes('details ansehen') || text.includes('mehr erfahren')) {
          trackSectionClick(target);
          break;
        }
        target = target.parentElement;
      }
    }, true);
  }

  /**
   * Attach scroll handler
   */
  function attachScrollHandler() {
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        trackScrollDepth();
      }, 250); // Debounce
    });
  }

  /**
   * Listen for form submissions (email capture)
   */
  function attachFormHandlers() {
    document.addEventListener('submit', function(event) {
      const form = event.target;
      const emailInput = form.querySelector('input[type="email"]');

      if (emailInput && emailInput.value) {
        trackFormSubmit(emailInput.value);
      }
    });
  }

  /**
   * Initialize tracking on page load
   */
  function init() {
    if (state.isReady) return;

    // Ensure we have a visitor_id
    state.visitorId = getOrCreateVisitorId();
    log('visitor_id:', state.visitorId);

    // Track initial pageview
    trackPageview();

    // Attach event listeners
    attachClickHandlers();
    attachScrollHandler();
    attachFormHandlers();

    state.isReady = true;
    log('tracking initialized');
  }

  /**
   * Wait for DOM to be ready, then initialize
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

  // Also expose a manual track function for custom tracking
  window.PraxisNovaTrack = function(buttonId, metadata) {
    if (!state.isReady) {
      log('tracking not yet ready');
      return;
    }
    const payload = buildBasePayload(buttonId);
    if (metadata) {
      Object.assign(payload, metadata);
    }
    sendTrackingEvent(payload);
    log('custom track:', buttonId, metadata);
  };

  log('script loaded, waiting for page ready');
})();
