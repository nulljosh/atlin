import { formatMoney, formatMoneyCompact, formatArea } from './market'

// Feed photos are full-size originals from the source sites, often a few MB.
// wsrv.nl resizes and re-encodes them on its CDN, so a card loads a ~40 KB WebP.
// ponytail: free third-party resizer. If it goes down, swap for Cloudflare
// Image Resizing on the zone.
// Managers upload "Free Rent!" graphics as the first photo; a graphic is not a home.
const promo = /promo|graphic|banner|free[-_ ]?rent|move[-_ ]?in|logo|flyer/i
export function cleanPhotos(l) {
  const photos = (l.photos?.length ? l.photos : [l.photo]).filter(u => u && !promo.test(u))
  return { ...l, photos, photo: photos[0] || null }
}

export function thumb(url, width) {
  if (!url || !/^https?:/.test(url)) return url
  const h = Math.round(width * 0.6875)
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&h=${h}&fit=cover&output=webp&q=72`
}

// One place decides how a listing's numbers read, so the card, the map pin and
// the detail page can never disagree about currency or units.
export function listingFormatters(listing, locale, t) {
  const suffix = listing.mode === 'rent' ? t('per_month') : ''
  return {
    price: formatMoney(listing.price, listing.currency, locale) + suffix,
    priceCompact: formatMoneyCompact(listing.price, listing.currency, locale) + suffix,
    area: listing.sqft > 0 ? formatArea(listing.sqft, listing.imperial, locale) : ''
  }
}
