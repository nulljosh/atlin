import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n, supportedLanguages, languageLabel } from '../i18n'
import BrickMark from './BrickMark'
import PlaceSearch from './PlaceSearch'
import './Nav.css'

export default function Nav() {
  const { user } = useAuth()
  const location = useLocation()
  const { language, setLanguage, t } = useI18n()

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <BrickMark size={28} />
          <span>{t('brand')}</span>
        </Link>
        <PlaceSearch />
        <div className="nav-links">
          {location.pathname !== '/browse' && <Link to="/browse" className="nav-link">{t('listings')}</Link>}
          <select
            className="nav-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label={t('language')}
          >
            {supportedLanguages.map(code => (
              <option key={code} value={code}>{languageLabel(code)}</option>
            ))}
          </select>
          {user
            ? <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>{user.name?.split(' ')[0] || t('settings')}</Link>
            : <Link to="/login" className="nav-link">{t('sign_in')}</Link>}
        </div>
      </div>
    </nav>
  )
}
