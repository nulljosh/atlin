import assert from 'node:assert/strict'
import { onRequest } from '../mcp.js'
import { onRequestGet } from './deals.js'

const rows = [1500, 1800, 2000, 2100, 2400, 3900].map((price, i) => ({
  id: `hf-${i}`, source: 'HousingFeed', address: `${i} Main St`, city: 'Vancouver', price, beds: 2, baths: 1, sqft: 700, type: 'condo',
  lat: 49.28, lng: -123.12, currency: 'CAD', countryCode: 'CA', listedDaysAgo: 1, mode: 'rent'
}))
const store = new Map()
const env = { BRICK_CACHE: { get: async k => store.get(k) ?? null, put: async (k, v) => store.set(k, v) }, APIFY_TOKEN: 't' }
globalThis.fetch = async url => {
  if (String(url).includes('nominatim')) return Response.json([{ lat: '49.28', lon: '-123.12', address: { city: 'Vancouver', country_code: 'ca' } }])
  return Response.json(rows.map(r => ({ id: r.id, street: r.address, city: r.city, rent_min: r.price, beds: r.beds, baths: 1, sqft_min: 700, lat: r.lat, lng: r.lng, property_type: 'condo' })))
}
const rpc = (method, params) => onRequest({ request: new Request('https://x.test/mcp', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }), env }).then(r => r.json())

assert.equal((await rpc('initialize', {})).result.serverInfo.name, 'brick')
assert.deepEqual((await rpc('tools/list')).result.tools.map(t => t.name), ['search_deals', 'ask_brick'])

const deals = (await rpc('tools/call', { name: 'search_deals', arguments: { place: 'Vancouver', beds: 2, limit: 3 } })).result.structuredContent
assert.equal(deals.listings.length, 3)
assert.equal(deals.listings[0].price, 1500, 'cheapest against the median is the best deal')
assert.ok(deals.listings[0].deal > deals.listings[2].deal)

const asked = (await rpc('tools/call', { name: 'ask_brick', arguments: { place: 'Vancouver', question: '2 bed under 2500' } })).result.structuredContent
assert.ok(asked.listings.every(l => l.price <= 2500))

assert.equal((await rpc('tools/call', { name: 'search_deals', arguments: {} })).result.isError, true, 'a bad call is a tool result, not a dead connection')
assert.equal((await rpc('nope')).error.code, -32601)

const res = await onRequestGet({ request: new Request('https://x.test/api/deals?place=Vancouver&maxPrice=2000'), env })
assert.ok((await res.json()).listings.every(l => l.price <= 2000))
assert.equal((await onRequestGet({ request: new Request('https://x.test/api/deals'), env })).status, 400)
console.log('tools + mcp: ok')
