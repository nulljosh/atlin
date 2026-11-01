import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, supportedLanguages } from '../i18n'
import AtlinMark from '../components/AtlinMark'
import './Landing.css'

const features = [
  ['feat2_search_title', 'feat2_search_body'],
  ['feat2_ask_title', 'feat2_ask_body'],
  ['feat2_deal_title', 'feat2_deal_body'],
  ['feat2_save_title', 'feat2_save_body']
]

export default function Landing() {
  const { t } = useI18n()

  // Parallax: the app drifts at 0.45, the copy lifts at 0.2 and fades. Capture phase, in case the page scrolls in a wrapper.
  useEffect(() => {
    const bg = document.querySelector('.landing-app'), copy = document.querySelector('.landing-hero-copy')
    if (!bg || !copy || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let t = 0, y = 0
    const on = (e) => {
      y = e.target === document ? window.scrollY : e.target.scrollTop || 0
      if (t) return
      t = requestAnimationFrame(() => {
        t = 0
        const h = window.innerHeight
        if (y > h * 1.2) return
        bg.style.setProperty('--py', `${y * 0.45}px`)
        copy.style.transform = `translate3d(0, ${y * 0.2}px, 0)`
        copy.style.opacity = String(Math.max(0, 1 - y / (h * 0.7)))
      })
    }
    document.addEventListener('scroll', on, { passive: true, capture: true })
    return () => { document.removeEventListener('scroll', on, { capture: true }); cancelAnimationFrame(t) }
  }, [])

  return (
    <main className="landing">
      {/* The real app runs behind the hero, blended under the copy. */}
      <section className="landing-hero">
        <div className="landing-app" aria-hidden="true" inert="">
          <iframe src="/browse?embed" title={t('brand')} loading="lazy" tabIndex={-1} />
        </div>
        <div className="landing-hero-copy">
          <AtlinMark className="hero-icon" size={72} />
          <h1><Link to="/browse">{t('cta_title')}</Link></h1>
          <p>{t('landing_pitch')}</p>
          <div className="landing-buttons">
            <Link to="/browse" className="btn btn-primary">{t('listings')}</Link>
            <Link to="/login" className="btn btn-ghost">{t('sign_in')}</Link>
          </div>
        </div>
      </section>

      <section className="landing-section landing-band">
        <div className="band-head">
          <p className="band-label">{t('how_label')}</p>
          <h2>{t('how_title')}</h2>
        </div>
        <div className="feature-grid">
          {features.map(([title, body]) => (
            <article key={title} className="feature">
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <p className="band-label">{t('lang_label')}</p>
        <h2>{t('lang_title')}</h2>
        <p>{t('lang_body', { n: supportedLanguages.length })}</p>
        <Link to="/browse" className="btn btn-primary">{t('listings')}</Link>
      </section>

    </main>
  )
}
