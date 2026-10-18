import { Link, useLocation } from 'react-router-dom'
import AtlinMark from './AtlinMark'
import FooterScene from './FooterScene'
import './Footer.css'

const columns = [
  ['Atlin', [['Browse', '/browse'], ['Sign in', '/login'], ['Create account', '/register'], ['Settings', '/settings']]],
  ['Resources', [['GitHub', 'https://github.com/nulljosh/atlin'], ['API and agents', 'https://github.com/nulljosh/atlin/blob/main/docs/API.md'], ['Whitepaper', 'https://github.com/nulljosh/atlin/blob/main/WHITEPAPER.md']]],
  ['Legal', [['Privacy', '/privacy.html'], ['License', 'https://github.com/nulljosh/atlin/blob/main/LICENSE']]]
]

// Columns over an engraved harbour drawn by a shader. The map page is full
// screen, so it has no footer.
export default function Footer() {
  const { pathname } = useLocation()
  if (pathname === '/browse' || document.documentElement.classList.contains('embed')) return null
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="site-footer-name"><AtlinMark size={28} /><span>Atlin</span></div>
          <p>Real homes on a map,<br />ranked by deal.</p>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} className="site-footer-col" aria-label={title}>
            <h4>{title}</h4>
            {links.map(([label, href]) => href.startsWith('/') && !href.endsWith('.html')
              ? <Link key={label} to={href}>{label}</Link>
              : <a key={label} href={href}>{label}</a>)}
          </nav>
        ))}
      </div>
      <div className="site-footer-legal">
        <span>© 2026 Joshua Trommel</span>
        <span>Listings from Craigslist, HousingFeed and RentCast</span>
      </div>
      <FooterScene />
    </footer>
  )
}
