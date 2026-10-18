import { useState } from 'react'
import { useFilters } from '../context/FiltersContext'
import { usePlace } from '../context/PlaceContext'
import { useI18n } from '../i18n'
import { marketFor, formatMoneyCompact } from '../lib/market'
import { parseAsk } from '../lib/ask'
import './AskBar.css'

const sortKeys = { deal: 'sort_deal', 'price-asc': 'sort_price_asc', 'price-desc': 'sort_price_desc', newest: 'sort_newest', 'sqft-desc': 'sort_largest' }

export default function AskBar({ resultCount, onAnswer }) {
  const { applyFilters } = useFilters()
  const { place } = usePlace()
  const { language, t } = useI18n()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState(null)
  const money = n => formatMoneyCompact(n, marketFor(place.countryCode).currency, language)

  async function ask(text) {
    const query = text.trim()
    if (!query || busy) return
    setQ(query)
    setBusy(true)
    let filters
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: query }) })
      filters = (await res.json()).filters
    } catch {}
    // Offline, or no function behind this host: the same rules run locally.
    filters ||= parseAsk(query)
    applyFilters(filters)
    setAnswer(filters)
    setBusy(false)
    onAnswer?.()
  }

  const parts = answer && [
    answer.beds && `${answer.beds}+ ${t('beds').toLowerCase()}`,
    answer.priceMin && `> ${money(answer.priceMin)}`,
    answer.priceMax && `< ${money(answer.priceMax)}`,
    answer.propertyType && t(answer.propertyType),
    t(sortKeys[answer.sort] || 'sort_deal')
  ].filter(Boolean)

  return (
    <div className="ask">
      <form className={`ask-bar${busy ? ' busy' : ''}`} onSubmit={e => { e.preventDefault(); ask(q) }}>
        <svg className="ask-spark" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('ask_placeholder')}
          aria-label={t('ask_placeholder')}
          maxLength={200}
          enterKeyHint="search"
        />
        <button className="btn btn-primary" disabled={busy || !q.trim()}>{t('ask_button')}</button>
      </form>
      {parts && (
        <p className="ask-answer" key={parts.join()} role="status">
          <strong>{t('results', { n: new Intl.NumberFormat(language).format(resultCount) })}</strong>
          {parts.map(p => <span key={p}>{p}</span>)}
        </p>
      )}
    </div>
  )
}
