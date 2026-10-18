import { cleanPhotos, dropSharedPhotos } from '../lib/format'
import { createContext, useContext, useEffect, useState } from 'react'
import { defaultPlace, streetsNear } from '../lib/geo'
import { generateListings } from '../data/listings'

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
  const saleAvailable = place.countryCode === 'US'
  const mode = saleAvailable ? savedMode : 'rent'
  const [streets, setStreets] = useState([])
  const [streetsUnavailable, setStreetsUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  // null while the feed is still answering; a first look at a new town can take
  // half a minute, and flashing sample homes in the meantime reads as a bug.
  const [live, setLive] = useState(null)

  // Street names come from Overpass once per place; the listings themselves are
  // derived, so there is nothing else to fetch when the sale/rent mode flips.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    streetsNear(place, controller.signal)
      .then(({ streets, unavailable }) => {
        setStreets(streets)
        setStreetsUnavailable(unavailable)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [place.id])

  // Real inventory from /api/listings. Empty when no provider covers the place
  // or no key is set, and then the sample homes below stand in, labeled as such.
  useEffect(() => {
    const controller = new AbortController()
    setLive(null)
    const q = new URLSearchParams({ lat: place.lat, lng: place.lng, country: place.countryCode || '', city: place.name, area: place.area || '', mode })
    fetch(`/api/listings?${q}`, { signal: controller.signal })
      .then(r => (r.ok ? r.json() : { listings: [] }))
      .then(d => setLive(dropSharedPhotos((d.listings || []).map(cleanPhotos))))
      .catch(err => { if (err.name !== 'AbortError') setLive([]) })
    return () => controller.abort()
  }, [place.id, mode])

  // ponytail: a feed that returns a handful of homes for a whole city reads as
  // broken, so below this the labeled samples stand in. Tune if feeds get denser.
  const fetching = live === null
  const isLive = !fetching && live.length >= 5
  const listings = fetching ? [] : isLive ? live : generateListings(place, streets, mode)

  function setPlace(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
