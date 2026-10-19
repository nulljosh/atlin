import assert from 'node:assert/strict'
import { onRequestGet } from './listings.js'

const store = new Map()
const kv = { get: async k => store.get(k) ?? null, put: async (k, v) => store.set(k, v) }
globalThis.fetch = async url => {
  assert.match(String(url), /api\.rentcast\.io\/v1\/listings\/sale/)
  return Response.json([
    { id: 'a/1', addressLine1: '1 Main St', city: 'Austin', price: 500000, bedrooms: 3, bathrooms: 2, squareFootage: 1800, propertyType: 'Condo', latitude: 30.2, longitude: -97.7, daysOnMarket: 4 },
    { id: 'bad', price: 1 }
  ])
}

const call = qs => onRequestGet({ request: new Request(`https://x.test/api/listings?${qs}`), env: { RENTCAST_KEY: 'k', ATLIN_CACHE: kv } })

const ok = await (await call('lat=30.2&lng=-97.7&country=US&city=Austin&mode=sale')).json()
assert.equal(ok.listings.length, 1, 'rows without coordinates are dropped')
assert.equal(ok.listings[0].type, 'condo')
assert.equal(ok.listings[0].currency, 'USD')
assert.equal(ok.listings[0].id, 'rc-a_1', 'ids are url safe')

const none = await (await call('lat=52.5&lng=13.4&country=DE&city=Berlin&mode=sale')).json()
assert.deepEqual(none.listings, [], 'no provider covers DE without keys for it')

assert.equal((await call('lat=x&lng=1')).status, 400)

// A second ask for the same city is served from the cache, not the paid feed.
let paid = 0
globalThis.fetch = async () => { paid++; return Response.json([]) }
await call('lat=30.2&lng=-97.7&country=US&city=Austin&mode=sale')
assert.equal(paid, 0, 'cached city does not hit the feed again')
// A neighbourhood the feed does not index falls back to its town, nearest first.
const asked = []
globalThis.fetch = async (url, init) => {
  const { city } = JSON.parse(init.body)
  asked.push(city)
  if (city !== 'Langley') return Response.json([])
  return Response.json([
    { id: 'far', lat: 49.3, lng: -123.1, rent_min: 2000, city: 'Langley' },
    ...[1, 2, 3, 4, 5].map(i => ({ id: `n${i}`, lat: 49.08 + i / 1000, lng: -122.64, rent_min: 1500 + i, city: 'Langley' }))
  ])
}
const near = await (await onRequestGet({
  request: new Request('https://x.test/api/listings?lat=49.08&lng=-122.64&country=CA&city=Brookswood&area=Township%20of%20Langley&mode=rent'),
  env: { APIFY_TOKEN: 't', ATLIN_CACHE: kv }
})).json()
assert.deepEqual(asked, ['Brookswood', 'Langley'])
assert.equal(near.listings[0].id, 'hf-n1', 'nearest first')
assert.ok(!near.listings.some(l => l.id === 'hf-far'), 'homes 30+ km away are dropped')

console.log('listings api: ok')

// Price history: one point per change, priceWas only while the price sits below an older one.
{
  const { trackPrice } = await import('./listings.js')
  let t = trackPrice(undefined, 2000, 100)
  assert.equal(t.history, null, 'a first sighting has no history')
  assert.equal(t.priceWas, 0)
  t = trackPrice(t.entry, 2000, 101)
  assert.equal(t.history, null, 'an unchanged price adds no point')
  t = trackPrice(t.entry, 1900, 102)
  assert.equal(t.priceWas, 2000)
  assert.deepEqual(t.history, [[100, 2000], [102, 1900]])
  t = trackPrice(t.entry, 1900, 103)
  assert.equal(t.priceWas, 2000, 'a drop stays flagged while the price holds')
  assert.equal(t.history.length, 2)
  t = trackPrice(t.entry, 1950, 104)
  assert.equal(t.priceWas, 0, 'a rise clears the drop')
  assert.equal(t.history.length, 3)
  // Entries written before the series existed: [lastPrice, dropFrom].
  assert.deepEqual(trackPrice([1800, 2000], 1800, 50).history, [[49, 2000], [50, 1800]])
  assert.deepEqual(trackPrice([1800, 0], 1700, 50).history, [[49, 1800], [50, 1700]])
  assert.equal(trackPrice([1800, 0], 1800, 50).history, null)
  let e
  for (let d = 0; d < 20; d++) e = trackPrice(e?.entry, 1000 + d, d)
  assert.equal(e.history.length, 12, 'capped at 12 changes')
  console.log('price history: ok')
}
