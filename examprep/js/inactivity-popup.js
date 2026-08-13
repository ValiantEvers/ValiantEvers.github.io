// inactivity-popup.js – shows a nudge after 30 min of inactivity on /examprep
(function () {
  'use strict';

  if (localStorage.getItem('examprep_popup_disabled') === 'true') return;

  const params      = new URLSearchParams(location.search);
  const DEBUG       = params.get('debug') === '1';
  const TIMEOUT_MS  = DEBUG ? 15_000 : 30 * 60 * 1000;
  const COOLDOWN_MS = DEBUG ? 15_000 : 30 * 60 * 1000;
  const log         = DEBUG ? (...a) => console.log('[inactivity-popup]', ...a) : () => {};

  log('initialised – timeout:', TIMEOUT_MS + 'ms  cooldown:', COOLDOWN_MS + 'ms');

  let timer     = null;
  let tabHidden = false;

  // ── Timer ──────────────────────────────────────────────────

  function resetTimer() {
    clearTimeout(timer);
    if (tabHidden) return;
    timer = setTimeout(maybeShow, TIMEOUT_MS);
    log('timer reset');
  }

  function maybeShow() {
    const cooldownUntil = Number(localStorage.getItem('examprep_popup_cooldown_until') || 0);
    if (Date.now() < cooldownUntil) {
      const remaining = cooldownUntil - Date.now();
      log('cooldown active – retrying in', Math.round(remaining / 1000) + 's');
      timer = setTimeout(maybeShow, remaining + 200); // +200ms margin
      return;
    }
    log('showing popup');
    showPopup();
  }

  // ── DOM ────────────────────────────────────────────────────

  function showPopup() {
    if (document.getElementById('inactivity-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'inactivity-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'inactivity-title');

    overlay.innerHTML =
      '<div class="inactivity-popup">' +
        '<p class="inactivity-eyebrow">Hei, du er fortsatt her?</p>' +
        '<h2 class="inactivity-headline" id="inactivity-title">Slutt&nbsp;å&nbsp;runk,<br>les&nbsp;til&nbsp;eksamen</h2>' +
        '<div class="inactivity-actions">' +
          '<button class="inactivity-btn-primary" id="inactivity-hide">Skjul nå</button>' +
          '<button class="inactivity-btn-ghost" id="inactivity-disable">Skru av for godt</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    overlay.querySelector('#inactivity-hide').focus();

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hidePopup();
    });
    overlay.querySelector('#inactivity-hide').addEventListener('click', hidePopup);
    overlay.querySelector('#inactivity-disable').addEventListener('click', disablePopup);
    document.addEventListener('keydown', onEsc);
  }

  function removePopup() {
    const el = document.getElementById('inactivity-overlay');
    if (el) el.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) {
    if (e.key === 'Escape') hidePopup();
  }

  // ── Actions ────────────────────────────────────────────────

  function hidePopup() {
    const until = Date.now() + COOLDOWN_MS;
    localStorage.setItem('examprep_popup_cooldown_until', String(until));
    log('dismissed – cooldown until', new Date(until).toLocaleTimeString());
    removePopup();
    // Activity listeners are still live; the next user interaction resets the timer.
  }

  function disablePopup() {
    localStorage.setItem('examprep_popup_disabled', 'true');
    log('disabled permanently');
    removePopup();
    teardown();
  }

  // ── Activity detection ─────────────────────────────────────

  function onActivity() { resetTimer(); }

  function onVisibility() {
    if (document.hidden) {
      tabHidden = true;
      clearTimeout(timer);
      log('tab hidden – timer paused');
    } else {
      tabHidden = false;
      log('tab visible – timer restarted from 0');
      resetTimer();
    }
  }

  const EVENTS       = ['mousemove', 'keydown', 'scroll', 'click'];
  const TOUCH_EVENTS = ['touchstart', 'touchmove'];

  function setup() {
    EVENTS.forEach(ev => window.addEventListener(ev, onActivity));
    TOUCH_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    resetTimer();
    log('setup complete');
  }

  function teardown() {
    EVENTS.forEach(ev => window.removeEventListener(ev, onActivity));
    TOUCH_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity, { passive: true }));
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(timer);
    log('torn down');
  }

  setup();
})();
