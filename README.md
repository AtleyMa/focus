# focus

A free iOS app that is Instagram without the addiction: **Reels, Explore, For You, suggested posts, and sponsored posts are gone.** You keep your **Following feed, stories, DMs, and posting** — and notifications keep working.

`focus` is a thin wrapper around `instagram.com` (the web version has full feed, stories, DMs, and posting) that injects a filter script removing the algorithmic surfaces. Same technique as paid apps (Dull, UNDOOMED) — but free and fully self-hosted.

- **Cost:** $0 (Xcode is free; signing uses your free Apple ID)
- **No subscription, no dev account, no data leaves your phone**
- **Auto-updating filters:** when Instagram changes its markup, the fix ships via the hosted `focus.user.js` and is picked up on next launch — no rebuild.

---

## Requirements

- A Mac with **Xcode** installed (free from the Mac App Store)
- An iPhone running **iOS 16+**
- Optionally **AltStore** or **SideStore** to avoid the 7-day re-signing chore

## Build & install (first time, ~15 minutes)

### 1. Set up the toolchain (one time)
```bash
sudo xcodebuild -license accept        # agree to Xcode license (needs your password)
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
brew install xcodegen                  # if you don't have it
```

### 2. Generate & open the project
```bash
xcodegen generate                      # creates Focus.xcodeproj from project.yml
open Focus.xcodeproj
```

### 3. Sign & build to your iPhone
1. In Xcode, select the **Focus** target → **Signing & Capabilities**.
2. Check **Automatically manage signing**, choose **Team = your Apple ID** (free "Personal Team").
3. Plug in your iPhone via USB, trust the computer.
4. Set the run destination to your iPhone, press **Run (⌘R)**.
5. If iOS complains, tap the app icon in Settings to trust the developer: **Settings → General → VPN & Device Management** → tap the Apple ID → **Trust**.

The app installs and works for **7 days**. When it expires, re-run step 3 (2 minutes), or automate with AltStore/SideStore below.

### 4. Enable Developer Mode (iOS 16+)
**Settings → Privacy & Security → Developer Mode → ON** → iPhone restarts → confirm. Required to run sideloaded apps.

## Never expire it again (optional)

- **AltStore (recommended):** install AltServer on your Mac from <https://altstore.io>, then from the **AltServer menu-bar icon → Install AltStore → your iPhone**. Sign in with your Apple ID inside AltStore. AltStore auto-re-signs `focus` over Wi-Fi while AltServer is running — no replugging.
- **SideStore:** an AltStore fork that refreshes itself **on-device** (Mac needed only once to pair) — good if your Mac is often off.

## Notifications (Combo A)

The web version has no push notifications, so to keep notifications exactly as before, keep the **native Instagram app installed** and lock it down so it can't be scrolled:

1. Native Instagram: **Settings → Notifications → keep only Messages** (or whatever you want to hear).
2. **Settings → Screen Time → App Limits → Add Limit → Instagram → 1–5 minutes/day** → enable **Block at Limit**.
3. **Important:** when iOS asks **"Include Website Under Limit?"** tap **"Don't Include Website"** — otherwise the limit also applies to `instagram.com`, which is exactly what `focus` loads, and `focus` would get blocked too.
4. Have a friend set a **Screen Time passcode** you don't know (so you can't tap "Ignore Limit").

Notifications arrive exactly as today; the native app just can't be used for scrolling. You reply to DMs inside `focus`.

## How the filtering updates

The app injects `focus.user.js` (bundled) and caches the newest copy from
`https://raw.githubusercontent.com/AtleyMa/focus/main/focus.user.js`
on every launch. When Instagram changes its markup:

1. I bump the script in this repo and push.
2. Your phone fetches it on next launch.
3. Done — no app rebuild.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App won't install / "Unable to install" | Confirm Developer Mode is on; check Signing team; try USB (not Wi-Fi) |
| Expired after 7 days | Re-run in Xcode, or set up AltStore/SideStore |
| Reels / suggestions visible | Force-quit and reopen (fetches latest filter); if still broken, report it — Meta changed the markup |
| Notifications stop | Combo A not applied yet — keep native IG + Screen Time limit |
| Screen Time blocks `focus` too | Your Instagram limit includes the website — delete the limit, re-create it, choose **Don't Include Website** |
| Login loop in webview | Log in in Safari first (`instagram.com`) so cookies/CSRF get set, then reopen `focus` |

## Project layout

```
project.yml                # XcodeGen spec → Focus.xcodeproj
Sources/
  FocusApp.swift           # app entry, kicks off filter refresh
  ContentView.swift        # SwiftUI host
  WebView.swift            # WKWebView → instagram.com, injects filter
  FocusRules.swift         # loads/caches focus.user.js (remote → bundled)
  Assets.xcassets/         # app icon
Supporting/Info.plist
focus.user.js              # the filter (hosted auto-update source)
tools/gen_icon.py          # regenerates the app icon
```

## License

MIT — see `LICENSE`.