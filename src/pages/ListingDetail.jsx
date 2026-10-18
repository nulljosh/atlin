import { NoPhoto } from '../components/ListingCard'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { usePlace } from '../context/PlaceContext'
import { listingFormatters, thumb } from '../lib/format'
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

  return (
    <div className="page">
      <div className="detail-layout fade-up">
        <div className="detail-gallery">
          <div className="detail-main-photo">
            {listing.photos[photoIdx] ? <img src={thumb(listing.photos[photoIdx], 1200)} alt={listing.address} onError={e => { e.currentTarget.style.display = "none" }} /> : <NoPhoto listing={listing} width={1200} />}
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
                <img src={thumb(photo, 200)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = "none" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-info">
          <div className="detail-price">{fmt.price}</div>
          <div className="detail-address">{listing.address}</div>
          <div className="detail-neighborhood">{listing.neighborhood}, {listing.city}</div>

          <div className="detail-stats">
            <div className="detail-stat">
              <span className="detail-stat-value">{listing.beds}</span>
              <span className="detail-stat-label">{t('beds')}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-value">{listing.baths}</span>
              <span className="detail-stat-label">{t('ba')}</span>
            </div>
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


          <div className="detail-section">
            <h3 className="section-label">{t('features')}</h3>
            <div className="detail-meta-grid">
              <div><span className="detail-meta-label">{t('type')}</span><span className="detail-meta-value">{t(listing.type)}</span></div>
              {listing.refNumber && <div><span className="detail-meta-label">#</span><span className="detail-meta-value">{listing.refNumber}</span></div>}
              {listing.source && <div><span className="detail-meta-label">via</span><span className="detail-meta-value">{listing.url ? <a href={listing.url} target="_blank" rel="noopener noreferrer">{listing.source}</a> : listing.source}</span></div>}
              <div><span className="detail-meta-label">{t('sort_newest')}</span><span className="detail-meta-value">{t('listed_ago', { n: listing.listedDaysAgo })}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
