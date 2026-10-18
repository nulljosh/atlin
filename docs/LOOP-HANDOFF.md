# Atlin loop handoff (2026-10-18, evening)

## What the loop is

The App Store push for Atlin (ex-Brick, ex-Roost). It watches the review queue, keeps the store listings in step with the web app, and answers Apple only with Joshua's yes. No loop is running right now.

## Where things stand

- iOS and Mac 1.0.0 are resubmitted as build 5 with the folded-map icon. Both are WAITING_FOR_REVIEW on ASC app 6824157219 (iOS submission 1550d53e, Mac 275fe917).
- Web at atlin.jaybulb.com has the splash, first-visit onboarding, public Settings (language, account, about) and a save prompt for signed-out users. QA passed.
- Demo account atlin-demo@jaybulb.com is created and confirmed.
- Auth emails through authmail are Atlin blue.
- Bundle ID stays com.nulljosh.brick and the Pages project stays roost. Those cannot be renamed.

## Next, in order

1. Watch review. If Apple rejects, read the reason in Resolution Center, draft replies, and wait for Joshua's yes before sending anything.
2. More Mac screenshots (only one exists) and light-mode Mac shots.
3. Promo video.
4. Docs pass on the README.
5. Open issues: #13 (website login) and #15 (compare to REW + Zillow), plus the two mirrored this session (v1.1 native sign-in, brown color check).
6. v1.1: native sign-in, synced saves, favorites table, in-app account deletion.
7. Optional build 6: a bolder pin. The icon self-grades A-, the pin is small at 29 px.

## Restart prompt

```
/loop Continue the Atlin App Store push in ~/Documents/Code/atlin. Read docs/LOOP-HANDOFF.md first. Check review status for ASC app 6824157219 (iOS 1550d53e, Mac 275fe917). If approved, mark live and update roadmap.md. If rejected, read the reason in Resolution Center, draft replies, and wait for Joshua's yes before sending. Then work the Next list in order, committing each step by exact path and pushing to main.
```
