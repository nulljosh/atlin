import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, supportedLanguages, languageLabel } from '../i18n'
import { rtlLanguages } from '../i18n/strings'
import { coverage } from '../lib/market'
import { photos } from '../data/listings'
import { thumb } from '../lib/format'
import './Landing.css'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Reveals a section once it scrolls into view. Returns [ref, className] where
// className is '' until intersecting, then 'reveal in-view' (or just always
// visible if the visitor has reduced motion on).
function useRevealOnScroll() {
  const ref = useRef(null)
  const [inView, setInView] = useState(prefersReducedMotion())

  useEffect(() => {
    if (prefersReducedMotion() || !ref.current || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.unobserve(entry.target)
        }
      },
      { threshold: 0.15 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return [ref, inView]
}

export default function Landing() {
  const { t } = useI18n()
  const [statsRef, statsIn] = useRevealOnScroll()
  const [howRef, howIn] = useRevealOnScroll()
  const [langRef, langIn] = useRevealOnScroll()
  const [honestRef, honestIn] = useRevealOnScroll()
  const [ctaRef, ctaIn] = useRevealOnScroll()

  const stats = [
    [coverage.countries, t('stat_countries')],
    [coverage.currencies, t('stat_currencies')],
    [supportedLanguages.length, t('stat_languages')],
    [rtlLanguages.length, t('stat_rtl')]
  ]

  const features = [
    ['feat2_search_title', 'feat2_search_body'],
    ['feat2_ask_title', 'feat2_ask_body'],
    ['feat2_deal_title', 'feat2_deal_body'],
    ['feat2_save_title', 'feat2_save_body']
  ]

  // The demo plays only while it is on screen, and never for reduced motion.
  const demoRef = useRef(null)
  useEffect(() => {
    const v = demoRef.current
    if (!v || prefersReducedMotion() || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.4 })
    io.observe(v)
    return () => io.disconnect()
  }, [])

  // Three real rentals for the hero, from the same feed the app uses.
  const [live, setLive] = useState(null)
  useEffect(() => {
    fetch('/api/listings?lat=49.2827&lng=-123.1207&country=CA&city=Vancouver&mode=rent')
      .then(r => r.json())
      .then(d => {
        const withPhotos = (d.listings || []).filter(l => l.photo).slice(0, 3)
        if (withPhotos.length === 3) setLive(withPhotos)
      })
      .catch(() => {})
  }, [])

  return (
    <main className="landing">
      {/* hero shows three real homes when the feed answers, sample photos until then */}
      <section className="landing-hero">
        <div className="landing-inner">
          <svg className="hero-icon" width="96" height="56" viewBox="144 312 736 416" aria-hidden="true">
            <rect x="344" y="328" width="336" height="176" rx="28" fill="#B5836A" />
            <rect x="160" y="536" width="336" height="176" rx="28" fill="#C9A184" />
            <rect x="528" y="536" width="336" height="176" rx="28" fill="#B5836A" />
          </svg>
          <h1>{t('brand')}</h1>
          <p>{t('landing_pitch')}</p>
          <div className="landing-buttons">
            <Link to="/browse" className="btn btn-primary">{t('listings')}</Link>
            <Link to="/login" className="btn btn-ghost">{t('sign_in')}</Link>
            <a href="https://github.com/nulljosh/brick" className="btn btn-ghost">GitHub</a>
          </div>
        </div>
        <div className="hero-preview" aria-label={t('sample_listings')}>
          <img src={live ? thumb(live[0].photo, 900) : photos[0]} alt="" fetchPriority="high" />
          <img src={live ? thumb(live[1].photo, 480) : photos[1]} alt="" />
          <img src={live ? thumb(live[2].photo, 480) : photos[2]} alt="" />
          <span>{live ? t('live_listings') : t('sample_listings')}</span>
        </div>
      </section>

      <section className="landing-section landing-demo">
        <p className="section-label">{t('demo_label')}</p>
        <h2>{t('demo_title')}</h2>
        <div className="demo-frame">
          <div className="demo-bar" aria-hidden="true"><i /><i /><i /><span>brick.jaybulb.com</span></div>
          <video
            ref={demoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster="/promo/poster.jpg"
            aria-label={t('demo_title')}
          >
            <source src="/promo/brick.webm" type="video/webm" />
            <source src="/promo/brick.mp4" type="video/mp4" />
          </video>
        </div>
        <p className="demo-caption">{t('demo_caption')}</p>
      </section>

      <section className={`landing-stats reveal${statsIn ? ' in-view' : ''}`} ref={statsRef}>
        <dl>
          {stats.map(([n, label]) => (
            <div key={label}>
              <dt>{n}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`landing-section reveal${howIn ? ' in-view' : ''}`} ref={howRef}>
        <p className="section-label">{t('how_label')}</p>
        <h2>{t('how_title')}</h2>
        <div className="feature-grid">
          {features.map(([title, body]) => (
            <article key={title} className="card feature">
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`landing-section reveal${langIn ? ' in-view' : ''}`} ref={langRef}>
        <p className="section-label">{t('lang_label')}</p>
        <h2>{t('lang_title')}</h2>
        <p className="section-body">{t('lang_body', { n: supportedLanguages.length })}</p>
        <ul className="lang-list">
          {supportedLanguages.map(code => (
            <li key={code} lang={code} dir={rtlLanguages.includes(code) ? 'rtl' : 'ltr'}>
              {languageLabel(code)}
            </li>
          ))}
        </ul>
      </section>

      <section className={`landing-section reveal${honestIn ? ' in-view' : ''}`} ref={honestRef}>
        <p className="section-label">{t('honest_label')}</p>
        <h2>{t('honest_title')}</h2>
        <p className="section-body">{t('honest_body')}</p>
      </section>

      <section className={`landing-cta reveal${ctaIn ? ' in-view' : ''}`} ref={ctaRef}>
        <h2>{t('cta_title')}</h2>
        <p>{t('cta_body')}</p>
        <Link to="/browse" className="btn btn-primary">{t('listings')}</Link>
      </section>

      <footer className="landing-footer">
        <a href="/privacy">Privacy</a>
        <a href="https://github.com/nulljosh/brick">GitHub</a>
      </footer>
    </main>
  )
}
