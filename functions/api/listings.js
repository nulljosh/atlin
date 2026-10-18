import { marketFor } from '../../src/lib/market.js'

// Live listings proxy. Keys live in Pages env vars, never in the bundle.
// Each provider is skipped when its key is missing or it does not cover the
// place, so the client falls back to sample homes only when this returns none.
// ponytail: two providers. Add one by adding an entry to PROVIDERS; idealista
// (Spain/Italy/Portugal) is approval-gated, Repliers/SimplyRETS need a broker.

// Rentals turn over in days, and every fresh lookup is billed per home (about
// $2 per 1,000 on Apify's free plan), so a day of cache is the right trade.
const TTL = 24 * 3600
const SQM = 10.7639

// Feeds rarely say what kind of home it is, but a unit number in front of the
// street number ("319 20769 Fraser Hwy") or a suite word means an apartment.
const unitLike = /\b(suite|bsmt|basement|unit|apt|apartment|#)|^\s*[a-z]?\d+[a-z]?\s+\d{3,}/i
const typeOf = (s, address = '') => (unitLike.test(address) && !/town|row/i.test(s) ? 'condo' : typeOfRaw(s))
const typeOfRaw = s => (/condo|apart|flat|studio|unit/i.test(s) ? 'condo' : /town|terrace|row/i.test(s) ? 'townhouse' : 'house')
const num = n => (Number.isFinite(+n) ? +n : 0)
const days = d => (d ? Math.max(0, Math.round((Date.now() - Date.parse(d)) / 864e5)) : 30)

function shape(place, mode, x) {
  const m = marketFor(place.country)
  return {
    mode, currency: m.currency, imperial: m.imperial, countryCode: m.countryCode,
    photo: null, photos: [], year: null, refNumber: '',
    ...x
  }
}

async function rentcast(env, p) {
  if (!env.RENTCAST_KEY || p.country !== 'US') return []
  const path = p.mode === 'rent' ? 'rental/long-term' : 'sale'
  const url = `https://api.rentcast.io/v1/listings/${path}?latitude=${p.lat}&longitude=${p.lng}&radius=${p.radius}&status=Active&limit=100`
  const res = await fetch(url, { headers: { 'X-Api-Key': env.RENTCAST_KEY }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`rentcast ${res.status}`)
  return (await res.json()).filter(r => r.latitude && r.longitude && r.price).map(r => shape(p, p.mode, {
    id: `rc-${r.id}`.replace(/[^\w-]/g, '_'),
    source: 'RentCast',
    address: r.addressLine1 || r.formattedAddress,
    neighborhood: r.city, city: r.city,
    price: r.price, beds: num(r.bedrooms), baths: num(r.bathrooms), sqft: num(r.squareFootage),
    type: typeOf(r.propertyType),
    lat: r.latitude, lng: r.longitude,
    year: r.yearBuilt || null, listedDaysAgo: r.daysOnMarket ?? days(r.listedDate),
    refNumber: r.listingAgent?.name || ''
  }))
}

// Rent only, 30 countries, run through Apify. Slow and billed per row, so it
// is capped and the whole response is cached below.
async function housingfeed(env, p) {
  if (!env.APIFY_TOKEN || p.mode !== 'rent' || !p.city) return []
  // HousingFeed says UK where ISO says GB.
  const country = p.country === 'GB' ? 'UK' : p.country
  const url = `https://api.apify.com/v2/acts/housingfeed~rental-listings-api/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ country, city: p.city, maxItems: 60 }),
    signal: AbortSignal.timeout(25000)
  })
  // 400 is how it answers a country outside its list: not covered, not broken.
  if (res.status === 400) return []
  if (!res.ok) throw new Error(`housingfeed ${res.status}`)
  return (await res.json()).filter(r => r.lat && r.lng && (r.rent_min || r.rent_max)).map(r => {
    // Property managers upload promo graphics ("Free Rent!") as the first photo; a graphic is not a home.
    const photos = (r.images?.length ? r.images : [r.image]).filter(u => u && !promo.test(u))
    return shape(p, 'rent', {
      id: `hf-${r.id || r.listing_id}`.replace(/[^\w-]/g, '_'),
      source: 'HousingFeed', url: r.url,
      address: r.street || r.address,
      neighborhood: r.city, city: r.city,
      currency: r.currency || undefined,
      price: r.rent_min || r.rent_max,
      beds: num(r.beds), baths: num(r.baths), sqft: num(r.sqft_min || r.sqft_max),
      type: typeOf(r.property_type || '', r.street || r.address),
      lat: r.lat, lng: r.lng,
      photo: photos[0] || null, photos,
      listedDaysAgo: days(r.first_seen_at)
    })
  })
}

const promo = /promo|graphic|banner|free[-_ ]?rent|move[-_ ]?in|logo|flyer|incentive|\.png(\?|$)/i

// "Township of Langley" -> "Langley".
const townName = s => s.replace(/^(township|city|district|town|municipality|village) of /i, '').replace(/ (township|city|district)$/i, '').trim()

function km(a, b) {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.hypot(x, y) * 6371
}

// The feed indexes by town, so a neighbourhood search (Brookswood) comes back
// empty. Ask for the neighbourhood, then its town, keep what is within reach,
// nearest first.
async function housingfeedNear(env, p) {
  const names = [...new Set([p.city, townName(p.area)].filter(Boolean))]
  let rows = []
  for (const city of names) {
    rows = await housingfeed(env, { ...p, city })
    if (rows.length >= 5) break
  }
  return rows
    .map(l => ({ l, d: km(p, l) }))
    .filter(x => x.d <= 40)
    .sort((a, b) => a.d - b.d)
    .map(x => x.l)
}

const PROVIDERS = [rentcast, housingfeedNear]

// Shared by /api/listings, /api/deals and /mcp, so the three can never disagree.
export async function fetchListings(env, p) {
  const key = `v2/${p.country}/${p.city}/${p.area}/${p.lat.toFixed(1)}/${p.lng.toFixed(1)}/${p.mode}`.toLowerCase()
  const hit = await env.ATLIN_CACHE?.get(key)
  if (hit) return { body: JSON.parse(hit), ttl: TTL }

  const sources = {}
  const out = (await Promise.all(PROVIDERS.map(async fn => {
    try {
      const rows = await fn(env, p)
      if (rows.length) sources[rows[0].source] = rows.length
      return rows
    } catch (e) {
      sources[fn.name] = `error: ${e.message}`
      return []
    }
  }))).flat()

  // Lets the native app hide Buy until a sale feed is switched on.
  const modes = env.RENTCAST_KEY ? ['rent', 'sale'] : ['rent']
  // One unit re-posted by several sources shows up once.
  const seen = new Set()
  const unique = out.filter(l => {
    const k = [l.address, l.price, l.beds, l.sqft].join('|').toLowerCase()
    return !seen.has(k) && seen.add(k)
  })
  const body = { listings: unique, sources, modes }
  // Errors and empty answers are not cached for long, so a feed hiccup heals itself.
  if (unique.length) await env.ATLIN_CACHE?.put(key, JSON.stringify(body), { expirationTtl: TTL })
  return { body, ttl: unique.length ? TTL : 300 }
}

export const placeParams = q => ({
  lat: +q.get('lat'), lng: +q.get('lng'),
  country: (q.get('country') || '').toUpperCase(),
  city: q.get('city') || '',
  area: q.get('area') || '',
  mode: q.get('mode') === 'rent' ? 'rent' : 'sale',
  radius: Math.min(+q.get('radius') || 15, 50)
})

export async function onRequestGet({ request, env }) {
  const p = placeParams(new URL(request.url).searchParams)
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return Response.json({ error: 'lat and lng required' }, { status: 400 })
  const { body, ttl } = await fetchListings(env, p)
  return Response.json(body, { headers: { 'cache-control': `public, max-age=${ttl}` } })
}
