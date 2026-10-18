import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlace } from '../context/PlaceContext'
import { useI18n, supportedLanguages, languageLabel } from '../i18n'
import { marketFor, formatMoneyCompact } from '../lib/market'
import './Settings.css'

// The price ladder is cut from the market the person is browsing, the way FilterBar does it.
function priceSteps(market) {
  const base = 400000 * market.level
  return [0.5, 0.75, 1.25, 2, 3, 5].map(m => {
    const n = base * m
    const mag = 10 ** Math.floor(Math.log10(n))
    return Math.round(n / (mag / 2)) * (mag / 2)
  })
}

export default function Settings() {
  const { user, updateProfile, logout } = useAuth()
  const { place } = usePlace()
  const { language, setLanguage, t } = useI18n()
  const navigate = useNavigate()
  const market = marketFor(place.countryCode)
  const money = n => formatMoneyCompact(n, market.currency, language)
  // A saved value from another market stays in the list instead of snapping to the first option.
  const withSaved = n => [...new Set([...priceSteps(market), ...(Number.isFinite(n) && n > 0 ? [n] : [])])].sort((a, b) => a - b)

  const prefs = user?.preferences || {}
  const [name, setName] = useState(user?.name || '')
  const [priceMin, setPriceMin] = useState(prefs.priceMin ?? 0)
  const [priceMax, setPriceMax] = useState(prefs.priceMax ?? Infinity)
  const [propertyType, setPropertyType] = useState(prefs.propertyType ?? 'all')
  const [status, setStatus] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    try {
      await updateProfile({ name: name.trim(), preferences: { ...prefs, priceMin, priceMax, propertyType } })
      setStatus(t('saved'))
    } catch {
      setStatus(t('settings_save_error'))
    }
    setTimeout(() => setStatus(''), 2500)
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <main className="page">
      <div className="settings-container fade-up">
        <h1>{t('settings')}</h1>
        <p className="subtitle">{t('settings_title_sub')}</p>

        <section className="group" aria-labelledby="set-lang">
          <h2 id="set-lang" className="group-title">{t('language')}</h2>
          <div className="group-body">
            <label className="row" htmlFor="language">
              <span>{t('language')}</span>
              <select id="language" value={language} onChange={e => setLanguage(e.target.value)}>
                {supportedLanguages.map(code => <option key={code} value={code} lang={code}>{languageLabel(code)}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="group" aria-labelledby="set-account">
          <h2 id="set-account" className="group-title">{t('settings_account')}</h2>
          {user ? (
            <form className="group-body" onSubmit={handleSave}>
              <label className="row" htmlFor="name">
                <span>{t('settings_name')}</span>
                <input id="name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
              </label>
              <div className="row">
                <span>{t('email')}</span>
                <span className="value" dir="ltr">{user.email}</span>
              </div>
              <label className="row" htmlFor="priceMin">
                <span>{t('settings_min_price')}</span>
                <select id="priceMin" value={priceMin} onChange={e => setPriceMin(Number(e.target.value))}>
                  <option value={0}>{t('settings_no_min')}</option>
                  {withSaved(priceMin).map(n => <option key={n} value={n}>{money(n)}</option>)}
                </select>
              </label>
              <label className="row" htmlFor="priceMax">
                <span>{t('settings_max_price')}</span>
                <select id="priceMax" value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}>
                  {withSaved(priceMax).map(n => <option key={n} value={n}>{money(n)}</option>)}
                  <option value={Infinity}>{t('settings_no_max')}</option>
                </select>
              </label>
              <label className="row" htmlFor="propertyType">
                <span>{t('type')}</span>
                <select id="propertyType" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                  <option value="all">{t('all_types')}</option>
                  <option value="house">{t('house')}</option>
                  <option value="condo">{t('condo')}</option>
                  <option value="townhouse">{t('townhouse')}</option>
                </select>
              </label>
              <div className="actions">
                <button type="submit" className="btn btn-primary">{t('save')}</button>
                <button type="button" className="btn" onClick={handleLogout}>{t('sign_out')}</button>
                <span className="status" role="status" aria-live="polite">{status}</span>
              </div>
            </form>
          ) : (
            <div className="group-body pad">
              <p>{t('settings_signed_out')}</p>
              <div className="actions">
                <Link to="/login" className="btn btn-primary">{t('sign_in')}</Link>
                <Link to="/register" className="btn">{t('sign_up')}</Link>
              </div>
            </div>
          )}
        </section>

        <section className="group" aria-labelledby="set-about">
          <h2 id="set-about" className="group-title">{t('settings_about')}</h2>
          <div className="group-body">
            <a className="row link" href="/privacy.html">{t('settings_privacy')}</a>
            <a className="row link" href="https://github.com/nulljosh/atlin">{t('settings_source')}</a>
            <p className="row note">{t('settings_data')}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
