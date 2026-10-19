# Atlin loop handoff (2026-10-18, evening)

## What the loop is

The App Store push for Atlin (ex-Brick, ex-Roost). It watches the review queue, keeps the store listings in step with the web app, and answers Apple only with Joshua's yes. A /loop is live in dynamic mode for this push.

## Where things stand

- Build 9 (iOS and Mac 1.0.0) is WAITING_FOR_REVIEW on ASC app 6824157219. It adds Sign in with Apple, email sign-in, account deletion, synced saves, the location prompt, the blue folded-map icon and the privacy label.
- Build 10 is built and compiles on iOS and Mac: native Google sign-in, profile, saved searches, Size filter, price drops, the alerts toggle, pin culling and the Mac fixes. It ships after build 9 clears. Mac Return-to-search works in a running app (Langley to Vancouver, 119 homes). Native Google sign-in has not been tested in a running app.
- Walk score on every home (web live, native in build 10): Overpass counts within 800 m, capped and weighted in src/lib/walk.js, mirrored in ios/Sources/Walk.swift. Overpass refuses Cloudflare Workers (521), so the browser and the apps ask it directly; osm.ch is skipped because it only holds Switzerland. Native fetch fixed (an empty Group never ran its .task) and now retries and caches; the Mac QA run hit public Overpass at capacity (502 and 500), so the rows have not yet been seen in a running app. Recheck on a quiet tick.
- Web has draw-on-map search: a Draw capsule at the top right of the map, trace a loop, only homes inside it stay (count, pins and cards). Clear area undoes it; a new place clears it. iOS and Mac have it too (same Draw capsule, same ray-casting check in Store.swift), QA'd in a running Mac app, ships in build 10.
- Web at atlin.jaybulb.com has Google and Apple sign-in, price drops, the Size filter, daily saved-search email alerts (toggle in Settings; sender in jaybulb-api, run by a GitHub Action), and translations in all 27 languages with the auth pages localized.
- The iOS and Mac Account sheets have the email-alerts toggle. Store screenshots for iPhone and Mac are refreshed, and the web promo video (27 seconds) is live.
- The docs (ARCHITECTURE, API, README, WHITEPAPER) were rewritten today.
- Demo account atlin-demo@jaybulb.com is created and confirmed. Auth emails through authmail are Atlin blue.
- The keychain slot is now com.nulljosh.atlin.session, and debug builds use their own .debug slot, so a re-signed test build never asks for the login password.
- Native account QA on Mac against a local jaybulb-api (`npx wrangler dev --local`, launch the debug build with `-apiBase http://127.0.0.1:8787`, throwaway creds in the gitignored .env): email sign-in, restore on relaunch, delete account (row gone, signed out) and Forgot password (recover 200, notice shown) all pass. Apple and Google cannot be tested locally.
- Sign-in sheet: Apple and Google are matching 48 point capsules with their marks (our own Apple button runs ASAuthorizationController), and Forgot password is in the native sheet. Ships in build 10.
- Price history: functions/api/listings.js keeps a [day, price] series per home in `h/<key>` (one point per change, last 12) and sends `priceHistory` once a price has moved. Web shows a step line and rows (QA'd light and dark with injected data); native PriceHistory.swift (Swift Charts) compiles for build 10 but has not been seen in a running app. Real histories build up as the daily cache refreshes.
- Listing sources today: Craigslist and HousingFeed (Vancouver 120 and 60). No REW or Zillow scraping.
- Zillow (US, rent and sale) and REW.ca (BC and Alberta rentals) are wired in functions/api/listings.js, both off until the Pages vars ZILLOW and REW are "on". Joshua: switch them on after build 9 clears. Both are free. Zillow reads the JSON its own search page asks for (async-create-search-page-state) straight from the Function: Austin gives 493 rentals and 503 sales in under a second; building pins carry their cheapest plan. REW reads two area pages a town and geocodes addresses through Photon, cached in KV (Vancouver: 40 cards, about 34 placed once the cache fills). Apify is at its monthly hard limit (HousingFeed paused) and Joshua said no to paying more. Probe: `/api/listings?...&zillowProbe=$ZILLOW_PROBE`, add `&source=rew` for REW (key in .env, sha256 in code).
- Bundle ID stays com.nulljosh.brick and the Pages project stays roost. Those cannot be renamed.

## Next, in order

1. Watch review for build 9. If Apple rejects, read the reason in Resolution Center, draft replies, and wait for Joshua's yes before sending anything.
2. Real-device test of Sign in with Apple on a signed build.
3. Native Google sign-in: confirm the iOS OAuth client exists, test it in a running app, then ship build 10.
4. Light-mode Mac shots.
5. Open issues: #13, #15, #16, #17, #18, #19, #23 and #25. Do not run the roadmap-to-issues sync until its duplicates are sorted, since it would reopen mirrors under new titles.

## Restart prompt

```
Continue the Atlin push in ~/Documents/Code/atlin until the next major version. Read docs/LOOP-HANDOFF.md first. Check review for build 9 with `asc versions list --app 6824157219` (just the appStoreState fields). If approved, bump CURRENT_PROJECT_VERSION to 10 in project.yml, archive, upload and submit iOS and Mac. If rejected, read the reason in Resolution Center and wait for Joshua's yes before replying. Otherwise fix one gap from the roadmap (native QA in a running app, open houses, school and walk scores, draw-on-map), QA, deploy, commit, push, update the handoff. Keep replies to a TLDR.
```
