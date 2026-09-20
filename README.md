# focus

A free, auto-updating filter that strips the addictive parts out of Instagram: **Reels, Explore, For You, suggested posts, and sponsored posts** are gone. You keep your **Following feed, stories, DMs, and posting**.

Runs on `instagram.com` in Safari on your iPhone (or Mac) using the free, open-source [Userscripts](https://github.com/quoid/userscripts) extension. No Xcode. No developer account. No subscription. $0.

> **Why this works:** on a non-jailbroken iPhone, no app can modify the native Instagram app. So `focus` works on the *web* version of Instagram — which has full feed, stories, DMs, and posting — and surgically hides the algorithmic surfaces. Use the native app only as a locked-down DM inbox (see "Combo A" below).

---

## Install on your iPhone (~10 minutes)

1. **Install Userscripts** (free) from the App Store: <https://apps.apple.com/app/id1463298887>
2. **Enable the extension:**
   - Open **Settings → Safari → Extensions → Userscripts**
   - Turn it **on**, and tap **Allow on All Websites** (or at minimum allow `instagram.com`).
3. **Install the script:** in Safari, open
   `https://raw.githubusercontent.com/AtleyMa/focus/main/focus.user.js`
   - If you see the raw script text, that's normal. Tap the **extensions icon** (puzzle / "Aa") in the address bar, open **Userscripts**, and tap **Install** on the prompt.
   - Alternative: open the Userscripts extension popup → **+ → New Remote** and paste the same URL.
4. **Log in & verify:** open <https://www.instagram.com>, log in. Confirm:
   - Feed shows only **Following** (no "For You" toggle, no Reels).
   - No Reels link/tab anywhere, no Explore.
   - No "Suggested for you" or sponsored posts.
   - Stories and DMs still work.
   - Tapping a shared `/reel/...` link redirects you to your Home feed.
5. **Make it feel like an app:** in Safari, tap **Share → Add to Home Screen**, name it **focus**. It opens full-screen in its own tab.
6. **Delete the native Instagram app** (or apply Combo A below to keep it as a locked DM inbox).

> If you browse from macOS instead, the same script works in desktop Safari.

---

## Combo A — keep DM notifications (recommended setup)

You lose native push notifications when you stop using the Instagram app. If you still want DM notifications, keep the native app but lock it down so it can't be used for scrolling:

1. In the native Instagram app: **Settings → Notifications → toggle everything OFF except Messages.**
2. **Settings → Screen Time → App Limits → Add Limit → Instagram → 1–5 minutes/day**, and tap **Block at Limit**.
3. Have a friend set a **Screen Time passcode** you don't know (Settings → Screen Time → Use Screen Time Passcode) so you can't tap "Ignore Limit".

Result: the native app becomes a DM inbox that self-locks after a minute. Your actual feed lives in `focus`.

---

## Updating

`focus` carries `@version` + `@updateURL`, so when Instagram changes its markup and something breaks:

1. Open the **Userscripts** extension popup.
2. Tap **Available Updates** (the refresh button) — the new version appears.
3. Apply it.

That's it. If Meta has redesigned the site, the fix is shipped in the hosted script; no reinstall needed. If nothing fixes it, open an issue or re-install the script from the raw URL.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Reels / suggestions still visible | Update the script (see above); if already newest, Meta changed markup — report it. |
| "For You" feed loads | Refresh; `focus` auto-clicks **Following** within ~1.5s. |
| Script not running at all | Re-check extension permission for `instagram.com` (Settings → Safari → Extensions). |
| DMs appear in web but you miss pings | Use Combo A to keep native app for Messages notifications only. |
| Shared reel link opens home page | That's intentional — `/reel/` and `/reels/` redirect to your feed. |

---

## How it works

- **CSS** hides known Reels/Explore entry points (nav, tabs, profile tab) on first paint.
- **JS** removes Reels posts from the feed, scans text for "Suggested for you"/"Sponsored" labels and removes them (plus the posts attached to them), hides "Open in the Instagram app" banners, redirects `/reel/`, `/reels/`, and `/explore/` to Home, and auto-clicks the **Following** feed tab.
- A lightweight observer re-scans every 1.5s so lazy-loaded content stays clean while you scroll.
- **Privacy:** everything runs on your device inside Safari. No data leaves your phone.

## License

MIT — see `LICENSE`.