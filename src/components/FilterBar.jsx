import { useState } from 'react'
import { useFilters } from '../context/FiltersContext'
import { usePlace } from '../context/PlaceContext'
import { useI18n } from '../i18n'
import { marketFor, formatMoneyCompact } from '../lib/market'
import { propertyTypes } from '../data/listings'
import { modes, modeActive } from '../lib/modes'
import './FilterBar.css'

// A fixed "under $500K" band is meaningless in Lagos and in Zurich, so the
// bands are cut from the local market's own price scale.
function priceBands(market, mode) {
  const base = mode === 'rent'
    ? (400000 * market.level * market.grossYield) / 12
    : 400000 * market.level
  const steps = [0.5, 1, 2].map(m => roundNice(base * m))
  return [
    { min: 0, max: Infinity },
    { min: 0, max: steps[0] },
    { min: steps[0], max: steps[1] },
    { min: steps[1], max: steps[2] },
    { min: steps[2], max: Infinity }
  ]
}

function roundNice(n) {
  const mag = 10 ** Math.floor(Math.log10(n))
  return Math.round(n / (mag / 2)) * (mag / 2)
}

const bedOptions = [0, 1, 2, 3, 4]
const sortOptions = ['deal', 'price-asc', 'price-desc', 'newest', 'sqft-desc']
const sortKeys = {
  deal: 'sort_deal',
  'price-asc': 'sort_price_asc',
  'price-desc': 'sort_price_desc',
  newest: 'sort_newest',
  'sqft-desc': 'sort_largest'
}

export default function FilterBar({ resultCount }) {
  const { filters, updateFilter, applyFilters } = useFilters()
  const { place, mode, setMode, saleAvailable } = usePlace()
  const { language, t } = useI18n()
  const market = marketFor(place.countryCode)
  const money = n => formatMoneyCompact(n, market.currency, language)

  function bandLabel(band, i) {
    if (i === 0) return t('any_price')
    if (band.max === Infinity) return `${money(band.min)}+`
    if (band.min === 0) return `< ${money(band.max)}`
    return `${money(band.min)} – ${money(band.max)}`
  }

  const bands = priceBands(market, mode)
  const bandIndex = Math.max(0, bands.findIndex(b => b.min === filters.priceMin && b.max === filters.priceMax))
  // On a phone the four menus fold behind one Filters capsule; the count says how many are set.
  const [open, setOpen] = useState(false)
  const active = [bandIndex > 0, filters.beds > 0, filters.propertyType !== 'all', filters.sort !== 'deal'].filter(Boolean).length

  return (
    <div className="filter-bar">
      <div className="modes" role="group" aria-label={t('sort')}>
        {modes.map(m => (
          <button key={m.key} className={`chip ${modeActive(m, filters) ? 'active' : ''}`} aria-pressed={modeActive(m, filters)}
            onClick={() => applyFilters({ ...filters, ...m.set })}>{t(m.key)}</button>
        ))}
      </div>
      {saleAvailable && <div className="segmented" role="group" aria-label={place.name}>
        <button className={mode === 'sale' ? 'active' : ''} aria-pressed={mode === 'sale'} onClick={() => setMode('sale')}>{t('for_sale')}</button>
        <button className={mode === 'rent' ? 'active' : ''} aria-pressed={mode === 'rent'} onClick={() => setMode('rent')}>{t('for_rent')}</button>
      </div>}
      <div className={`filter-menus ${open ? 'open' : ''}`} id="filter-menus">
        <Menu label={t('price')} value={bandIndex} onChange={i => { updateFilter('priceMin', bands[i].min); updateFilter('priceMax', bands[i].max) }}>
          {bands.map((band, i) => <option key={i} value={i}>{bandLabel(band, i)}</option>)}
        </Menu>
        <Menu label={t('beds')} value={filters.beds} onChange={v => updateFilter('beds', +v)}>
          {bedOptions.map(v => <option key={v} value={v}>{v === 0 ? t('any_beds') : `${v}+ ${t('beds')}`}</option>)}
        </Menu>
        <Menu label={t('type')} value={filters.propertyType} onChange={v => updateFilter('propertyType', v)}>
          {['all', ...propertyTypes].map(v => <option key={v} value={v}>{v === 'all' ? t('all_types') : t(v)}</option>)}
        </Menu>
        <Menu label={t('sort')} value={filters.sort} onChange={v => updateFilter('sort', v)}>
          {sortOptions.map(v => <option key={v} value={v}>{t(sortKeys[v])}</option>)}
        </Menu>
      </div>
      <div className="filter-result-count">
        <span className="section-label">{t('results', { n: new Intl.NumberFormat(language).format(resultCount) })}</span>
        <button className={`chip filters-toggle ${open || active ? 'active' : ''}`} aria-expanded={open} aria-controls="filter-menus" onClick={() => setOpen(o => !o)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>
          {t('filters')}{active > 0 && ` · ${active}`}
        </button>
        <button
          className={`chip ${filters.favoritesOnly ? 'active' : ''}`}
          aria-pressed={filters.favoritesOnly}
          onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={filters.favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {t('favorites')}
        </button>
      </div>
    </div>
  )
}

// A native select drawn as a capsule: the system picker on a phone, a menu on a Mac.
function Menu({ label, value, onChange, children }) {
  return (
    <label className="menu">
      <span className="menu-label">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}>{children}</select>
    </label>
  )
}
