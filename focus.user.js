// ==UserScript==
// @name         focus
// @namespace    https://github.com/AtleyMa/focus
// @version      0.1.0
// @description  focus removes Reels, Explore, For You, suggested and sponsored posts from Instagram, leaving only your Following feed, stories and DMs. Runs in Safari (iPhone/macOS) via the Userscripts extension.
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

  var VERSION = '0.1.0';
  var DEBUG = false;

  function log() {
    if (DEBUG) console.log.apply(console, ['[focus]'].concat([].slice.call(arguments)));
  }

  /* ------------------------------------------------------------------
   * 1. CSS — hide known structural entry points (fast, first paint).
   * ------------------------------------------------------------------ */
  var CSS = [
    'a[href="/reels/"], a[href="/explore/"], a[href*="/reel/"], a[href*="/reels/"] { display: none !important; }',
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
    'Because you follow': true
  };

  var BANNER_RE = /Open (the )?(Instagram )?(app|in the app)|Get the (Instagram )?app|Use the (Instagram )?app|Install the app/;

  /* ------------------------------------------------------------------
   * 3. Remove Reels posts from the feed (cards that link to /reel/).
   * ------------------------------------------------------------------ */
  function purgeReelPosts() {
    var arts = document.querySelectorAll('article');
    for (var i = 0; i < arts.length; i++) {
      var a = arts[i];
      if (a.querySelector('a[href*="/reel/"], a[href*="/reels/"]')) removeEl(a);
    }
  }

  /* ------------------------------------------------------------------
   * 4. Text-node scan — find suggestion dividers, sponsored labels,
   *    app banners. Cheap: only visits short text nodes.
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
    if (art) { removeEl(art); return; }            /* sponsored label or suggested post */

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
   * 6. Redirect Reels / Explore routes back to Home.
   * ------------------------------------------------------------------ */
  function redirectBadRoutes() {
    var p = location.pathname;
    if (p === '/reels/' || p.indexOf('/reel/') === 0 || p === '/explore/' || p === '/reels') {
      log('redirecting', p, '-> /');
      location.replace('/');
    }
  }

  /* ------------------------------------------------------------------
   * 7. Main loop. Run once, then every 1.5s to catch lazy-loaded
   *    content, plus on scroll.
   * ------------------------------------------------------------------ */
  var timer = null;

  function scan() {
    if (document.body) {
      redirectBadRoutes();
      purgeReelPosts();
      var hits = walkText(document.body);
      for (var i = 0; i < hits.length; i++) handle(hits[i]);
      forceFollowing();
    }
  }

  function start() {
    injectCSS();
    scan();
    timer = setInterval(scan, 1500);
    document.addEventListener('scroll', scan, { passive: true });
    window.addEventListener('popstate', scan);
    log('started v' + VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();