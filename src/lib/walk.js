// A walk score from OpenStreetMap: what sits within 800 m (about a 10 minute walk).
// ponytail: counts, caps and weights, not Walk Score's distance decay. Good enough to
// tell a downtown flat from a cul-de-sac; swap in decay if people compare it to theirs.

// [key, Overpass filter (or a list of them, unioned), cap, weight]. Mirrored in ios/Sources/Walk.swift.
export const WALK = [
  ['groceries', '[shop~"^(supermarket|convenience|greengrocer|bakery|butcher)$"]', 3, 0.25],
  ['food', '[amenity~"^(restaurant|cafe|fast_food|pub|bar)$"]', 10, 0.2],
  ['transit', ['[highway=bus_stop]', '[railway~"^(station|tram_stop|subway_entrance)$"]'], 6, 0.2],
  ['errands', '[amenity~"^(pharmacy|bank|post_office|library|clinic|doctors)$"]', 5, 0.15],
  ['parks', '[leisure~"^(park|playground)$"]', 3, 0.1],
  ['schools', '[amenity~"^(school|kindergarten)$"]', 2, 0.1],
]

// One Overpass request that answers one count per row of WALK, in order.
export function walkQuery(lat, lng) {
  const near = f => `nwr(around:800,${lat},${lng})${f};`
  return '[out:json][timeout:20];' + WALK.map(([, f]) => (Array.isArray(f) ? `(${f.map(near).join('')});` : near(f)) + 'out count;').join('')
}

export function walkScore(counts) {
  return Math.round(100 * WALK.reduce((s, [k, , cap, w]) => s + w * Math.min(counts[k] || 0, cap) / cap, 0))
}

// An i18n key for the score, see src/i18n/strings.js.
export const walkLabel = s => s >= 70 ? 'walk_very' : s >= 50 ? 'walk_somewhat' : s >= 25 ? 'walk_some' : 'walk_car'

// Overpass refuses Cloudflare Workers (521), so the browser asks it directly, like
// streetsNear in geo.js. osm.ch is left out: it only holds Switzerland and answers zero elsewhere.
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const KEY = 'atlin-walk:'

// { score, counts } or null when every mirror failed. Cached per ~100 m spot.
export async function walkNear(lat, lng, signal) {
  const id = KEY + lat.toFixed(3) + ',' + lng.toFixed(3)
  try { const hit = JSON.parse(localStorage.getItem(id)); if (hit) return hit } catch {}
  // Public Overpass is often at capacity or answers with a timeout remark, so go round twice.
  for (const endpoint of [...MIRRORS, ...MIRRORS]) {
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: walkQuery(lat, lng) }), signal })
      if (!res.ok) continue
      const totals = (await res.json()).elements.map(e => +e.tags.total)
      if (totals.length !== WALK.length) continue
      const counts = Object.fromEntries(WALK.map(([k], i) => [k, totals[i]]))
      const out = { score: walkScore(counts), counts }
      try { localStorage.setItem(id, JSON.stringify(out)) } catch {}
      return out
    } catch (err) {
      if (err.name === 'AbortError') return null
    }
  }
  return null
}
