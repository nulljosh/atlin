import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import '../components/Onboarding.css'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem('atlin_favorites')
    return stored ? JSON.parse(stored) : []
  })

  const { user, updateProfile } = useAuth()
  const { t } = useI18n()
  const [asking, setAsking] = useState(false)
  const dialog = useRef(null)
  useEffect(() => { if (asking && dialog.current && !dialog.current.open) { dialog.current.showModal(); dialog.current.focus() } }, [asking])
  const syncedFor = useRef(null)

  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  useEffect(() => {
    localStorage.setItem('atlin_favorites', JSON.stringify(favorites))
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
    // Saving belongs to an account; browsing never does.
    if (!user) { setAsking(true); return }
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
      {asking && !user && (
        <dialog ref={dialog} className="save-prompt" tabIndex={-1} aria-labelledby="sp-title" onClose={() => setAsking(false)}>
          <h2 id="sp-title">{t('save_prompt_title')}</h2>
          <p>{t('save_prompt_body')}</p>
          <div className="ob-actions">
            <Link to="/register" className="btn btn-primary" onClick={() => setAsking(false)}>{t('sign_up')}</Link>
            <Link to="/login" className="btn" onClick={() => setAsking(false)}>{t('sign_in')}</Link>
          </div>
          <button className="ob-skip" onClick={() => dialog.current?.close()}>{t('close')}</button>
        </dialog>
      )}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
