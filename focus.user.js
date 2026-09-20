// ==UserScript==
// @name         focus
// @namespace    https://github.com/AtleyMa/focus
// @version      0.4.0
// @description  focus removes Reels/Explore/For You/suggestions/sponsored from Instagram, forces the Following feed, and locks any reel you open so you can't advance to another. Runs in Safari (iPhone/macOS) via the Userscripts extension.
// @author       AtleyMa
// @match        https://www.instagram.com/*
// @match        https://m.instagram.com/*
// @inject-into  auto
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/AtleyMa/focus/main/focus.meta.js
// @downloadURL  https://raw.githubusercontent.com/AtleyMa/focus/main/focus.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var VERSION = '0.4.0';
  var DEBUG = false;

  function log() {
    if (DEBUG) console.log.apply(console, ['[focus]'].concat([].slice.call(arguments)));
  }

  /* ------------------------------------------------------------------
   * 1. CSS — hide entry points only. We intentionally do NOT hide
   *    /reel/ links so reels sent in DMs stay tappable.
   * ------------------------------------------------------------------ */
  var CSS = [
    'a[href="/reels/"], a[href="/explore/"] { display: none !important; }',
    'nav a[href="/reels/"], nav a[href="/explore/"] { display: none !important; }',
    '[role="tablist"] a[href*="/reels/"], [role="tablist"] a[href*="/explore/"], [role="tab"] a[href*="/reels/"] { display: none !important; }',
    'header a[href*="/reels/"], header a[href*="/explore/"] { display: none !important; }',
    'aside a[href="/reels/"], aside a[href="/explore/"] { display: none !important; }'
  ].join('\n');

  function injectCSS() {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = CSS;
    style.setAttribute('data-focus', VERSION);
    (document.head || document.documentElement).appendChild(style);
  }

  /* ------------------------------------------------------------------
   * 2. Helpers.
   * ------------------------------------------------------------------ */
  function clean(t) { return (t || '').replace(/\s+/g, ' ').trim(); }

  function removeEl(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  var DIVIDERS = {
    'Suggested for you': true,
    'Suggested posts': true,
    'Suggested accounts': true,
    'Suggested': true,
    'More posts you may like': true,
    'You might like': true,
    'Recommended for you': true,
    'In case you missed it': true,
    'Because you follow': true,
    /* ads */
    'Sponsored': true,
    'Sponsored content': true,
    'Sponsored post': true,
    'Promoted': true,
    'Promoted content': true,
    'Advertisement': true,
    'Ad': true
  };

  var BANNER_RE = /Open (the )?(Instagram )?(app|in the app)|Get the (Instagram )?app|Use the (Instagram )?app|Install the app/;

  /* ------------------------------------------------------------------
   * 3. Remove Reels posts from the feed (cards that link to /reel/).
   *    Reels in DMs are NOT removed — those are tappable on purpose.
   * ------------------------------------------------------------------ */
  function purgeReelPosts() {
    var arts = document.querySelectorAll('article');
    for (var i = 0; i < arts.length; i++) {
      var a = arts[i];
      if (a.querySelector('a[href*="/reel/"], a[href*="/reels/"]')) removeEl(a);
    }
  }

  /* ------------------------------------------------------------------
   * 4. Text-node scan — suggestion dividers, sponsored labels, banners.
   * ------------------------------------------------------------------ */
  function walkText(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var hits = [];
    var node;
    while ((node = walker.nextNode())) {
      var t = clean(node.nodeValue);
      if (!t || t.length > 40) continue;
      if (DIVIDERS[t] || BANNER_RE.test(t)) hits.push(node.parentElement);
    }
    return hits;
  }

  function hideFixedAncestor(el) {
    var n = el;
    for (var i = 0; i < 8 && n; i++) {
      var st = window.getComputedStyle(n);
      if (st.position === 'fixed' || st.position === 'absolute') { n.style.display = 'none'; return; }
      n = n.parentElement;
    }
    removeEl(el);
  }

  function removeDividerAndNext(el) {
    var parent = el.parentElement;
    if (!parent) { removeEl(el); return; }
    var next = el.nextElementSibling;
    var guard = 0;
    while (next && guard < 4) {
      var art = next.matches('article') ? next : next.querySelector('article');
      if (art) { removeEl(art); break; }
      next = next.nextElementSibling;
      guard++;
    }
    removeEl(el);
  }

  function handle(el) {
    if (!el || el.__focusHandled) return;
    var t = clean(el.textContent);

    var art = el.closest ? el.closest('article') : null;
    if (art) { removeEl(art); return; }

    if (BANNER_RE.test(t)) { hideFixedAncestor(el); return; }

    if (DIVIDERS[t]) { removeDividerAndNext(el); return; }

    removeEl(el);
  }

  /* ------------------------------------------------------------------
   * 5. Force the "Following" feed instead of "For You".
   * ------------------------------------------------------------------ */
  function forceFollowing() {
    var tabs = document.querySelectorAll('[role="tab"], [role="tablist"] a, [role="tablist"] [role="button"]');
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var t = clean(tab.textContent);
      if (t !== 'Following') continue;
      if (tab.getAttribute('aria-selected') === 'true') return;
      log('switching to Following');
      tab.click();
      return;
    }
  }

  /* ------------------------------------------------------------------
   * 6. Reel lock.
   *
   *    Hard-banned routes (never allowed):
   *        /reels/...  /explore/...
   *    Single-reel viewing (allowed):
   *        /reel/<id> OR a reel opened as an overlay from DMs.
   *    "reelActive" is engaged by tapping a reel link OR landing on a
   *    /reel/ URL, and disengaged when no full-screen video remains.
   *    While active, vertical swipes on the video are blocked and any
   *    attempt to advance to a different reel bounces back.
   * ------------------------------------------------------------------ */
  var currentReel = null;
  var reelActive = false;
  var bounceCooldown = false;

  function reelIdFromPath(p) {
    p = p || '';
    if (p.indexOf('/reel/') !== 0) return null;
    var parts = p.split('/');
    return parts[2] || null;
  }

  function hardRedirect() {
    var p = location.pathname;
    if (p === '/reels/' || p === '/reels' || p === '/explore/') {
      log('redirecting', p, '-> /');
      location.replace('/');
      return true;
    }
    return false;
  }

  function engageReel(id) {
    currentReel = id;
    reelActive = true;
    log('reel lock: watching', id);
  }

  function disengage() {
    if (reelActive) log('reel lock: disengaged');
    currentReel = null;
    reelActive = false;
  }

  function bounce(offender) {
    if (bounceCooldown) return;
    bounceCooldown = true;
    log('reel lock: bounce', offender, '->', currentReel);
    history.back();
    setTimeout(function () {
      bounceCooldown = false;
      var now = reelIdFromPath(location.pathname);
      if (now && now !== currentReel) {
        log('reel lock: force back to', currentReel);
        location.replace('/reel/' + currentReel);
      }
    }, 900);
  }

  /* A full-screen-ish playing video = an open viewer (reel overlay). */
  function hasFullscreenVideo() {
    var vids = document.querySelectorAll('video');
    for (var i = 0; i < vids.length; i++) {
      var r = vids[i].getBoundingClientRect();
      if (r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.8) return true;
    }
    return false;
  }

  function handleNavigation() {
    if (hardRedirect()) { disengage(); return; }

    var id = reelIdFromPath(location.pathname);
    if (id) {
      if (currentReel === null) engageReel(id);
      else if (id !== currentReel) bounce(id);
      hideReelControls();
    } else {
      if (reelActive && !hasFullscreenVideo()) disengage();
    }
  }

  /* Hide next/prev affordances + related-reel rails inside the viewer. */
  function hideReelControls() {
    ['[aria-label="Next"]', '[aria-label="Previous"]', '[aria-label="Next reel"]', '[aria-label="Previous reel"]']
      .forEach(function (sel) {
        document.querySelectorAll(sel).forEach(removeEl);
      });
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var t = clean(node.nodeValue);
      if (t === 'More reels' || t === 'More videos' || t === 'See all reels' || t === 'Next reel') {
        removeEl(node.parentElement);
      }
    }
  }

  /* Engage reel mode when a reel link is tapped (DM overlay case). */
  document.addEventListener('click', function (e) {
    if (reelActive) return;
    var target = e.target;
    if (!target || !target.closest) return;
    var a = target.closest('a');
    if (a) {
      var id = reelIdFromPath(a.getAttribute('href') || '');
      if (id) { engageReel(id); return; }
      return; /* an anchor that isn't a reel — ignore */
    }
    var el = target;
    for (var i = 0; i < 3 && el && el.querySelector; i++) {
      var inner = el.querySelector('a[href*="/reel/"]');
      if (inner) {
        var id2 = reelIdFromPath(inner.getAttribute('href') || '');
        if (id2) { engageReel(id2); return; }
      }
      el = el.parentElement;
    }
  }, true);

  /* Block vertical swipes on the video while a reel is being viewed. */
  document.addEventListener('touchmove', function (e) {
    if (!reelActive) return;
    var target = e.target;
    if (!target || !target.closest) return;
    if (target.closest('video')) e.preventDefault();
  }, { passive: false, capture: true });

  /* ------------------------------------------------------------------
   * 7. Catch SPA route changes instantly.
   * ------------------------------------------------------------------ */
  (function patchHistory() {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () {
      var r = origPush.apply(this, arguments);
      handleNavigation();
      return r;
    };
    history.replaceState = function () {
      var r = origReplace.apply(this, arguments);
      handleNavigation();
      return r;
    };
  })();
  window.addEventListener('popstate', handleNavigation);

  /* ------------------------------------------------------------------
   * 8. Main loop — run now, then on an interval + scroll.
   * ------------------------------------------------------------------ */
  var timer = null;

  function scan() {
    if (!document.body) return;
    handleNavigation();
    purgeReelPosts();
    var hits = walkText(document.body);
    for (var i = 0; i < hits.length; i++) handle(hits[i]);
    forceFollowing();
    if (reelActive) hideReelControls();
  }

  function start() {
    injectCSS();
    scan();
    timer = setInterval(scan, 1000);
    document.addEventListener('scroll', scan, { passive: true });
    log('started v' + VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();