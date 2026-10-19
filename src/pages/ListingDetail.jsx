import { NoPhoto } from '../components/ListingCard'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { walkNear, walkLabel } from '../lib/walk'
import { usePlace } from '../context/PlaceContext'
import { listingFormatters, thumb, staticMap } from '../lib/format'
import { formatMoney } from '../lib/market'
import ListingCard from '../components/ListingCard'
import { useI18n } from '../i18n'
import { useFavorites } from '../context/FavoritesContext'
import './ListingDetail.css'

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { listings, fetching } = usePlace()
  const { language, t } = useI18n()
  const listing = listings.find(l => l.id === id)
  const { toggle, isFavorite } = useFavorites()
  const [photoIdx, setPhotoIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [walk, setWalk] = useState(null)
  const lat = listing?.lat, lng = listing?.lng

  useEffect(() => {
    setWalk(null)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const ctrl = new AbortController()
    walkNear(lat, lng, ctrl.signal).then(w => { if (!ctrl.signal.aborted) setWalk(w) })
    return () => ctrl.abort()
  }, [lat, lng])

  if (!listing && fetching) return <div className="page" role="status" aria-busy="true" />

  if (!listing) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <h2>{t('no_results')}</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>{t('back')}</Link>
      </div>
    )
  }

  const fav = isFavorite(listing.id)
  const fmt = listingFormatters(listing, language, t)
  const money = n => formatMoney(n, listing.currency, language)
  const perArea = listing.sqft > 0 ? money(listing.price / (listing.imperial ? listing.sqft : listing.sqft * 0.092903)) : ''
  // ponytail: fixed 20% down, 30 years, 5.5%. An estimate, not a quote; a rate input if people ask.
  const r = 0.055 / 12
  const monthly = listing.mode === 'sale' ? (listing.price * 0.8 * r) / (1 - Math.pow(1 + r, -360)) : 0
  const similar = listings.filter(l => l.id !== listing.id && l.mode === listing.mode && Math.floor(l.beds) === Math.floor(listing.beds) && Math.abs(l.price - listing.price) <= listing.price * 0.25).slice(0, 4)
  const hasPin = Number.isFinite(listing.lat) && Number.isFinite(listing.lng)

  const days = listing.listedDaysAgo
  const listed = language === 'en' && days <= 1 ? (days < 1 ? 'Today' : 'Yesterday') : t('listed_ago', { n: days })

  async function share() {
    const data = { title: listing.address, url: location.href }
    if (navigator.share) { try { await navigator.share(data) } catch {} return }
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <div className="page">
      <div className="detail-layout fade-up">
        <div className="detail-gallery">
          <div className="detail-main-photo">
            {listing.photos[photoIdx] ? <img src={thumb(listing.photos[photoIdx], 1200)} alt={listing.address} onError={e => { e.currentTarget.style.display = "none" }} /> : <NoPhoto listing={listing} width={800} />}
            <button className="detail-back" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <button
              className={`fav-btn ${fav ? 'active' : ''}`}
              onClick={() => toggle(listing.id)}
              style={{ position: 'absolute', top: '1rem', right: '1rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
          <div className="detail-thumbs">
            {listing.photos.map((photo, i) => (
              <button
                key={i}
                className={`detail-thumb ${i === photoIdx ? 'active' : ''}`}
                onClick={() => setPhotoIdx(i)}
              >
                <img src={thumb(photo, 200)} alt="" loading="lazy" onError={e => { e.currentTarget.parentElement.style.display = "none" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-info">
          <div className="detail-price">{fmt.price}</div>
          {listing.priceWas > listing.price && <div className="listing-drop">{t('price_drop', { n: money(listing.priceWas - listing.price) })}</div>}
          <div className="detail-address">{listing.address}</div>
          <div className="detail-neighborhood">{[...new Set([listing.neighborhood, listing.city].filter(Boolean))].join(', ')}</div>
          {(perArea || monthly > 0) && (
            <div className="detail-sub">
              {perArea && <span>{perArea} / {listing.imperial ? 'sq ft' : 'm²'}{listing.mode === 'rent' ? ' / mo' : ''}</span>}
              {monthly > 0 && <span>Est. {money(monthly)}/mo · 20% down, 30 yr, 5.5%</span>}
            </div>
          )}
          <div className="detail-actions">
            {listing.url && <a className="btn btn-primary" href={listing.url} target="_blank" rel="noopener noreferrer">View listing</a>}
            <button type="button" className="btn btn-ghost" onClick={share}>{copied ? 'Link copied' : 'Share'}</button>
          </div>

          <div className="detail-stats">
            <div className="detail-stat">
              <span className="detail-stat-value">{listing.beds}</span>
              <span className="detail-stat-label">{t('beds')}</span>
            </div>
            {listing.baths > 0 && (
              <div className="detail-stat">
                <span className="detail-stat-value">{listing.baths}</span>
                <span className="detail-stat-label">{t('ba')}</span>
              </div>
            )}
            {fmt.area && (
              <div className="detail-stat">
                <span className="detail-stat-value">{fmt.area}</span>
                <span className="detail-stat-label">{t('area')}</span>
              </div>
            )}
            {listing.year && (
              <div className="detail-stat">
                <span className="detail-stat-value">{listing.year}</span>
                <span className="detail-stat-label">{t('year_built')}</span>
              </div>
            )}
          </div>


          <div className="detail-list">
            <div><span>{t('type')}</span><span>{t(listing.type)}</span></div>
            {listing.refNumber && <div><span>#</span><span>{listing.refNumber}</span></div>}
            {listing.source && <div><span>{t('source')}</span><span>{listing.url ? <a href={listing.url} target="_blank" rel="noopener noreferrer">{listing.source}</a> : listing.source}</span></div>}
            <div><span>{t('sort_newest')}</span><span>{listed}</span></div>
          </div>

          {listing.priceHistory?.length > 1 && (
            <>
              <h3 className="detail-h detail-h-small">{t('price_history')}</h3>
              <div className="detail-list">
                <div className="price-spark"><PriceSpark points={listing.priceHistory} /></div>
                {[...listing.priceHistory].reverse().map(([day, price]) => (
                  <div key={day}>
                    <span>{new Date(day * 864e5).toLocaleDateString(language, { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                    <span>{money(price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {walk && (
            <div className="detail-list">
              <div><span>{t('walk_score')}</span><span>{walk.score} · {t(walkLabel(walk.score))}</span></div>
              <div><span>{t('transit_near')}</span><span>{walk.counts.transit}</span></div>
              <div><span>{t('schools_near')}</span><span>{walk.counts.schools}</span></div>
            </div>
          )}

          {hasPin && listing.photos.length > 0 && (
            <div className="no-photo detail-map">
              <img src={staticMap(listing.lat, listing.lng, 800, 400, 0.02)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />
              <span className="no-photo-pin" />
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="detail-similar">
          <h3 className="detail-h">Similar homes</h3>
          <div className="listings-grid">
            {similar.map((l, i) => <ListingCard key={l.id} listing={l} index={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// A step line through the price changes, oldest on the left. No axes: the rows below carry the numbers.
function PriceSpark({ points }) {
  const days = points.map(p => p[0]), prices = points.map(p => p[1])
  // The line runs on to today, so the current price reads as a flat stretch, not a drop at the edge.
  const d0 = Math.min(...days), dSpan = Math.max(...days, Math.floor(Date.now() / 864e5)) - d0 || 1
  const lo = Math.min(...prices), pSpan = Math.max(...prices) - lo || 1
  const x = d => 4 + (d - d0) / dSpan * 292
  const y = p => 44 - (p - lo) / pSpan * 40
  const path = points.map(([d, p], i) => (i ? `H${x(d)}V${y(p)}` : `M${x(d)} ${y(p)}`)).join('') + 'H296'
  return (
    <svg viewBox="0 0 300 48" preserveAspectRatio="none" role="img" aria-label="Price history">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
