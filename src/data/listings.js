import { marketFor } from '../lib/market.js'

// Listings are generated for whatever place the user is browsing, seeded by
// that place's coordinates, so the same city always yields the same homes.
// ponytail: generated inventory. The shape matches what an MLS/IDX feed would
// return, so swapping in a real feed is a change to one function.

export const photos = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1598228723793-52759bba239c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=400&fit=crop'
]

export const propertyTypes = ['house', 'condo', 'townhouse']

// Where the house number goes. Most of continental Europe and much of Asia put
// it after the street name; the anglosphere puts it first.
const numberAfterStreet = new Set([
  'DE', 'AT', 'CH', 'NL', 'BE', 'LU', 'SE', 'NO', 'DK', 'FI', 'IS', 'PL', 'CZ', 'SK',
  'HU', 'RO', 'BG', 'RS', 'HR', 'SI', 'GR', 'IT', 'ES', 'PT', 'TR', 'RU', 'UA', 'EE',
  'LV', 'LT', 'BR', 'AR', 'CL', 'CO', 'PE', 'MX', 'ID', 'VN', 'NP', 'JP', 'CN', 'TW', 'KR'
])

function formatAddress(number, street, countryCode) {
  return numberAfterStreet.has(countryCode) ? `${street} ${number}` : `${number} ${street}`
}

function seededRandom(seed) {
  let s = Math.abs(Math.trunc(seed)) % 2147483646 || 1
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Two places 100m apart should not produce identical inventory.
function seedFor(place) {
  return Math.round((place.lat + 90) * 1e4) * 100003 + Math.round((place.lng + 180) * 1e4)
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)]

// How wide to scatter homes when Overpass gave us no streets. Kept near the
// centroid, which is always on land, because a wider scatter drops homes into
// the sea for any coastal city.
// ponytail: no land mask. A real one needs coastline polygons or a water query;
// the street anchors are on land by construction, so this only has to cover the
// degraded path, which the UI already labels as approximate.
/**
 * @param place  from geo.js — needs lat/lng/name/countryCode
 * @param streets real streets from Overpass; none means no sample homes
 * @param mode   'sale' | 'rent'
 */
export function generateListings(place, streets = [], mode = 'sale', count = 60) {
  const market = marketFor(place.countryCode)
  const rand = seededRandom(seedFor(place) + (mode === 'rent' ? 7919 : 0))
  const listings = []
  // Base value of a mid-market home in this country, before size/type.
  const base = 400000 * market.level

  // Without real streets there is no telling land from water, so no sample homes at all:
  // the page says nothing is listed instead of dropping pins in the sea.
  if (!streets.length) return []
  for (let i = 0; i < count; i++) {
    const type = pick(rand, propertyTypes)
    const anchor = pick(rand, streets)
    const street = anchor.name
    // About a block either side of a real named street.
    const jitter = 0.004

    let beds, baths, sqft, sizeFactor
    if (type === 'house') {
      beds = Math.floor(rand() * 4) + 2
      baths = Math.floor(rand() * 3) + 1
      sqft = Math.floor(rand() * 2000) + 1200
      sizeFactor = 1.6
    } else if (type === 'condo') {
      beds = Math.floor(rand() * 3) + 1
      baths = Math.max(1, Math.round(beds / 2))
      sqft = Math.floor(rand() * 800) + 450
      sizeFactor = 0.8
    } else {
      beds = Math.floor(rand() * 3) + 2
      baths = Math.floor(rand() * 2) + 1
      sqft = Math.floor(rand() * 1200) + 800
      sizeFactor = 1.15
    }

    const spread = 0.6 + rand() * 0.9
    const value = base * sizeFactor * spread
    // Rent is the same asset priced by yield, so a market's rents track its
    // sale prices instead of being invented separately.
    const price = mode === 'rent'
      ? roundTo(value * market.grossYield / 12, 10)
      : roundTo(value, 1000)

    listings.push({
      id: `${place.id}-${mode}-${i}`,
      address: formatAddress(Math.floor(rand() * 220) + 1, street, market.countryCode),
      neighborhood: street,
      city: place.name,
      countryCode: market.countryCode,
      currency: market.currency,
      imperial: market.imperial,
      mode,
      price,
      beds,
      baths,
      sqft,
      type,
      lat: anchor.lat + (rand() - 0.5) * jitter,
      lng: anchor.lng + (rand() - 0.5) * jitter,
      year: Math.floor(rand() * 60) + 1965,
      photo: photos[i % photos.length],
      photos: [photos[i % photos.length], photos[(i + 3) % photos.length], photos[(i + 7) % photos.length]],
      listedDaysAgo: Math.floor(rand() * 30) + 1,
      refNumber: `R${100000 + Math.floor(rand() * 899999)}`
    })
  }

  return listings
}

function roundTo(n, step) {
  return Math.max(step, Math.round(n / step) * step)
}
