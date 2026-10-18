# Atlin Technical Whitepaper

**v3.0.0** | October 2026

Atlin puts real homes for rent and for sale on a map, ranks them by how good a deal they are, and shows every price in the local currency and every label in your own language. It runs on the web, iPhone and Mac. The web app is React on Cloudflare Pages. The native app is one SwiftUI target. Both read the same listings endpoint.

## The deal score

The core of Atlin is one number: how far under the typical price a home sits. Atlin takes every home in the current search, groups them by bedroom count, and finds the median price in each group. A home's score is its percent under that median. Groups with fewer than three homes score zero, because there is nothing fair to compare against. A score over 60 percent is almost always a room share or a typo, so it is dropped. Rooms in shared houses never count against whole units.

This is a median of what is on screen, not a valuation model. It answers the question a renter actually asks, which is whether this one is cheap for what it is, here, today.

## Listings

`/api/listings` is a Pages Function that asks three sources at once and merges the answers.

- **Craigslist.** Private landlords with real photos, in every country Craigslist serves. Atlin picks the Craigslist area nearest the search and keeps photo posts within 40 km.
- **HousingFeed.** Rental buildings in 30 countries, through Apify. Billed per row, so results are cached for a day.
- **RentCast.** US homes for rent and for sale, when its key is set.

The same unit posted twice shows up once. Prices that cannot be real, under 300 a month or a sale under 50,000, are dropped.

## Price drops and alerts

The listings function remembers each home's price for 60 days. A home seen cheaper than before shows how much it dropped. Signed-in users can switch on a daily email: Atlin re-runs each saved search, and sends the new deals and drops it has not shown before. The first run only records what already exists, so nobody gets a flood.

## Photos

Property managers often upload an offer card ("1 month free rent") as the main photo. Atlin drops photos that look like ads by name, square 900 by 900 tiles, and PNG graphics. A photo shared by three or more different buildings is a logo and is dropped too. A photo shared by units in one building is that building's real exterior and stays. A home with no usable photo gets a grey street map of where it is, never a blank tile. Homes with photos rank first.

## Accounts

Browsing never needs an account. Signing in keeps saved homes in sync across web, iPhone and Mac. Accounts live on jaybulb-api, a Cloudflare Worker on D1, with email and password, Sign in with Apple and Google. Apple and Google send an ID token that the Worker checks against the provider's published keys. The iPhone app keeps its refresh token in the Keychain. Account deletion is one button.

## Design

Apple's rules, applied literally: the system font, an 8 point grid, 48 point capsule controls, cards at radius 28 and grouped lists at 20, one blue accent, true black in dark mode. The icon is a folded map with a pin, built in Icon Composer.

## Stack

| Layer | Tech |
|-------|------|
| Web | React, Vite, Leaflet, PWA, Cloudflare Pages |
| Native | SwiftUI, MapKit, iOS 17 and macOS 14 |
| Listings | Pages Functions, Craigslist, HousingFeed, RentCast, 24 hour KV cache |
| Accounts | jaybulb-api (Workers, D1), authmail on Resend |
| Agents | `/api/deals` and `/mcp` |

## License

MIT 2026, Joshua Trommel
