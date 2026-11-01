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

  return (
    <main className="landing">
      {/* Hermes layout: the real app runs behind the hero, faded under the copy. */}
      <section className="landing-hero">
        <div className="landing-app" aria-hidden="true">
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
