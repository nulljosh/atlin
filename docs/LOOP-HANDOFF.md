# Atlin loop handoff (2026-10-18, evening)

## What the loop is

The App Store push for Atlin (ex-Brick, ex-Roost). It watches the review queue, keeps the store listings in step with the web app, and answers Apple only with Joshua's yes. No loop is running right now.

## Where things stand

- Build 9 is in review on iOS and Mac on ASC app 6824157219. It adds Sign in with Apple, email sign-in, account deletion, saves that sync through jaybulb-api, the location prompt, the final blue folded-map icon (Joshua graded it A+) and the privacy label.
- Web at atlin.jaybulb.com has the same sign-in: Google and Apple on Login and Register. Broken photos hide themselves and the Atlin og image is live. Mac QA passed.
- Native Google sign-in is still open. It needs an iOS OAuth client, and it ships in build 10 after build 9 clears review.
- Demo account atlin-demo@jaybulb.com is created and confirmed.
- Auth emails through authmail are Atlin blue.
- Bundle ID stays com.nulljosh.brick and the Pages project stays roost. Those cannot be renamed.

## Next, in order

1. Watch review for build 9. If Apple rejects, read the reason in Resolution Center, draft replies, and wait for Joshua's yes before sending anything.
2. Real-device test of Sign in with Apple on a signed build.
3. Native Google sign-in: iOS OAuth client, then build 10.
4. More Mac screenshots (only one exists) and light-mode Mac shots. Promo video after that.
5. Ad-graphic photos on some NYC listings: swap for real photos or hide them.
6. Docs pass on the README.
7. Open issues: #13 (website login), #15 (compare to REW + Zillow), #16 (v1.1 native sync and deletion), #17 (brown color check), #18 to #21 (the roadmap items above).

## Restart prompt

```
/loop Continue the Atlin App Store push in ~/Documents/Code/atlin. Read docs/LOOP-HANDOFF.md first. Check review status for build 9 on ASC app 6824157219 (iOS and Mac). If approved, mark live and update roadmap.md. If rejected, read the reason in Resolution Center, draft replies, and wait for Joshua's yes before sending. Then work the Next list in order, committing each step by exact path and pushing to main.
```
