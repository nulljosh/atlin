// Worldwide place lookup. Nominatim geocodes anywhere on earth for free and
// returns names in the caller's language, so there is no place table to keep.
// ponytail: no API key, no proxy. Nominatim asks for <=1 req/sec, which the
// debounced search box already respects.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
// The main Overpass instance returns 504 often enough to matter (it did while
// this was being written), so try the public mirrors before giving up.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter'
]

// Street names do not change, so a place looked up once never needs Overpass
// again. This is what keeps a bad upstream from being visible at all.
const STREET_CACHE_PREFIX = 'brick-streets:'
const STREET_CACHE_TTL = 30 * 24 * 60 * 60 * 1000

function readStreetCache(id) {
  try {
    const raw = localStorage.getItem(STREET_CACHE_PREFIX + id)
    if (!raw) return null
    const { at, streets } = JSON.parse(raw)
    return Date.now() - at > STREET_CACHE_TTL ? null : streets
  } catch {
    return null
  }
}

function writeStreetCache(id, streets) {
  try {
    localStorage.setItem(STREET_CACHE_PREFIX + id, JSON.stringify({ at: Date.now(), streets }))
  } catch {
    // A full or blocked localStorage only costs us the cache, not the lookup.
  }
}

export const defaultPlace = {
  id: 'vancouver-bc',
  name: 'Vancouver',
  label: 'Vancouver, British Columbia, Canada',
  countryCode: 'CA',
  lat: 49.2827,
  lng: -123.1207,
  bbox: [49.198, -123.225, 49.317, -123.023]
}

function toPlace(r) {
  const [s, n, w, e] = r.boundingbox.map(Number)
  return {
    id: `${r.osm_type}-${r.osm_id}`,
    name: r.name || r.display_name.split(',')[0],
    label: r.display_name,
    countryCode: (r.address?.country_code || '').toUpperCase(),
    // The town a neighbourhood belongs to. Listing feeds index by town, so
    // Brookswood has to be asked for as Langley.
    area: r.address?.city || r.address?.town || r.address?.municipality || r.address?.village || '',
    lat: Number(r.lat),
    lng: Number(r.lon),
    // Nominatim gives [south, north, west, east]; everything else here wants
    // [south, west, north, east].
    bbox: [s, w, n, e]
  }
}

export async function searchPlaces(query, language = 'en', signal) {
  if (!query.trim()) return []
  const url = `${NOMINATIM}?${new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    'accept-language': language,
    featureType: 'settlement'
  })}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Place search failed: ${res.status}`)
  const rows = await res.json()
  // Nominatim returns the same suburb as a boundary and as a node; keep one.
  const seen = new Set()
  return rows.filter(r => r.boundingbox).map(toPlace).filter(p => !seen.has(p.label) && seen.add(p.label))
}

// Real named streets inside the place, in the local script. Returns
// { streets, unavailable }: an empty list with unavailable=true means every
// mirror failed, which the UI says out loud instead of quietly inventing
// addresses at the city centroid.
export async function streetsNear(place, signal) {
  const cached = readStreetCache(place.id)
  if (cached) return { streets: cached, unavailable: false }

  const [s, w, n, e] = clampBox(place.bbox)
  const query = `[out:json][timeout:20];way["highway"~"^(residential|living_street|tertiary|secondary|unclassified)$"]["name"](${s},${w},${n},${e});out tags center 120;`

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(endpoint, { method: 'POST', body: query, signal })
      if (!res.ok) continue
      const data = await res.json()
      const seen = new Set()
      const streets = data.elements
        .filter(el => el.center && el.tags?.name && !seen.has(el.tags.name) && seen.add(el.tags.name))
        .map(el => ({ name: el.tags.name, lat: el.center.lat, lng: el.center.lon }))
      if (!streets.length) continue
      writeStreetCache(place.id, streets)
      return { streets, unavailable: false }
    } catch (err) {
      // An aborted request is the caller changing its mind, not an outage.
      if (err.name === 'AbortError') return { streets: [], unavailable: false }
    }
  }

  return { streets: [], unavailable: true }
}

// A country-sized bbox would ask Overpass for the whole nation. Cap the box at
// roughly a metro area around the centre.
function clampBox([s, w, n, e], maxDeg = 0.25) {
  const cy = (s + n) / 2
  const cx = (w + e) / 2
  return [
    Math.max(s, cy - maxDeg), Math.max(w, cx - maxDeg),
    Math.min(n, cy + maxDeg), Math.min(e, cx + maxDeg)
  ]
}
