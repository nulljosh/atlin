import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filterListings } from '../lib/filterListings'
import { useFilters } from '../context/FiltersContext'
import { useFavorites } from '../context/FavoritesContext'
import { usePlace } from '../context/PlaceContext'
import { useI18n } from '../i18n'
import FilterBar from '../components/FilterBar'
import MapView from '../components/MapView'
import ListingCard from '../components/ListingCard'
import AskBar from '../components/AskBar'
import { scoreDeals } from '../lib/deals'
import { insideArea, insideBounds } from '../lib/mapPins'
import { placeAt } from '../lib/geo'
import './Listings.css'

export default function Listings() {
  const { filters } = useFilters()
  const { favorites, favoriteSet } = useFavorites()
  const { place, setPlace, listings, isLive, fetching, streetsUnavailable } = usePlace()
  const { t, language } = useI18n()

  const [askCount, setAskCount] = useState(0)
  // iPhone Safari runs out of memory drawing every card at once (and the landing
  // page runs this view a second time in its iframe). Draw a page, add on demand.
  const embed = document.documentElement.classList.contains('embed')
  const [shown, setShown] = useState(embed ? 8 : 24)
  const scored = useMemo(() => scoreDeals(listings), [listings])
  const filtered = useMemo(
    () => filterListings(scored, filters, favoriteSet),
    [scored, filters, favoriteSet]
  )
  // A loop drawn on the map narrows the homes to inside it; a new place clears it.
  const [area, setArea] = useState(null)
  useEffect(() => setArea(null), [place.id])
  // The list follows the map. A refit from a search or a filter shows everything again.
  const [view, setView] = useState(null)
  useEffect(() => { if (!place.fromMap) setView(null) }, [place.id, place.fromMap, filtered])
  const shownHomes = useMemo(() => {
    const inArea = area ? filtered.filter(l => insideArea([l.lat, l.lng], area)) : filtered
    return view ? inArea.filter(l => insideBounds(l, view)) : inArea
  }, [filtered, area, view])

  // Panning out of the place loads the city under the map. Nominatim allows one request a second, hence the wait.
  const lookup = useRef(null)
  useEffect(() => () => lookup.current?.abort(), [])
  const onMove = useCallback(({ bounds, center, zoom }) => {
    setView(bounds)
    lookup.current?.abort()
    if (area || zoom < 10 || !place.bbox) return
    const [s, w, n, e] = place.bbox
    if (center.lat > s && center.lat < n && center.lng > w && center.lng < e) return
    const controller = lookup.current = new AbortController()
    setTimeout(() => {
      if (controller.signal.aborted) return
      placeAt(center.lat, center.lng, language, controller.signal)
        .then(next => { if (next && next.id !== place.id) setPlace({ ...next, fromMap: true }) })
        .catch(() => {})
    }, 1000)
  }, [area, place.id, place.bbox, language, setPlace])

  return (
    <div className="page browse">
      {/* The map is the backdrop; everything else floats over it on glass. */}
      <MapView listings={shownHomes} frame={filtered} favorites={favorites} place={place} area={area} onArea={setArea} onMove={onMove} />
      <div className="browse-panel">
      <AskBar resultCount={shownHomes.length} onAnswer={() => setAskCount(n => n + 1)} />
      <FilterBar resultCount={shownHomes.length} />
      {fetching && <p className="listings-notice listings-fetching" role="status">{t('fetching_listings', { place: place.name })}</p>}
      {!fetching && !isLive && <p className="listings-notice">{t('sample_listings')}</p>}
      {!isLive && streetsUnavailable && <p className="listings-notice">{t('approx_locations')}</p>}
      <div className="listings-grid" key={askCount}>
        {shownHomes.slice(0, shown).map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} index={i} />
        ))}
        {!embed && shownHomes.length > shown && (
          <button className="btn btn-ghost listings-more" onClick={() => setShown(n => n + 24)}>Show more</button>
        )}
        {fetching && Array.from({ length: 8 }, (_, i) => <div key={i} className="listing-card card skeleton" aria-hidden="true" />)}
        {!fetching && shownHomes.length === 0 && (
          <div className="listings-empty fade-up">
            <h3>{t('no_results')}</h3>
            <p>{t('adjust_filters')}</p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
