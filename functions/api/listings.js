import { marketFor } from '../../src/lib/market.js'

// Live listings proxy. Keys live in Pages env vars, never in the bundle.
// Each provider is skipped when its key is missing or it does not cover the
// place, so the client falls back to sample homes only when this returns none.
// ponytail: one entry per provider in PROVIDERS; idealista
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

// Zillow (US, rent and sale) through an Apify actor. Joshua chose to carry it knowing Zillow's
// terms forbid scraping; it stays off until env.ZILLOW is "on". Runs are billed per home, and
// Apify stops the run at the timeout, so a slow search costs what it found, not a full run.
async function zillowRaw(env, p) {
  if (!env.APIFY_TOKEN || p.country !== 'US') return []
  const d = 0.08
  const filterState = p.mode === 'rent'
    ? { fr: { value: true }, fsba: { value: false }, fsbo: { value: false }, nc: { value: false }, cmsn: { value: false }, auc: { value: false }, fore: { value: false } }
    : {}
  const state = { isMapVisible: true, mapBounds: { north: p.lat + d, south: p.lat - d, east: p.lng + d * 1.4, west: p.lng - d * 1.4 }, filterState }
  const url = `https://www.zillow.com/homes/for_${p.mode === 'rent' ? 'rent' : 'sale'}/?searchQueryState=${encodeURIComponent(JSON.stringify(state))}`
  const res = await fetch(`https://api.apify.com/v2/acts/maxcopell~zillow-scraper/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}&timeout=22`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ searchUrls: [{ url }], resultsLimit: 40 }),
    signal: AbortSignal.timeout(25000)
  })
  if (!res.ok) throw new Error(`zillow ${res.status} ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

const money = v => num(String(v ?? '').replace(/[^\d.]/g, ''))

export function zillowRow(p, r) {
  const h = r.hdpData?.homeInfo || {}
  const unit = r.units?.[0] || {}
  const lat = r.latLong?.latitude ?? h.latitude, lng = r.latLong?.longitude ?? h.longitude
  const price = num(r.unformattedPrice) || num(h.price) || money(r.price) || money(unit.price)
  if (!lat || !lng || !price) return null
  const address = r.addressStreet || r.address || h.streetAddress || ''
  const photos = (r.carouselPhotos?.map(x => x.url) || [r.imgSrc]).filter(u => u && !promo.test(u))
  const link = r.detailUrl ? (r.detailUrl.startsWith('http') ? r.detailUrl : `https://www.zillow.com${r.detailUrl}`) : null
  return shape(p, p.mode, {
    id: `zw-${r.zpid || r.id || `${lat},${lng}`}`.replace(/[^\w-]/g, '_'),
    source: 'Zillow', url: link,
    address, neighborhood: r.addressCity || h.city || p.city, city: r.addressCity || h.city || p.city,
    price,
    beds: num(r.beds ?? h.bedrooms ?? unit.beds), baths: num(r.baths ?? h.bathrooms), sqft: num(r.area ?? h.livingArea),
    type: typeOf(h.homeType || r.statusText || '', address),
    lat, lng,
    photo: photos[0] || null, photos,
    listedDaysAgo: Number.isFinite(h.daysOnZillow) ? h.daysOnZillow : 30
  })
}

async function zillow(env, p) {
  if (env.ZILLOW !== 'on') return []
  return (await zillowRaw(env, p)).map(r => zillowRow(p, r)).filter(Boolean)
}

// REW.ca rentals (BC and Alberta), read from its public area pages: price, address, beds, baths,
// size, type and photo per card, two pages a town. The cards carry no coordinates, so each street
// address is geocoded once through Photon and kept in KV. Off until env.REW is "on".
const REW_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'
const text = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()

