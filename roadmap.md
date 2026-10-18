# Atlin Roadmap

Open work only. Resume state lives in `docs/LOOP-HANDOFF.md`.

## Ship
- [ ] Build 9 clears review, then ship build 10 (iOS and Mac)
- [ ] Test native Google sign-in and Sign in with Apple on a real signed build
- [ ] Verify Return-to-search on Mac in a running app
- [ ] Light-mode Mac screenshots

## Gaps vs Zillow and REW
- [ ] Native detail parity: View listing, Share, location map, similar homes, mortgage estimate (web has them)
- [ ] Draw-on-map search
- [ ] Baths filter (no feed gives bath counts yet)
- [ ] Price history, school and walk scores, open houses (need a data source; no scraping REW or Zillow)

## Polish
- [ ] Some NYC listings still carry ad-graphic photos. Swap for real photos or hide them.
- [ ] Sample homes can land in water: the no-streets fallback has no land check.
- [ ] Service worker serves the previous build for one load after a deploy.
- [ ] Landing body paragraphs translated beyond the major languages.
- [ ] Sync the colour palette with the portfolio and other projects.
