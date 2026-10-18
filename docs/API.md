# Atlin API

Everything is plain HTTP on https://atlin.jaybulb.com, no key needed.

## Listings

`GET /api/listings?lat=&lng=&country=&city=&mode=rent|sale&radius=`

Returns `{ listings, sources, modes }`. Each listing has `id`, `price`, `currency`, `beds`, `baths`, `sqft`, `type`, `address`, `city`, `photo`, `photos`, `lat`, `lng`, `listedDaysAgo`, `url`, and `priceWas` when the price dropped. Cached for a day. An empty list means no feed covers the place.

## Deals

`GET /api/deals?place=Vancouver&mode=rent&beds=2&maxPrice=2500&sort=deal&limit=10`

Or `?q=2 bed under 2500, best value` for plain words. Returns homes ranked by deal, the percent under the typical price for the same bedroom count.

## Ask

`POST /api/ask` with `{ "q": "2 bed under 2,500" }` returns the filters those words mean.

## MCP

`POST /mcp` speaks stateless MCP (JSON-RPC). Two tools:

| Tool | Does |
|---|---|
| `search_deals` | Listings for a place, ranked by deal. Args: `place`, `mode`, `beds`, `minPrice`, `maxPrice`, `type`, `sort`, `limit` |
| `ask_atlin` | The same search in plain words. Args: `place`, `question`, `mode`, `limit` |

Both live in `src/lib/tools.js`, shared with `/api/deals`.

## WebMCP

With the app open, `src/lib/webmcp.jsx` registers tools on `document.modelContext`.

| Kind | Tools |
|---|---|
| Read-only | `search_listings`, `get_listing`, `get_favorites`, `get_filters` |
| Reversible writes | `toggle_favorite`, `set_filters`, `reset_filters`, `open_listing` |

Nothing spends money or deletes data, so none asks for confirmation. Search shares `src/lib/filterListings.js` with the Listings page, so tool results match the screen.

## Accounts

Accounts live on jaybulb-api (`api.jaybulb.com`), called from `src/lib/spark.js`. The profile holds `favorites`, `searches`, `name` and `alerts`. Alerts are sent by `POST /functions/atlin-alerts` on that Worker, guarded by a secret and fired daily by GitHub Actions.
