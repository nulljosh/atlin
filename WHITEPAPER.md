# Atlin Technical Whitepaper

**v3.0.0** | August 2026

Browse homes anywhere on earth.

Atlin is a map of what's for sale or for rent, filters that narrow it, and
favourites that survive a reload. It exists because browsing homes abroad
usually means guessing at a foreign currency and a site that only half
translates, so every price renders in the local currency and every
label in the local language. React and Vite, no backend beyond the jaybulb-api Worker on Cloudflare, because nothing here needs a server to hold state that a browser can hold on its own.

## Problem

Every listings site optimizes for the brokerage, not the buyer, listings are
paginated behind lead-capture forms, the map is an afterthought, and filter
state resets on every navigation. Atlin inverts that: the map is the app, and
the filter state is the URL.

## Map and Listings

Leaflet with Zillow-style price-pill markers rather than generic pins, the
price is the thing a buyer scans for, so it renders in the marker instead of
in a popup that costs a click. Filters (price range, beds, property type, sort
order) narrow the same in-memory listing set that the map and list view share,
so the two can never disagree about what matches.

The dataset is 50 mock BC listings (Vancouver, Victoria, Kelowna) in
`src/data`. A real MLS/CREA feed is licensed per-brokerage and is the open
dependency before this holds live inventory; the mock set exists so the UI and
filter logic are finished and testable before that contract exists.

## Auth and Persistence

Accounts on jaybulb-api, a Cloudflare Worker with D1 (email + password, forgot-password flow, session persistence)
gates the profile and saved-search preferences. Favorites are deliberately
`localStorage`, not a database row: favoriting should work before signing in,
and a favorite is worth nothing to anyone but the person who set it.

## Design

Dark Editorial, flat backgrounds, no gradients, blue accent, `tokens.css`
shared with the portfolio design system, because a listings app should look
like a place to find a home, not like a brochure trying to sell you one.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite, PWA |
| Map | Leaflet |
| Auth | jaybulb-api (Cloudflare Worker, D1) |
| Data | Mock JSON (`src/data`), pending an MLS feed |

## License

MIT 2026, Joshua Trommel
