<img src="public/icon.svg" width="80">

# Atlin

![version](https://img.shields.io/badge/version-v3.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green) [![GitHub](https://img.shields.io/badge/GitHub-nulljosh%2Fatlin-black?logo=github)](https://github.com/nulljosh/atlin)

**Live:** https://atlin.jaybulb.com

**Terminal:** `swift build && ./.build/debug/atlin-tui "Vancouver"` — see [tui/](tui/)

Real homes on a map, ranked by deal.

Type a city. Atlin shows what is for rent or for sale there, scores each home against the typical price for its size, and puts the best deals first. Every price in the local currency, every label in your language.

![Landing](docs/screenshots/landing.jpg)

| Browse | Listing |
|---|---|
| ![Browse](docs/screenshots/browse.jpg) | ![Listing](docs/screenshots/listing.jpg) |

<img src="progress.svg" width="460">

## Features

- Real homes for rent and for sale from Craigslist, HousingFeed and RentCast
- Every home scored against the typical price for its size, best deals first
- Ad cards filtered out; homes without photos show a street map
- Any place on earth, prices in the local currency, ft² or m² per country
- 27 languages, right-to-left included, picked from your browser
- Search in plain words: "2 bed under 2,500"
- Price drops flagged ("Dropped $200"), and a size filter
- Daily email of new deals from your saved searches (opt in)
- Sign in with Apple, Google or email; saved homes sync to iPhone and Mac
- iPhone and Mac app from one SwiftUI target

## Run

```bash
cp .env.example .env   # optional: VITE_API_URL overrides the jaybulb-api Worker
npm install && npm run dev
npm run build
npm test
```

## Data

`functions/api/listings.js` asks Craigslist, HousingFeed and RentCast at once, merges and dedupes them, and caches the result for a day. With no live source for a place, the app shows sample homes and says so.

## Docs

- [Whitepaper](WHITEPAPER.md): the deal score, listings and alerts
- [Architecture](docs/ARCHITECTURE.md) and [API](docs/API.md): the HTTP surface, `/mcp` and WebMCP tools for agents
- [Roadmap](roadmap.md), [Privacy](PRIVACY.md), [Security](SECURITY.md), [brand kit](brand/BRAND.md)

<img src="architecture.svg" width="600">

MIT 2026 Joshua Trommel. Source: [github.com/nulljosh/atlin](https://github.com/nulljosh/atlin)
