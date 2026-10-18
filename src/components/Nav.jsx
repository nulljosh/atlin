import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import AtlinMark from './AtlinMark'
import PlaceSearch from './PlaceSearch'
import './Nav.css'

export default function Nav() {
  const { user } = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <AtlinMark size={28} />
          <span>{t('brand')}</span>
        </Link>
        <PlaceSearch />
        <div className="nav-links">
          {location.pathname !== '/browse' && <Link to="/browse" className="nav-link">{t('listings')}</Link>}
          <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>{user?.name?.split(' ')[0] || t('settings')}</Link>
        </div>
      </div>
    </nav>
  )
}
