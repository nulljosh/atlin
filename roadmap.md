# Atlin Roadmap

Open work only. Resume state lives in `docs/LOOP-HANDOFF.md`.

## Ship
- [ ] Build 9 clears review, then ship build 10 (iOS and Mac)
- [ ] Test native Google sign-in and Sign in with Apple on a real signed build

## Listings and QA
- [ ] (blocked: Joshua pays or drops, 2026-11-01) RentCast returns 403 (the account has no paid plan); pay for it or drop it. Checked 11-01: the Apify HousingFeed actor also answers 403 platform-feature-disabled, so both paid feeds fail on every uncached lookup; Craigslist, Zillow and REW carry the results. To drop without touching code, delete RENTCAST_KEY and APIFY_TOKEN from the roost Pages env (each provider skips itself without its key)

## Ingested 2026-10-30

## Ingested 2026-10-31
