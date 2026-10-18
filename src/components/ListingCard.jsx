import { Link } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'
import { listingFormatters, thumb } from '../lib/format'
import { useI18n } from '../i18n'
import AtlinMark from './AtlinMark'
import './ListingCard.css'

// Many real listings come without photos. A quiet atlin mark beats a white hole.
export function NoPhoto() {
  return (
    <div className="no-photo" aria-hidden="true">
      <AtlinMark size={56} />
    </div>
  )
}

export default function ListingCard({ listing, index = 0 }) {
  const { toggle, isFavorite } = useFavorites()
  const { language, t } = useI18n()
  const fmt = listingFormatters(listing, language, t)
  const fav = isFavorite(listing.id)

  return (
    <Link
      to={`/listing/${listing.id}`}
      className={`listing-card card fade-up`}
      style={{ animationDelay: `${(index % 12) * 0.04}s` }}
    >
      <div className="listing-card-img">
        {listing.photo
          ? <img
              src={thumb(listing.photo, 640)}
              alt={listing.address}
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={e => e.currentTarget.classList.add('loaded')}
            />
          : <NoPhoto />}
        <button
          className={`fav-btn ${fav ? 'active' : ''}`}
          onClick={e => { e.preventDefault(); toggle(listing.id) }}
          aria-label={`${t('favorites')}: ${listing.address}`}
          aria-pressed={fav}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        {listing.listedDaysAgo <= 3 && <span className="listing-new-badge">{t('new_badge')}</span>}
      </div>
      <div className="listing-card-body">
        <div className="listing-price">
          {fmt.price}
          {listing.deal >= 5 && <span className="deal-badge">{t('deal_under', { n: listing.deal })}</span>}
        </div>
        <div className="listing-meta">
          <span>{listing.beds} {t('bd')}</span>
          <span className="meta-dot" />
          <span>{listing.baths} {t('ba')}</span>
          {fmt.area && <><span className="meta-dot" /><span>{fmt.area}</span></>}
        </div>
        <div className="listing-address">{listing.address}{listing.neighborhood && listing.neighborhood !== listing.address ? `, ${listing.neighborhood}` : ''}</div>
      </div>
    </Link>
  )
}
