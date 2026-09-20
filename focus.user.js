// ==UserScript==
// @name         focus
// @namespace    https://github.com/AtleyMa/focus
// @version      0.2.0
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

  var VERSION = '0.2.0';
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

  function isReelHref(href) {
    href = (href || '');
    return href.indexOf('/reel/') === 0 || href.indexOf('/reels/') === 0 || href === '/reels';
  }

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
   * 4. Remove reel cards anywhere (DMs, search, profile grids): the
   *    anchor is usually the whole card, so climb a couple of tight
   *    wrapper levels and drop it, stopping before page-level nodes.
   * ------------------------------------------------------------------ */
  function removeReelCards() {
    var links = document.querySelectorAll('a[href*="/reel/"], a[href*="/reels/"]');
    for (var i = 0; i < links.length; i++) {
      var node = links[i];
      if (!node.parentNode) continue;
      for (var lvl = 0; lvl < 3; lvl++) {
        var p = node.parentElement;
        if (!p) break;
        if (p === document.body || p === document.documentElement) break;
        if (p.matches && p.matches('main, [role="main"]')) break;
        if (p.children.length > 4) break;   /* too big to be the card itself */
        node = p;
      }
      removeEl(node);
      log('removed reel card');
    }
  }

  /* ------------------------------------------------------------------
   * 5. Text-node scan — suggestion dividers, sponsored labels, banners.
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
   * 6. Force the "Following" feed instead of "For You".
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
   * 7. Redirect Reels / Explore routes back to Home.
   * ------------------------------------------------------------------ */
  function redirectBadRoutes() {
    var p = location.pathname;
    if (p === '/reels/' || p.indexOf('/reel/') === 0 || p === '/explore/' || p === '/reels') {
      log('redirecting', p, '-> /');
      location.replace('/');
    }
  }

  /* ------------------------------------------------------------------
   * 8. Click interceptor — stop reel/explore taps dead (capture phase),
   *    including cards whose anchor is a descendant of the tap target.
   * ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var el = e.target;
    for (var i = 0; i < 8 && el && el !== document; i++) {
      if (el.tagName === 'A') {
        if (isReelHref(el.getAttribute('href')) || el.getAttribute('href') === '/explore/') {
          e.preventDefault();
          e.stopPropagation();
          log('blocked reel/explore click');
          redirectBadRoutes();
          return;
        }
        break;
      }
      if (el.querySelector) {
        var inner = el.querySelector('a[href*="/reel/"], a[href*="/reels/"]');
        if (inner) {
          e.preventDefault();
          e.stopPropagation();
          log('blocked click on container with reel link');
          redirectBadRoutes();
          return;
        }
      }
      el = el.parentElement;
    }
  }, true);

  /* ------------------------------------------------------------------
   * 9. Catch SPA route changes instantly (reel viewer opens via
   *    pushState without a full page load).
   * ------------------------------------------------------------------ */
  (function patchHistory() {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () {
      var r = origPush.apply(this, arguments);
      redirectBadRoutes();
      return r;
    };
    history.replaceState = function () {
      var r = origReplace.apply(this, arguments);
      redirectBadRoutes();
      return r;
    };
  })();
  window.addEventListener('popstate', redirectBadRoutes);

  /* ------------------------------------------------------------------
   * 10. Main loop — run now, then on an interval + scroll.
   * ------------------------------------------------------------------ */
  var timer = null;

  function scan() {
    if (document.body) {
      redirectBadRoutes();
      purgeReelPosts();
      removeReelCards();
      var hits = walkText(document.body);
      for (var i = 0; i < hits.length; i++) handle(hits[i]);
      forceFollowing();
    }
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