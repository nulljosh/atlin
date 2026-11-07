import { cleanPhotos, dropSharedPhotos } from '../lib/format'
import { createContext, useContext, useEffect, useState } from 'react'
import { defaultPlace, streetsNear } from '../lib/geo'
import { generateListings } from '../data/listings'

const SALE_COUNTRIES = new Set(['US', 'CA'])

const PlaceContext = createContext(null)
const STORAGE_KEY = 'atlin-place'

function storedPlace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultPlace
  } catch {
    return defaultPlace
  }
}

export function PlaceProvider({ children }) {
  const [place, setPlaceState] = useState(storedPlace)
  const [savedMode, setMode] = useState(() => localStorage.getItem('atlin-mode') || 'rent')
  // Sale listings exist only where a sale feed does (RentCast, US). Elsewhere the
  // app is rent only, rather than offering a toggle that shows invented homes.
  // Sale rows come from Zillow in the US and Craigslist in the US and Canada (Vancouver: 120 sale rows, 2026-11-01).
  const saleAvailable = SALE_COUNTRIES.has(place.countryCode)
  const mode = saleAvailable ? savedMode : 'rent'
  const [streets, setStreets] = useState([])
  const [streetsUnavailable, setStreetsUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  // null while the feed is still answering; a first look at a new town can take
  // half a minute, and flashing sample homes in the meantime reads as a bug.
  const [live, setLive] = useState(null)

  // Street names come from Overpass once per place; the listings themselves are
  // derived, so there is nothing else to fetch when the sale/rent mode flips.
  // Only needed when the labeled sample homes stand in; live listings carry real addresses.
  const needStreets = live !== null && live.length < 5
  useEffect(() => {
    if (!needStreets) { setStreets([]); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    streetsNear(place, controller.signal)
      .then(({ streets, unavailable }) => {
        setStreets(streets)
        setStreetsUnavailable(unavailable)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [place.id, needStreets])

  // Real inventory from /api/listings. Empty when no provider covers the place
  // or no key is set, and then the sample homes below stand in, labeled as such.
  useEffect(() => {
    const controller = new AbortController()
    // Panning into a new city adds its homes to the ones on screen, so the pins never blink out.
    // ponytail: the list grows while panning a long way; cap it if phones struggle.
    const keep = place.fromMap
    if (!keep) setLive(null)
    const q = new URLSearchParams({ lat: place.lat, lng: place.lng, country: place.countryCode || '', city: place.name, area: place.area || '', mode })
    fetch(`/api/listings?${q}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { listings: [] }))
      .then(d => {
        const next = dropSharedPhotos((d.listings || []).map(cleanPhotos))
        const seen = new Set(next.map(l => l.id))
        setLive(prev => keep && prev ? [...next, ...prev.filter(l => l.mode === mode && !seen.has(l.id))] : next)
      })
      .catch(err => { if (err.name !== 'AbortError') setLive(prev => keep && prev ? prev : []) })
    return () => controller.abort()
  }, [place.id, mode])

  // ponytail: a feed that returns a handful of homes for a whole city reads as
  // broken, so below this the labeled samples stand in. Tune if feeds get denser.
  const fetching = live === null
  const isLive = !fetching && live.length >= 5
  const listings = fetching ? [] : isLive ? live : generateListings(place, streets, mode)

  function setPlace(next) {
    const { fromMap, ...saved } = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    setPlaceState(next)
  }

  function changeMode(next) {
    localStorage.setItem('atlin-mode', next)
    setMode(next)
  }

  return (
    <PlaceContext.Provider value={{ place, setPlace, mode, saleAvailable, setMode: changeMode, listings, isLive, fetching, loading, streetsUnavailable }}>
      {children}
    </PlaceContext.Provider>
  )
}

export function usePlace() {
  return useContext(PlaceContext)
}
