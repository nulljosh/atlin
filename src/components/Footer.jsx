import { Link, useLocation } from 'react-router-dom'
import AtlinMark from './AtlinMark'
import './Footer.css'

// Apple-style site footer: small, quiet, hairline on top. The map page is full
// screen, so it has none.
export default function Footer() {
  const { pathname } = useLocation()
  if (pathname === '/browse' || document.documentElement.classList.contains('embed')) return null
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <AtlinMark size={24} />
          <span>Atlin</span>
        </div>
        <nav className="site-footer-links">
          <Link to="/browse">Browse</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/settings">Settings</Link>
          <a href="/privacy.html">Privacy</a>
          <a href="https://github.com/nulljosh/atlin">GitHub</a>
        </nav>
        <p>Listings from Craigslist, HousingFeed and RentCast link back to the original post. Deal scores compare each home with others its size nearby.</p>
        <p>Copyright © 2026 Joshua Trommel. MIT licensed.</p>
      </div>
    </footer>
  )
}
