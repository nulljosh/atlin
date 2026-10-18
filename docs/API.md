# Brick API

Brick has one endpoint. `GET /api/listings?lat=&lng=&country=&city=&mode=sale|rent`
returns `{ listings, sources }` from the live feeds (RentCast, HousingFeed),
cached for a day. It returns an empty list when no feed covers
the place, and the client then shows labeled sample homes. Favourites live in `localStorage`; user accounts go straight to Supabase from
the browser (`src/lib/supabase.js`). The agent-facing interface is WebMCP.

## WebMCP

With the app open and signed in, brick registers tools on
`document.modelContext`. Source: `src/lib/webmcp.jsx`.

### Read-only

| Tool | Does |
|---|---|
| `search_listings` | Search listings. Omitted filters fall back to what's set in the UI. Args: `priceMin`, `priceMax`, `beds`, `propertyType`, `favoritesOnly`, `sort`, `limit` |
| `get_listing` | Full record for one listing, plus whether it's favourited |
| `get_favorites` | Every favourited listing |
| `get_filters` | The filters currently applied in the UI |

### Reversible writes

| Tool | Does |
|---|---|
| `toggle_favorite` | Add or remove a listing from favourites |
| `set_filters` | Apply filters to the UI so the user sees the same results |
| `reset_filters` | Clear filters back to defaults |
| `open_listing` | Navigate the app to a listing detail page |

Nothing here spends money or destroys data, so no tool requires confirmation.

Search shares `src/lib/filterListings.js` with the Listings page, so tool
results and the on-screen list can't drift apart.
