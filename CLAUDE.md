# atlin (ex-Brick, ex-Roost, ex-Hemma)
v3.0.0, worldwide real estate browsing. Repo: https://github.com/nulljosh/atlin

## Rules

- Mobile-first layout, horizontal filter chips on small screens
- One accent: blue `#0071e3` (dark mode `#2997ff`), never red, from `brand/tokens.css`, white and true-black surfaces, system greys. Never brown, beige, purple, teal or red. Tokens live in `src/tokens.css`; edit that file, do not add a second theme.
- System font only (`-apple-system`, SF Pro, Helvetica), no webfonts, no serif faces
- 8 point grid (4, 8, 12, 16, 24, 32, 48), side margin 20, controls 48 tall capsules, radii cards 28 and grouped 20
- Map markers stay as price pill SVGs
- No emojis
- Name is Atlin (ex-Brick). Unchangeable leftovers: bundle ID `com.nulljosh.brick`, Pages project `roost`
- Icon: a home inside a map pin, `Atlin.icon` (Icon Composer), regenerate with the brand skill

## Run

```bash
cp .env.example .env   # optional: VITE_API_URL
npm install && npm run dev
npm run build
npm test
```

A deploy is served from the service worker cache for one load, so verify a fresh
deploy with a hard reload (or unregister the worker) before believing what you
see.


## The loop

Current resume state: `docs/LOOP-HANDOFF.md`. This is the App Store push for Atlin iOS.

## Deploy

Cloudflare Pages project `roost` (infra name only: Pages projects cannot be renamed and the listing secrets live on it) (atlin.jaybulb.com), direct upload:

```bash
npm run build && npx wrangler pages deploy dist --project-name=roost --branch=main
```

Listing keys
are Pages secrets read by `functions/api/listings.js`, never in the bundle:
`npx wrangler pages secret put RENTCAST_KEY --project-name=roost` (US sale + rent),
`APIFY_TOKEN` (HousingFeed rentals, 30 countries). With no key the app shows
sample homes, labeled as samples.

## Key Files

- src/main.jsx: App bootstrap and Vite entry
- src/App.jsx: Routing and protected routes
- src/context/AuthContext.jsx: jaybulb-api auth (Cloudflare D1): session, profile, email/password. Client in src/lib/spark.js
- src/context/PlaceContext.jsx: Current place, sale/rent mode, locale
- src/context/FavoritesContext.jsx: Favorites with localStorage sync
- src/context/FiltersContext.jsx: Price, beds, type, sort filters
- src/lib/market.js: Per-country currency, units, price levels
- src/components/MapView.jsx: Leaflet map with price pill markers
- src/lib/geo.js: Nominatim place search + Overpass streets (mirrors, 30d cache)
- src/lib/mapPins.js: Which pins survive at a given zoom
- functions/api/ask.js: AI mode. Plain words to filters via Workers AI (`[ai]` in wrangler.toml), rules parser fallback
- src/lib/ask.js, src/lib/deals.js: the rules parser and the deal score (percent under the median for the same bedroom count)
- src/components/AskBar.jsx: the ask bar on /browse. Browse is public; no sign-in needed
- src/lib/tools.js, functions/api/deals.js, functions/mcp.js: `/api/deals` and `/mcp` (search_deals, ask_atlin), shared tools
- src/lib/modes.js: the one-tap deal modes, mirrored in ios/Sources/Store.swift (DealMode)
- functions/api/listings.js: Live listings proxy (RentCast, HousingFeed), 24h KV cache
- src/data/listings.js: Per-place seeded listing generation (MLS/IDX shape)
- src/pages/: Landing, Login, Register, ForgotPassword, Listings, ListingDetail, Settings
