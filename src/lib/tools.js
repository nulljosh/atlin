// The two things an agent can do with Brick: search deals in a place, or ask in plain words.
// REST (/api/deals) and MCP (/mcp) both call this, so they cannot describe different behaviour.
// ponytail: the place is geocoded with Nominatim on every call; add a KV cache if it gets busy.

import { fetchListings } from '../../functions/api/listings.js'
import { filterListings } from './filterListings.js'
import { scoreDeals } from './deals.js'
import { parseAsk, sorts } from './ask.js'

export class ToolError extends Error {}

const SHAPE = ['id', 'address', 'city', 'price', 'currency', 'beds', 'baths', 'sqft', 'type', 'deal', 'listedDaysAgo', 'url', 'photo', 'lat', 'lng']
const pick = l => Object.fromEntries(SHAPE.map(k => [k, l[k] ?? null]))

async function geocode(place) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: place, format: 'jsonv2', limit: '1', addressdetails: '1' })}`
  const res = await fetch(url, { headers: { 'user-agent': 'brick (brick.jaybulb.com)' }, signal: AbortSignal.timeout(8000) })
  const hit = res.ok ? (await res.json())[0] : null
  if (!hit) throw new ToolError(`could not find a place called "${place}"`)
  const a = hit.address || {}
  return { name: a.city || a.town || a.village || a.municipality || place, lat: +hit.lat, lng: +hit.lon, country: (a.country_code || '').toUpperCase() }
}

export async function searchDeals(env, a) {
  if (typeof a.place !== 'string' || !a.place.trim()) throw new ToolError('place is required, for example "Vancouver"')
  const mode = a.mode === 'sale' ? 'sale' : 'rent'
  const where = await geocode(a.place.trim())
  const { body } = await fetchListings(env, { lat: where.lat, lng: where.lng, country: where.country, city: where.name, area: '', mode, radius: 15 })
  const num = v => (Number.isFinite(+v) && +v > 0 ? +v : null)
  const filters = {
    priceMin: num(a.minPrice) ?? 0,
    priceMax: num(a.maxPrice) ?? Infinity,
    beds: num(a.beds) ? Math.min(Math.floor(+a.beds), 4) : 0,
    propertyType: ['house', 'condo', 'townhouse'].includes(a.type) ? a.type : 'all',
    sort: sorts.includes(a.sort) ? a.sort : 'deal',
    favoritesOnly: false
  }
  const found = filterListings(scoreDeals(body.listings), filters)
  const limit = Math.min(Math.max(Math.floor(+a.limit) || 10, 1), 50)
  return { place: where.name, mode, total: found.length, sources: body.sources, listings: found.slice(0, limit).map(pick) }
}

export async function askBrick(env, a) {
  if (typeof a.question !== 'string' || !a.question.trim()) throw new ToolError('question is required, for example "2 bed under 2500, best value"')
  const f = parseAsk(a.question)
  return { understood: f, ...(await searchDeals(env, { place: a.place, mode: a.mode, minPrice: f.priceMin, maxPrice: f.priceMax, beds: f.beds, type: f.propertyType, sort: f.sort, limit: a.limit })) }
}

const place = { type: 'string', description: 'City or neighbourhood, e.g. "Vancouver" or "Kitsilano, Vancouver".' }
const mode = { type: 'string', enum: ['rent', 'sale'], description: 'Default rent. Sale only works where a sale feed is switched on (US).' }

export const TOOLS = [
  {
    name: 'search_deals',
    description: 'Search live home listings in a place, ranked by deal score (percent under the typical price for the same bedroom count). Prices are in the local currency.',
    inputSchema: {
      type: 'object',
      properties: {
        place, mode,
        beds: { type: 'number', description: 'Minimum bedrooms, 1 to 4.' },
        minPrice: { type: 'number' }, maxPrice: { type: 'number' },
        type: { type: 'string', enum: ['house', 'condo', 'townhouse'] },
        sort: { type: 'string', enum: sorts, description: 'Default deal.' },
        limit: { type: 'number', description: 'Default 10, max 50.' }
      },
      required: ['place']
    }
  },
  {
    name: 'ask_brick',
    description: 'Same search, in plain words: "2 bed under 2500, best value".',
    inputSchema: { type: 'object', properties: { place, mode, question: { type: 'string' }, limit: { type: 'number' } }, required: ['place', 'question'] }
  }
]

export async function callTool(env, name, args) {
  if (name === 'search_deals') return searchDeals(env, args)
  if (name === 'ask_brick') return askBrick(env, args)
  return null
}