export function rewCards(html) {
  return html.split("<article class='displaycard'").slice(1).map(a => {
    const href = a.match(/href="(https:\/\/www\.rew\.ca\/rentals\/(\d+)\/[^"]+)"/)
    const title = a.match(/title="([^"]+)"/)?.[1]
    const price = money(a.match(/displaycard-title'>([^<]+)</)?.[1])
    if (!href || !title || !price) return null
    const lists = [...a.matchAll(/<ul class='inlinelist'>(.*?)<\/ul>/g)].map(m => [...m[1].matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(x => text(x[1])))
    const facts = lists.find(l => l.some(x => / bd$| ba$| sf$/.test(x))) || []
    const fact = suffix => num(facts.find(x => x.endsWith(suffix))?.replace(/[^\d.]/g, ''))
    const wraps = [...a.matchAll(/displaycard-wrap'>([^<]+)</g)].map(m => text(m[1]))
    return {
      id: href[2], url: href[1], title: text(title), price,
      neighborhood: lists[0]?.[0] || '', city: lists[0]?.[1] || '',
      beds: fact(' bd'), baths: fact(' ba'), sqft: fact(' sf'), kind: wraps[1] || '',
      photo: a.match(/<img itemprop="image"[^>]*src="([^"?]+)/)?.[1] || null
    }
  }).filter(Boolean)
}

async function geocode(env, address, near) {
  const k = `g/${address.toLowerCase()}`
  const hit = await env.ATLIN_CACHE?.get(k, 'json')
  if (hit) return hit
  const res = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams({ q: address, limit: '1', lat: near.lat, lon: near.lng })}`, { signal: AbortSignal.timeout(8000) })
  const c = res.ok ? (await res.json()).features?.[0]?.geometry?.coordinates : null
  const at = c ? { lat: c[1], lng: c[0] } : null
  if (at) await env.ATLIN_CACHE?.put(k, JSON.stringify(at), { expirationTtl: 365 * 864e2 })
  return at
}

export async function rewRaw(env, p) {
  if (p.country !== 'CA' || p.mode !== 'rent' || !p.city) return []
  const town = townName(p.area || p.city).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  for (const prov of ['bc', 'ab']) {
    const pages = await Promise.all(['', '/page/2'].map(async page => {
      const res = await fetch(`https://www.rew.ca/rentals/areas/${town}-${prov}${page}`, { headers: { 'user-agent': REW_UA }, signal: AbortSignal.timeout(10000) })
      return res.ok ? rewCards(await res.text()) : []
    }))
    const cards = pages.flat()
    if (cards.length) return cards
  }
  return []
}

