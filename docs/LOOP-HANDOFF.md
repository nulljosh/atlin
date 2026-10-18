# Atlin loop handoff (2026-10-18, 12:20)

## What the loop is

The App Store push for Atlin (ex-Brick, ex-Roost). It watches the review queue, keeps the store listings in step with the web app, and answers Apple only with Joshua's yes. A /loop is live in dynamic mode for this push.

## Where things stand

- Build 9 (iOS and Mac 1.0.0) is WAITING_FOR_REVIEW on ASC app 6824157219. It adds Sign in with Apple, email sign-in, account deletion, synced saves, the location prompt, the blue folded-map icon and the privacy label.
- Build 10 is built and compiles on iOS and Mac: native Google sign-in, profile, saved searches, Size filter, price drops, the alerts toggle, pin culling and the Mac fixes. It ships after build 9 clears. Native Google sign-in and the Mac Return-to-search key have not been tested in a running app.
- Web at atlin.jaybulb.com has Google and Apple sign-in, price drops, the Size filter, daily saved-search email alerts (toggle in Settings; sender in jaybulb-api, run by a GitHub Action), and translations in all 27 languages with the auth pages localized.
- The iOS and Mac Account sheets have the email-alerts toggle. Store screenshots for iPhone and Mac are refreshed, and the web promo video (27 seconds) is live.
- The docs (ARCHITECTURE, API, README, WHITEPAPER) were rewritten today.
- Demo account atlin-demo@jaybulb.com is created and confirmed. Auth emails through authmail are Atlin blue.
- Bundle ID stays com.nulljosh.brick and the Pages project stays roost. Those cannot be renamed.

## Next, in order

1. Watch review for build 9. If Apple rejects, read the reason in Resolution Center, draft replies, and wait for Joshua's yes before sending anything.
2. Real-device test of Sign in with Apple on a signed build.
3. Native Google sign-in: confirm the iOS OAuth client exists, test it in a running app, then ship build 10.
4. Light-mode Mac shots.
5. Ad-graphic photos on some NYC listings: swap for real photos or hide them.
6. Open issues mirror the roadmap: #13, #15, #16, #17, #18, #19, #22, #23 and #25.

## Restart prompt

```
Continue the Atlin push in ~/Documents/Code/atlin until the next major version. Read docs/LOOP-HANDOFF.md first. Check review for build 9 with `asc versions list --app 6824157219` (just the appStoreState fields). If approved, bump CURRENT_PROJECT_VERSION to 10 in project.yml, archive, upload and submit iOS and Mac. If rejected, read the reason in Resolution Center and wait for Joshua's yes before replying. Otherwise fix one gap from the roadmap (native QA in a running app, open houses, school and walk scores, draw-on-map), QA, deploy, commit, push, update the handoff. Keep replies to a TLDR.
```
