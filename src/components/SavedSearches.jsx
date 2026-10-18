import { useState } from 'react'
import { useFilters } from '../context/FiltersContext'
import { usePlace } from '../context/PlaceContext'

const KEY = 'atlin-searches'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
const store = list => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {} }

// A saved search is a place, a mode and a filter set; tapping one puts all three back.
// ponytail: this browser only. Sync through the account and add alerts when people ask.
export function useSavedSearches() {
  const [list, setList] = useState(load)
  const { place, mode } = usePlace()
  const { filters } = useFilters()
  const id = `${place.id}|${mode}|${filters.beds}|${filters.priceMin}|${filters.priceMax}|${filters.propertyType}`
  const saved = list.some(s => s.id === id)
  function toggle() {
    const label = [place.name, mode === 'sale' ? 'Buy' : 'Rent', filters.beds > 0 && `${filters.beds}+ bd`].filter(Boolean).join(' · ')
    const next = saved ? list.filter(s => s.id !== id) : [{ id, label, place, mode, filters }, ...list].slice(0, 12)
    setList(next); store(next)
  }
  function remove(sid) { const next = list.filter(s => s.id !== sid); setList(next); store(next) }
  return { list, saved, toggle, remove }
}

export function SavedRow({ searches }) {
  const { setPlace, setMode } = usePlace()
  const { applyFilters } = useFilters()
  if (!searches.list.length) return null
  return (
    <div className="modes saved-row" role="group" aria-label="Saved searches">
      {searches.list.map(s => (
        <span key={s.id} className="chip saved-chip">
          <button onClick={() => { setPlace(s.place); setMode(s.mode); applyFilters({ ...s.filters, priceMax: s.filters.priceMax ?? Infinity }) }}>{s.label}</button>
          <button className="saved-x" aria-label={`Remove ${s.label}`} onClick={() => searches.remove(s.id)}>×</button>
        </span>
      ))}
    </div>
  )
}

export function SaveButton({ searches }) {
  return (
    <button className={`chip chip-icon ${searches.saved ? 'active' : ''}`} aria-pressed={searches.saved} aria-label={searches.saved ? 'Saved search' : 'Save search'} title={searches.saved ? 'Saved search' : 'Save search'} onClick={searches.toggle}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={searches.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>
  )
}
