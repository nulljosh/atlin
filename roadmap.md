# Atlin Roadmap

Open work only. Resume state lives in `docs/LOOP-HANDOFF.md`.

## Ship
- [ ] Build 9 clears review, then ship build 10 (iOS and Mac)
- [ ] Test native Google sign-in and Sign in with Apple on a real signed build

## Listings and QA
- [ ] Buy toggle only shows for US places (saleAvailable is countryCode === 'US'), so Vancouver has no Buy option even though the API returns sale rows
- [ ] Zillow rent results include junk cards, like the "Apply now, Austin" card at $550 with 1 bd and 717 ft2; drop rows that are not a home
- [ ] Zillow detail shows "$1 / sq ft / mo"; fix the per-square-foot rent math
- [ ] RentCast returns 403 (the account has no paid plan); pay for it or drop it
- [ ] Mobile /browse is 2px wider than a 390px screen
- [ ] Footer links are 24px tall, under the 44px tap target
- [ ] Native iOS and Mac not yet tested against the Zillow and REW results
