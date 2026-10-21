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
- [x] HousingFeed returns 403 outside Vancouver; check whether APIFY_TOKEN is dead. 2026-10-21: the token is fine. Every city gets 403 `platform-feature-disabled`, which means the Apify account hit its monthly hard limit (you said no to paying more). The feed comes back when the Apify cycle resets. Craigslist still covers each city. The error now shows Apify's reason under `sources`
- [ ] Mobile /browse is 2px wider than a 390px screen
- [ ] Footer links are 24px tall, under the 44px tap target
- [ ] Native iOS and Mac not yet tested against the Zillow and REW results
