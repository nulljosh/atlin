# Atlin Roadmap

> Priority tier 1 (2026-10-17): live blocker, work first. Order: live blockers, ship pushes, active features, portfolio, exploratory. See ~/Documents/Code/LOOP-HANDOFF.md.

## App Store push 2026-10-04 (paused, resume at home)
- [x] iOS 1.0.0 and Mac 1.0.0 submitted for review 2026-10-18
- [ ] v1.1: native sign-in and synced saves, in-app account deletion, favorites table, more Mac screenshots, light-mode shots
- [x] ASC record created (id 6824157219, name Atlin). Bundle ID stays com.nulljosh.brick (Apple cannot change it). Next: upload build, listing, submit.
- [ ] RentCast API key pending Joshua signup (US sale and rent data feeds already wired, APIFY_TOKEN for HousingFeed 30 countries already configured).

## Worldwide build 2026-08-28
Web app now browses anywhere on earth: Nominatim place search, real local street
names from Overpass, per-country currency/units/price levels, sale and rent
modes, and UI strings in 25 languages with RTL.

- [ ] Hero line translatable into all 26 languages (currently English-only on landing).
- [ ] Login/Register/ForgotPassword copy localization (strings dict has keys, pages need `t()` calls).

## Polish and optimization

- [ ] No land check on generated coordinates. Street anchors are on land by
      construction, but the no-streets fallback can still put a home in water.
- [ ] Service worker serves the previous build for one load after a deploy.
      Every check of a fresh deploy needs a hard reload or an unregister first.
- [ ] JS bundle split: Leaflet loads on landing where no map exists. Route-level code splitting wanted.
- [ ] `npm test` runs two node files. No CI runs them.

## TUI pilot (2026-09-05)
- `atlin-tui` SwiftPM target (SwiftTUI). `swift build && ./.build/debug/atlin-tui "Vancouver"` hits Nominatim directly, same public geocoding API src/lib/geo.js calls. Needs a real TTY.

## 2026-09-10 loading cleanup

Removed the unused animate.css import and dependency. App routes load on demand; Leaflet CSS travels with the map. The main JavaScript bundle is 437 kB, with the 162 kB listings bundle separate. Build and both test suites pass. Existing test CI was verified in .github/workflows/test.yml.

## From Notes (2026-09-12)
- [ ] Sync UI/color palette more with portfolio and other projects

## Ingested 2026-10-16
- [ ] Atlin (ex-Roost): confirm the brown color has been removed. Refresh screenshots. Needs a demo video. QA the app and website.
- [ ] QA the iOS and macOS apps. Ship to the App Store.

## Ingested 2026-10-17
- [ ] When logged in, just show listings.
- [ ] Compare to REW + Zillow.
