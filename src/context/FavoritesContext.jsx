import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem('brick_favorites')
    return stored ? JSON.parse(stored) : []
  })

  const { user, updateProfile } = useAuth()
  const syncedFor = useRef(null)

  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  useEffect(() => {
    localStorage.setItem('brick_favorites', JSON.stringify(favorites))
  }, [favorites])

  // Signing in merges rather than replaces: homes saved before logging in are
  // still the user's, and a second device must not wipe the first one's list.
  useEffect(() => {
    if (!user) {
      syncedFor.current = null
      return
    }
    if (syncedFor.current === user.id) return
    syncedFor.current = user.id
    setFavorites(local => {
      const merged = [...new Set([...(user.favorites || []), ...local])]
      if (merged.length !== (user.favorites || []).length) updateProfile({ favorites: merged })
      return merged
    })
  }, [user, updateProfile])

  // Every later change belongs to the account too.
  useEffect(() => {
    if (!user || syncedFor.current !== user.id) return
    const stored = user.favorites || []
    if (stored.length === favorites.length && stored.every(id => favoriteSet.has(id))) return
    updateProfile({ favorites })
  }, [favorites, favoriteSet, user, updateProfile])

  function toggle(listingId) {
    setFavorites(prev =>
      favoriteSet.has(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    )
  }

  function isFavorite(listingId) {
    return favoriteSet.has(listingId)
  }

  return (
    <FavoritesContext.Provider value={{ favorites, favoriteSet, toggle, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
