import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const FiltersContext = createContext(null)

const defaultFilters = {
  priceMin: 0,
  priceMax: Infinity,
  beds: 0,
  propertyType: 'all',
  sort: 'deal',
  favoritesOnly: false
}

export function FiltersProvider({ children }) {
  const [filters, setFilters] = useState(defaultFilters)
  const { user } = useAuth()
  const touched = useRef(false)
  const seededFor = useRef(null)

  // What Settings saves has to actually do something. Seed the browse filters
  // from the account once per sign-in, and never over the top of a filter the
  // user has already set by hand this session.
  useEffect(() => {
    const prefs = user?.preferences
    if (!prefs || touched.current || seededFor.current === user.id) return
    seededFor.current = user.id
    setFilters(prev => ({
      ...prev,
      priceMin: prefs.priceMin ?? prev.priceMin,
      priceMax: prefs.priceMax || prev.priceMax,
      propertyType: prefs.propertyType && prefs.propertyType !== 'all' ? prefs.propertyType : prev.propertyType
    }))
  }, [user])

  function updateFilter(key, value) {
    touched.current = true
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // AI mode answers with a whole filter set, so it replaces rather than merges.
  function applyFilters(next) {
    touched.current = true
    setFilters(prev => ({ ...defaultFilters, favoritesOnly: prev.favoritesOnly, ...next }))
  }

  function resetFilters() {
    touched.current = true
    setFilters(defaultFilters)
  }

  return (
    <FiltersContext.Provider value={{ filters, updateFilter, applyFilters, resetFilters }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  return useContext(FiltersContext)
}