async function rew(env, p) {
  if (env.REW !== 'on') return []
  const cards = await rewRaw(env, p)
  const rows = await Promise.all(cards.map(async c => {
    // "401-1331 Alberni Street, Vancouver, BC, V6E 4S1": the unit number does not geocode.
    const at = await geocode(env, c.title.replace(/^[^,\s]+-(?=\d)/, ''), p).catch(() => null)
    if (!at || km(at, p) > 40) return null
    return shape(p, 'rent', {
      id: `rew-${c.id}`, source: 'REW', url: c.url,
      address: c.title.split(',')[0], neighborhood: c.neighborhood, city: c.city || p.city,
      price: c.price, beds: c.beds, baths: c.baths, sqft: c.sqft,
      type: typeOf(c.kind, c.title), lat: at.lat, lng: at.lng,
      photo: c.photo, photos: c.photo ? [c.photo] : [], listedDaysAgo: 7
    })
  }))
  return rows.filter(Boolean)
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

// Craigslist: private landlords with real photos, every country it serves.
// Read through the same JSON search craigslist.org's own pages use, nearest
// area to the place, photo posts only. Rows are positional; tag 4 is images,
// 5 is [beds, sqft], 6 the slug, 13 the uuid; the title is the last plain string.
// ponytail: unofficial endpoint, no key. If it changes shape this provider
// returns [] and the others carry on.
const CL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
async function craigslist(env, p) {
  const areas = await (await fetch('https://reference.craigslist.org/Areas', { cf: { cacheTtl: 86400, cacheEverything: true }, signal: AbortSignal.timeout(8000) })).json()
  const near = areas.map(a => ({ a, d: km(p, { lat: a.Latitude, lng: a.Longitude }) })).sort((x, y) => x.d - y.d)[0]
  if (!near || near.d > 150) return []
  const q = new URLSearchParams({ batch: `${near.a.AreaID}-0-360-0-0`, cc: 'US', lang: 'en', searchPath: p.mode === 'rent' ? 'apa' : 'rea', hasPic: '1' })
  const res = await fetch(`https://sapi.craigslist.org/web/v8/postings/search/full?${q}`, { headers: { 'User-Agent': CL_UA }, signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`craigslist ${res.status}`)
  const { decode, items } = (await res.json()).data
  return items.map(item => {
    const [idOff, dateOff, , price, geo] = item
    const title = item.slice(5).filter(x => typeof x === 'string').pop() || ''
    let uuid, slug, images = [], beds = 0, sqft = 0
    for (const f of item.slice(6)) {
      if (!Array.isArray(f)) continue
      if (f[0] === 4) images = f.slice(1)
      if (f[0] === 5) { beds = num(f[1]); sqft = num(f[2]) }
      if (f[0] === 6) slug = f[1]
      if (f[0] === 13) uuid = f[1]
    }
    const [idx, lat, lng] = typeof geo === 'string' ? geo.split('~') : []
    const where = (decode.locationDescriptions?.[Number(String(idx).split(':')[1])] || near.a.ShortDescription).replace(/^city of /i, '').replace(/\b\w/g, c => c.toUpperCase())
    const photos = images.map(t => `https://images.craigslist.org/${t.replace(/^\d+:/, '')}_600x450.jpg`)
    return shape(p, p.mode, {
      id: `cl-${decode.minPostingId + idOff}`,
      source: 'Craigslist',
      url: uuid && slug ? `https://www.craigslist.org/view/d/${slug}/${uuid}` : null,
      address: title, neighborhood: where, city: p.city || where,
      price, beds, baths: 0, sqft,
      type: typeOfRaw(title),
      lat: +lat, lng: +lng,
      photo: photos[0] || null, photos,
      listedDaysAgo: Math.max(0, Math.round((Date.now() / 1000 - (decode.minPostedDate + dateOff)) / 86400))
    })
  })
    // Under 300 a month is a parking spot or a weekly room; under 50k is not a home for sale.
    .filter(l => l.price >= (p.mode === 'rent' ? 300 : 50000) && Number.isFinite(l.lat) && Number.isFinite(l.lng) && km(p, l) <= 40)
    .sort((a, b) => km(p, a) - km(p, b))
    .slice(0, 120)
}

const PROVIDERS = [rentcast, housingfeedNear, craigslist, zillow, rew]

// Shared by /api/listings, /api/deals and /mcp, so the three can never disagree.
export async function fetchListings(env, p) {
  const key = `v5/${p.country}/${p.city}/${p.area}/${p.lat.toFixed(1)}/${p.lng.toFixed(1)}/${p.mode}`.toLowerCase()
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
  const modes = ['rent', 'sale']
  // One unit re-posted by several sources shows up once.
  const seen = new Set()
  const unique = out.filter(l => {
    const k = [l.address, l.price, l.beds, l.sqft].join('|').toLowerCase()
    return !seen.has(k) && seen.add(k)
  })
  // Price drops and history: remember each home's prices per place, one point per change.
  const hist = (await env.ATLIN_CACHE?.get(`h/${key}`, 'json')) || {}
  const next = {}
  const day = Math.floor(Date.now() / 864e5)
  for (const l of unique) {
    const t = trackPrice(hist[l.id], l.price, day)
    if (t.priceWas) l.priceWas = t.priceWas
    if (t.history) l.priceHistory = t.history
    next[l.id] = t.entry
  }
  if (unique.length) await env.ATLIN_CACHE?.put(`h/${key}`, JSON.stringify(next), { expirationTtl: 60 * 864e2 })
  const body = { listings: unique, sources, modes }
  // Errors and empty answers are not cached for long, so a feed hiccup heals itself.
  if (unique.length) await env.ATLIN_CACHE?.put(key, JSON.stringify(body), { expirationTtl: TTL })
  return { body, ttl: unique.length ? TTL : 300 }
}

// prev is the KV entry [lastPrice, dropFrom, series], series as [day, price] pairs (days since 1970).
// The listing gets priceWas when it fell, and priceHistory once it has changed price at least once.
// ponytail: the last 12 changes; entries written before the series existed start one from what they remember.
export function trackPrice(prev, price, day) {
  const [was, drop, series] = prev || []
  const priceWas = was && price < was ? was : was && price === was && drop ? drop : 0
  const seed = was && was !== price ? was : drop
  let s = series || (seed ? [[day - 1, seed]] : [])
  if (!s.length || s[s.length - 1][1] !== price) s = [...s, [day, price]].slice(-12)
  return { entry: [price, priceWas, s], priceWas, history: s.length > 1 ? s : null }
}

export const placeParams = q => ({
  lat: +q.get('lat'), lng: +q.get('lng'),
  country: (q.get('country') || '').toUpperCase(),
  city: q.get('city') || '',
  area: q.get('area') || '',
  mode: q.get('mode') === 'rent' ? 'rent' : 'sale',
  radius: Math.min(+q.get('radius') || 15, 50)
})

const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('')

export async function onRequestGet({ request, env }) {
  const p = placeParams(new URL(request.url).searchParams)
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return Response.json({ error: 'lat and lng required' }, { status: 400 })
  // Setup only: the key whose sha256 matches runs one Zillow search uncached and shows what came back.
  const probe = new URL(request.url).searchParams.get('zillowProbe')
  if (probe && await sha256(probe) === '27ed71adc5426382b3235fd98661c9a874f64574d1adec1123c8444671e69c52') {
    const t = Date.now()
    if (new URL(request.url).searchParams.get('source') === 'rew') {
      try {
        const rows = await rew({ ...env, REW: 'on' }, p)
        return Response.json({ ms: Date.now() - t, cards: (await rewRaw(env, p)).length, rows: rows.length, first: rows[0] })
      } catch (e) {
        return Response.json({ ms: Date.now() - t, error: e.message })
      }
    }
    try {
      const raw = await zillowRaw(env, p)
      return Response.json({ ms: Date.now() - t, count: raw.length, mapped: raw.map(r => zillowRow(p, r)).filter(Boolean).length, first: raw[0], firstMapped: raw[0] && zillowRow(p, raw[0]) })
    } catch (e) {
      return Response.json({ ms: Date.now() - t, error: e.message })
    }
  }
  const { body, ttl } = await fetchListings(env, p)
  return Response.json(body, { headers: { 'cache-control': `public, max-age=${ttl}` } })
}
