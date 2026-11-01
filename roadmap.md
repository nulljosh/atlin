# Atlin Roadmap

Open work only. Resume state lives in `docs/LOOP-HANDOFF.md`.

## Ship
- [ ] Build 9 clears review, then ship build 10 (iOS and Mac)
- [ ] Test native Google sign-in and Sign in with Apple on a real signed build

## Listings and QA
- [x] Buy toggle only shows for US places (saleAvailable is countryCode === 'US'), so Vancouver has no Buy option even though the API returns sale rows. Fixed 2026-11-01: Buy shows for the US and Canada on web and native; live Vancouver For sale shows 120 listings (Craigslist)
- [x] Zillow detail shows "$1 / sq ft / mo"; fix the per-square-foot rent math. Fixed 2026-11-01: the math was right, the rounding was not; rent per area now keeps cents ($1.40 / sq ft / mo) on web and native, sale stays whole, yen-style currencies stay whole. market.test.mjs; web deployed, Mac build clean
- [ ] RentCast returns 403 (the account has no paid plan); pay for it or drop it
- [x] (11-01: no longer reproduces. Headless 390px phone viewport, scrollWidth 390; only map tiles and the chip row run past the edge, inside their own clipped or scrolling boxes) Mobile /browse is 2px wider than a 390px screen
- [ ] Native iOS and Mac not yet tested against the Zillow and REW results

## Ingested 2026-10-30
- [ ] Needs Hermes' landing page

## Ingested 2026-10-31
- [x] (11-01: app backdrop now clear, copy on a glass card; checked at 390px light and dark) Hero wallpaper is still broken on mobile web: "Start anywhere" hero on atlin.jaybulb.com shows the blurred dark app behind it, nearly black (notes/attachments/2026-10-31/atlin-1.png). Joshua: "wtf why is this so difficult".
