import assert from 'node:assert/strict'
import { onRequestGet } from './listings.js'

const store = new Map()
const kv = { get: async k => store.get(k) ?? null, put: async (k, v) => store.set(k, v) }
// RentCast and HousingFeed are gone; with every feed failing, the endpoint still answers and caches.
let fetched = 0
globalThis.fetch = async () => { fetched++; return new Response('', { status: 404 }) }
const call = qs => onRequestGet({ request: new Request(`https://x.test/api/listings?${qs}`), env: { ATLIN_CACHE: kv } })
assert.equal((await call('lat=x&lng=1')).status, 400)
const first = await (await call('lat=52.5&lng=13.4&country=DE&city=Berlin&mode=sale')).json()
assert.deepEqual(first.listings, [], 'no feed answers, no homes, no crash')

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

// REW cards: everything but the coordinates comes off the area page.
{
  const { rewCards } = await import('./listings.js')
  const { readFileSync } = await import('node:fs')
  const cards = rewCards(readFileSync(new URL('./rew.fixture.html', import.meta.url), 'utf8'))
  assert.equal(cards.length, 2)
  const c = cards[0]
  assert.ok(c.url.startsWith('https://www.rew.ca/rentals/'))
  assert.ok(c.price > 500 && c.beds >= 0 && c.baths > 0 && c.sqft > 100, JSON.stringify(c))
  assert.ok(/, BC, /.test(c.title) && c.neighborhood && c.city === 'Vancouver' && c.kind)
  const blank = rewCards(`<article class='displaycard'><a href="https://www.rew.ca/rentals/1/x" title="1 Main St, Vancouver, BC, V1V 1V1"></a><div class='displaycard-title'>$2,000</div><img itemprop="image" src="https://assets.rew.ca/assets/placeholders/listing_xlarge-abc.png"></article>`)
  assert.equal(blank[0].photo, null, 'the no-photo placeholder is not a photo')
  console.log('rew cards: ok')
}

// Zillow pins: a home with hdpData, and an apartment building that only gives its cheapest plan.
{
  const { zillowRows } = await import('./listings.js')
  const p = { country: 'US', city: 'Austin', mode: 'rent', lat: 30.27, lng: -97.74 }
  const [b] = zillowRows(p, { plid: 'x1', detailUrl: '/apartments/austin-tx/lirica/CpXXHf/', price: '$2,206+/mo', address: '5211 E 7th St, Austin, TX', minBeds: 1, minBaths: 1, minArea: 691, latLong: { latitude: 30.25, longitude: -97.69 }, imgSrc: 'https://photos.zillowstatic.com/fp/a-p_e.jpg' })
  assert.deepEqual([b.price, b.beds, b.baths, b.sqft, b.type, b.address, b.id], [2206, 1, 1, 0, 'condo', '5211 E 7th St', 'zw-x1'], 'a building from-price cannot be paired with another plan’s minimum area')
  assert.equal(b.photo, 'https://photos.zillowstatic.com/fp/a-cc_ft_768.jpg')
  assert.equal(b.url, 'https://www.zillow.com/apartments/austin-tx/lirica/CpXXHf/')
  const [h] = zillowRows(p, { zpid: '5', price: '$1,415/mo', beds: 2, baths: 2, area: 1201, latLong: { latitude: 30.19, longitude: -97.83 }, hdpData: { homeInfo: { streetAddress: '8700 W Gate Blvd #24011', city: 'Austin', price: 1415, homeType: 'APARTMENT', daysOnZillow: 16 } } })
  assert.deepEqual([h.price, h.beds, h.type, h.listedDaysAgo], [1415, 2, 'condo', 16])
  assert.deepEqual(zillowRows(p, { price: '$900' }), [], 'no coordinates, no row')
  assert.deepEqual(zillowRows(p, { zpid: 'ad', price: '$550/mo', beds: 1, baths: 1, area: 717, address: 'Apply now, Austin, TX', latLong: { latitude: 30.2, longitude: -97.7 } }), [], 'an Apply now card is not a home')
  const soon = Date.now() + 864e5
  const [o] = zillowRows({ ...p, mode: 'sale' }, { zpid: '7', price: '$300K', latLong: { latitude: 30.2, longitude: -97.7 }, hdpData: { homeInfo: { price: 300000, openHouse: 'Sat. 11am-3pm', open_house_info: { open_house_showing: [{ open_house_start: 1, open_house_end: 2 }, { open_house_start: soon, open_house_end: soon + 36e5 }] } } } })
  assert.equal(o.openHouse, 'Sat. 11am-3pm')
  assert.deepEqual(o.openHouses, [[soon, soon + 36e5]], 'past showings are dropped')
  assert.equal(h.openHouse, undefined)
  console.log('zillow rows: ok')
}
