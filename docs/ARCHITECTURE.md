# Architecture

Atlin is a worldwide real estate browser. Search homes for sale or rent in any city globally through a deterministic listing generator seeded by coordinates. Deployed as a web app (React + Vite on Cloudflare Pages), native iOS/Android and macOS via Kotlin Multiplatform, and a CLI (Swift TUI).

## How it runs

Web app: `index.html` loads `src/main.jsx` (React DOM bootstrap) which renders `src/App.jsx`. The router serves `Landing` publicly, auth pages (`Login`, `Register`, `ForgotPassword`) to all, and protected pages (`Listings`, `ListingDetail`, `Settings`) only to authenticated users. On mount, `AuthContext` checks jaybulb-api for a session. User searches for a place through `Nav`'s `PlaceSearch`, which calls `searchPlaces` and returns results from Nominatim. Selecting a place updates `PlaceContext`, which calls `generateListings` with the place's coordinates as a seed, producing deterministic inventory. The `Listings` page filters and sorts them using `filterListings`. Clicking a listing routes to `ListingDetail`, which shows a gallery, map pin, and full metadata. Favorites and filter state persist in localStorage.

TUI (`tui/main.swift`): calls Nominatim directly (no custom backend) to search places and generate listings, outputting them as structured cards in the terminal.

KMP (`kmp/`): shared Kotlin business logic (`Geo.kt`, `Listings.kt`, `Market.kt`) runs on Android, iOS, and desktop. Platform-specific entry points delegate to `AppScreen.kt`.

## Files

