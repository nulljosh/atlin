import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { listingFormatters, thumb } from '../lib/format'
import { visibleForZoom } from '../lib/mapPins'
import { useI18n } from '../i18n'
import './MapView.css'

function createPriceIcon(label, isFav) {
  const width = label.length * 9 + 20
  const bg = isFav ? '#1d1d1f' : '#0071e3'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32">
    <rect width="100%" height="24" rx="12" fill="${bg}"/>
    <text x="50%" y="16" fill="#fff" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" text-anchor="middle">${label}</text>
    <polygon points="${width / 2 - 4},24 ${width / 2 + 4},24 ${width / 2},30" fill="${bg}"/>
  </svg>`
  return L.divIcon({ html: svg, className: 'price-marker', iconSize: [width, 32], iconAnchor: [width / 2, 30] })
}

function MapMarkers({ listings, favorites }) {
  const navigate = useNavigate()
  const { language, t } = useI18n()
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })

  // Real feeds geocode a whole building to one point, so ten units stack into
  // one pin. Group them: the pin shows the count and the cheapest price.
  const groups = new Map()
  for (const l of listings) {
    const key = `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`
    const g = groups.get(key)
    if (!g) groups.set(key, { ...l, count: 1 })
    else { g.count++; if (l.price < g.price) Object.assign(g, l, { count: g.count }) }
  }
  const label = g => {
    const p = listingFormatters(g, language, t).priceCompact
    return g.count > 1 ? `${g.count} · ${p}` : p
  }

  return visibleForZoom([...groups.values()], zoom, label).map(listing => {
    const fmt = listingFormatters(listing, language, t)
    return (
      <Marker
        key={listing.id}
        position={[listing.lat, listing.lng]}
        icon={createPriceIcon(label(listing), favorites.includes(listing.id))}
        zIndexOffset={Math.round((90 - listing.lat) * 100)}
        riseOnHover
        eventHandlers={{ click: () => navigate(`/listing/${listing.id}`) }}
      >
        <Popup className="atlin-popup">
          <div className="popup-content">
            {listing.photo && <img src={thumb(listing.photo, 320)} alt="" />}
            <div className="popup-info">
              <strong>{fmt.price}</strong>
              <span>{[`${listing.beds} ${t('bd')}`, `${listing.baths} ${t('ba')}`, fmt.area].filter(Boolean).join(' / ')}</span>
              <span className="popup-address">{listing.address}</span>
            </div>
          </div>
        </Popup>
      </Marker>
    )
  })
}

// Browsing to a new city has to move the map; Leaflet keeps its own view state.
// Once homes arrive, frame them rather than the place's centre point.
function RecenterOn({ place, listings }) {
  const map = useMap()
  const first = listings[0]?.id
  useEffect(() => {
    if (!listings.length) map.setView([place.lat, place.lng], 12)
    // Keep the homes out from under the glass panel: left of it on desktop, above it on phones.
    else {
      const phone = window.innerWidth <= 700
      map.fitBounds(listings.map(l => [l.lat, l.lng]), {
        paddingTopLeft: phone ? [24, 130] : [Math.min(640, window.innerWidth / 2), 100],
        paddingBottomRight: phone ? [24, window.innerHeight * 0.64] : [48, 48],
        maxZoom: 14
      })
    }
  }, [place.id, first, map])
  return null
}

export default function MapView({ listings, favorites, place }) {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="map-container">
      <MapContainer
        center={[place.lat, place.lng]}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        />
        {!dark && <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        />}
        <ZoomControl position="bottomright" />
        <RecenterOn place={place} listings={listings} />
        <MapMarkers listings={listings} favorites={favorites} />
      </MapContainer>
    </div>
  )
}
