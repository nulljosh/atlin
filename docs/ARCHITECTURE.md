# Architecture

Atlin shows real homes on a map and ranks them by deal. One listings endpoint feeds the web app, the iPhone and Mac app, and agents.

## How it runs

**Web.** React and Vite, deployed to Cloudflare Pages. `src/App.jsx` routes `/` (landing), `/browse` (map and list), `/listing/:id`, `/settings` and the sign-in pages. Browsing is public. `PlaceContext` holds the searched place, `FiltersContext` the filters, `FavoritesContext` the saved homes.

**Listings.** `functions/api/listings.js` asks Craigslist, HousingFeed and RentCast at once, merges them, drops the same home posted twice and prices that cannot be real, then caches the answer in KV for a day. With no live source for a place the app shows labeled sample homes (`src/data/listings.js`).

**Deals.** `src/lib/deals.js` scores each home as the percent under the median price for its bedroom count. Under three homes in a group, or a score over 60 percent, scores zero.

**Price drops.** The listings function remembers each home's price in KV (`h/<key>`, 60 days). A home seen cheaper than last time gets `priceWas`, and the card shows "Dropped $X".

**Ask.** `functions/api/ask.js` turns plain words into filters with Workers AI, with a rules parser (`src/lib/ask.js`) as fallback.

**Agents.** `/api/deals` and `/mcp` share `src/lib/tools.js` (`search_deals`, `ask_atlin`). See [API.md](API.md).

**Accounts.** jaybulb-api (a Cloudflare Worker on D1) handles email, Apple and Google sign-in. Saved homes, saved searches, name and the alerts switch live in the account's profile.

**Email alerts.** With alerts on, jaybulb-api re-runs each saved search daily and emails new deals (`jaybulb-api/src/atlin-alerts.js`). A GitHub Action (`.github/workflows/alerts.yml`) calls `POST /functions/atlin-alerts` with a secret, because the Cloudflare account has no free cron slot.

**Native.** `ios/Sources` is one SwiftUI target for iOS 17 and macOS 14, built with XcodeGen from `project.yml`. It reads the same endpoints and the same account. Filter rules and photo filters are mirrored from the web (`src/lib/format.js`, `ios/Sources/Store.swift`).

**Also in the repo.** `tui/` is a Swift terminal pilot. `kmp/` is an unshipped Kotlin Multiplatform prototype.

## Files

| Path | Owns |
|---|---|
| `src/pages/` | Landing, Listings, ListingDetail, Settings, Login, Register, ForgotPassword |
| `src/components/` | Map, filter bar, listing card, ask bar, saved searches, footer, onboarding |
| `src/context/` | Place, filters, favorites, auth |
| `src/lib/` | Deal score, filters, ask parser, formatting, geocoding, map pins, shared tools |
| `src/i18n/` | English source strings and 26 translations, right-to-left list |
| `src/tokens.css` | Colors, spacing and radii. Edit here, never add a second theme |
| `functions/` | Pages Functions: listings, ask, deals, MCP |
| `ios/Sources/` | `AtlinApp.swift` (UI), `Store.swift` (data and filters), `Auth.swift` (account), `Locator.swift` (location) |
| `project.yml` | XcodeGen project for iOS and macOS |

## Localization

27 languages share one build. English is the source in `src/i18n/strings.js`. A key missing from a language falls back to English, so a partial translation is safe. Arabic, Hebrew, Persian and Urdu set `dir="rtl"`.

## External services

- Nominatim: place search, no key.
- Overpass: real street names, three mirrors, cached 30 days.
- Craigslist, HousingFeed (Apify), RentCast: listings.
- Workers AI: the ask bar.
- jaybulb-api and authmail (Resend): accounts and email.
- Leaflet: the map.

## Gotchas

- A fresh deploy is served from the service worker cache for one load. Hard reload before judging it.
- Listing rows are cached by a key prefix in `listings.js`. Bump the prefix when the row shape changes.
- Overpass mirrors are community-run and can lag or time out. When streets fail to load, homes are placed approximately and the app says so.
- No source gives bathroom counts, so there is no baths filter.