| File | What it owns |
|---|---|
| `src/main.jsx` + `index.html` | React app bootstrap and HTML entry point |
| `src/App.jsx` | Router, protected routes, layout wrapper with noise overlay and nav |
| `src/lib/geo.js` | Nominatim place search and Overpass street lookup with 30-day browser cache |
| `src/lib/market.js` | Per-country currency symbols, price levels, area units, default formatting rules |
| `src/data/listings.js` | Seeded random listing generation; each place produces the same deterministic inventory |
| `src/data/listings.test.mjs` | Generator correctness across cities and sale/rent modes |
| `src/context/AuthContext.jsx` | jaybulb-api email/password session state, pixel-art avatar generation |
| `src/context/PlaceContext.jsx` | Current place and sale/rent mode; generates listings on place change |
| `src/context/FavoritesContext.jsx` | Favorite listings with localStorage sync and per-user sync through jaybulb-api |
| `src/context/FiltersContext.jsx` | Price/beds/type/sort filter state with localStorage persistence |
| `src/pages/Landing.jsx` + `.css` | Public landing page: hero, feature cards, locale switcher, language picker (RTL support), footer with localization |
| `src/pages/Listings.jsx` + `.css` | Main browse grid: lazy-loads cards, handles empty state |
| `src/pages/ListingDetail.jsx` + `.css` | Single listing page: photo gallery, map embed, details sidebar, favorite toggle |
| `src/pages/Login.jsx` | Email/password sign-in through jaybulb-api |
| `src/pages/Register.jsx` | Account creation with OAuth, pulls name/email from provider |
| `src/pages/ForgotPassword.jsx` | Password reset flow via emailed link (authmail) |
| `src/pages/Settings.jsx` + `.css` | Locale switcher, language picker, price display preference, logout |
| `src/components/Nav.jsx` + `.css` | Fixed top bar: brand, place search, language menu |
| `src/components/PlaceSearch.jsx` + `.css` | Debounced Nominatim search input with dropdown; sets place on selection |
| `src/components/FilterBar.jsx` + `.css` | Horizontal chip filters: price bands, beds, type, sort, favorites toggle |
| `src/components/ListingCard.jsx` + `.css` | Card: photo, address, price, beds/baths, favorite star |
| `src/components/MapView.jsx` + `.css` | Leaflet map with price-pill markers; marker visibility culled by zoom |
| `src/lib/mapPins.js` | Zoom-aware marker cap (reduces overlap at city view) |
| `src/lib/mapPins.test.mjs` | Map pin culling logic |
| `src/lib/filterListings.js` | Shared filter + sort function used by Listings page and WebMCP |
| `src/lib/format.js` | Per-listing formatters: currency, area, rent/sale suffix |
| `src/lib/spark.js` | jaybulb-api client, defaults to api.jaybulb.com |
| `src/lib/webmcp.jsx` | Document.modelContext tool registration for in-browser agents |
| `src/i18n/` | Locale strings (en.js source of truth, locales/* are hand-kept translations), RTL language list, language picker logic |
| `src/styles/index.css` | Global CSS: font import, reset, body baseline |
| `src/tokens.css` | Imports shared portfolio tokens; overrides with warm clay/cream Atlin palette |
| `public/onboarding.js` | Shared first-run auth flow, copied verbatim into any app |
| `scripts/screenshots.mjs` | Playwright-based screenshot refresh |
| `tui/main.swift` | Swift CLI entry point: Place struct, Nominatim search call, card render |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/atlin/Geo.kt` | Ktor HTTP client wrapper for Nominatim search |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/atlin/Listings.kt` | Listing generator ported from JS; deterministic seeded randomness |
| `kmp/shared/src/commonMain/kotlin/com/nulljosh/atlin/Market.kt` | Currency/units tables, per-country |
| `kmp/composeApp/src/commonMain/kotlin/com/nulljosh/atlin/AppScreen.kt` | Jetpack Compose UI, shared across Android/desktop/iOS |
| `kmp/composeApp/src/androidMain/` | Android entry point, Compose activity |
| `kmp/composeApp/src/desktopMain/` | Desktop (macOS/Linux/Windows) entry point, Compose window |
| `vite.config.js` | Vite + React + PWA (auto-update service worker, manifest, icon config) |
| `Package.swift` | Swift Package manifest for TUI target and SwiftTUI dependency |

## Localization

All 25 languages share the same build. `src/i18n/strings.js` holds English as the source; missing keys in any locale fall back to English, so partial translations ship safely. Right-to-left languages (Arabic, Hebrew, Persian) get `dir="rtl"` on the root element. `Landing.jsx` shows a language picker; selection persists in localStorage.

## Listing generation

`generateListings` takes a place and coordinates, hashes them into a seed, and uses a seeded linear-congruential RNG to pick names, photos, prices, and counts deterministically. Two nearby cities produce different inventory; the same city always produces the same homes. Photos come from an Unsplash URL list. Prices are randomized within country-specific ranges (via `marketFor`). Property types (house/condo/townhouse) are picked randomly. Street names come from real Overpass data when available, otherwise invented.

## External services

- **Nominatim** (OpenStreetMap geocoding): worldwide place search, no API key. Respects 1 req/sec courtesy limit via debounced search box.
- **Overpass** (OSM street data): three mirrors (de, kumi.systems, osm.ch) queried in order; results cached 30 days in localStorage. Query caps bounding box to 0.25 degrees around place center to avoid multi-minute timeouts on large countries.
- **jaybulb-api** (Cloudflare Worker on D1): email/password accounts and optional user data.
- **Leaflet** (map rendering): open-source JS map library.

## Gotchas

- Address formatting (house number before or after street) varies by country. `formatAddress` checks a per-country set to get it right per locale.
- Map marker overlap at city zoom is real. `visibleForZoom` culls markers by a zoom-dependent cap, rejecting pills that would overlap at Web Mercator projection. Only pins that survive are rendered.
- Overpass queries can return stale data (servers are community-run and lag real edits). Ingesting them anyway: if streets fail to load, the generator invents addresses at the city centroid rather than stalling.
- Service worker caches the build for one load even after deploy. Verify new content with a hard reload or unregister the worker.
