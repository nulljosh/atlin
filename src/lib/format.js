import { formatMoney, formatMoneyCompact, formatArea } from './market'

// A listing with no photo still gets a thumbnail: a street map of where it is.
// ponytail: Esri's free export endpoint, no key. Swap for our own tiles if it ever limits us.
export function staticMap(lat, lng, w = 640, h = 440, span = 0.009) {
  const dLat = (span * h / w) * Math.cos(lat * Math.PI / 180)
  const bbox = [lng - span / 2, lat - dLat / 2, lng + span / 2, lat + dLat / 2].map(n => n.toFixed(5)).join(',')
  return `https://server.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${w},${h}&imageSR=3857&format=jpg&f=image`
}

// Feed photos are full-size originals from the source sites, often a few MB.
// wsrv.nl resizes and re-encodes them on its CDN, so a card loads a ~40 KB WebP.
// ponytail: free third-party resizer. If it goes down, swap for Cloudflare
// Image Resizing on the zone.
// Managers upload "Free Rent!" graphics as the first photo; a graphic is not a home.
const promo = /promo|graphic|banner|free[-_ ]?rent|move[-_ ]?in|logo|flyer|incentive|\.png(\?|$)/i
// One photo reused by three or more homes is the building's ad or logo, not the home.
export function dropSharedPhotos(listings) {
  const seen = new Map()
  for (const l of listings) for (const u of new Set(l.photos || [])) seen.set(u, (seen.get(u) || 0) + 1)
  return listings.map(l => {
    const photos = (l.photos || []).filter(u => seen.get(u) < 3)
    return { ...l, photos, photo: photos[0] || null }
  })
}

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
