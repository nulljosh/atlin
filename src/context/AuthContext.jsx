import { createContext, useContext, useState, useEffect } from 'react'
import { spark, authConfigured } from '../lib/spark.js'

function generatePixelArtSVG() {
  const palettes = [['#0071e3','#4aa3ff','#1d1d1f'],['#1d1d1f','#6e6e73','#d2d2d7'],['#0071e3','#d2d2d7','#6e6e73']]
  const bgs = ['#111','#1c1c1e','#2c2c2e']
  const palette = palettes[Math.floor(Math.random() * palettes.length)]
  const bg = bgs[Math.floor(Math.random() * bgs.length)]
  const px = 8, size = 8, total = size * px
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: Math.ceil(size / 2) }, () =>
      Math.random() > 0.45 ? Math.floor(Math.random() * 3) : -1))
  let rects = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const ci = grid[row][col < size / 2 ? col : size - 1 - col]
      if (ci >= 0) rects += `<rect x="${col * px}" y="${row * px}" width="${px}" height="${px}" fill="${palette[ci]}"/>`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${bg}"/>${rects}</svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function mapUser(sbUser) {
  if (!sbUser) return null
  const meta = sbUser.user_metadata || {}
  return {
    id: sbUser.id,
    email: sbUser.email,
    name: meta.name || '',
    avatar: meta.avatar || null,
    preferences: meta.preferences || {
      notifications: true,
      priceMin: 0,
      priceMax: 5000000,
      location: 'all',
      propertyType: 'all'
    },
    favorites: Array.isArray(meta.favorites) ? meta.favorites : null,
    createdAt: sbUser.created_at
  }
}

const AuthContext = createContext(null)

// Local QA only: `npm run dev` then /browse?preview. Vite drops this from builds.
const preview = import.meta.env.DEV && new URLSearchParams(location.search).has('preview')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(preview ? mapUser({ id: 'preview', email: 'preview@localhost' }) : null)
  // getSession is async, so until it answers we do not know whether there is a
  // session. Routing on `user` alone bounced signed-in people to /login on any
  // refresh or deep link.
  const [recovering, setRecovering] = useState(false)
  const [ready, setReady] = useState(!authConfigured || preview)

  useEffect(() => {
    if (!authConfigured || preview) return
    spark.auth.getSession().then(({ data: { session } }) => {
      setUser(mapUser(session?.user ?? null))
      setReady(true)
    })

    const { data: { subscription } } = spark.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') { setRecovering(true); return }
      setUser(mapUser(session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    if (!authConfigured) return { error: 'Sign-in is not configured on this deployment.' }
    const { error } = await spark.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { success: true }
  }


  async function loginWithGoogle(token) {
    const { error } = await spark.auth.signInWithIdToken({ provider: 'google', token })
    if (error) return { error: error.message }
    return { success: true }
  }

  async function register(name, email, password) {
    if (!authConfigured) return { error: 'Sign-in is not configured on this deployment.' }
    const { error } = await spark.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          avatar: generatePixelArtSVG(),
          preferences: {
            notifications: true,
            priceMin: 0,
            priceMax: 5000000,
            location: 'all',
            propertyType: 'all'
          }
        }
      }
    })
    if (error) return { error: error.message }
    return { success: true }
  }

  async function updateProfile(updates) {
    const { name, email, preferences, avatar, favorites } = updates
    const data = {}
    if (name !== undefined) data.name = name
    if (preferences !== undefined) data.preferences = preferences
    if (avatar !== undefined) data.avatar = avatar
    if (favorites !== undefined) data.favorites = favorites

    const params = { data }
    if (email !== undefined) params.email = email

    if (!authConfigured) return { error: 'Sign-in is not configured on this deployment.' }
    const { data: result, error } = await spark.auth.updateUser(params)
    if (!error && result.user) setUser(mapUser(result.user))
  }

  async function logout() {
    if (!authConfigured) return { error: 'Sign-in is not configured on this deployment.' }
    await spark.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, loginWithGoogle, register, updateProfile, logout }}>
      {children}
      {recovering && <RecoveryForm onDone={() => { setRecovering(false); window.location.assign('/') }} />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// A reset link lands on the site with ?recovery_token=...; the client announces it and we ask for the new password.
function RecoveryForm({ onDone }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters')
    const { error: err } = await spark.auth.updateUser({ password })
    if (err) return setError(err.message)
    onDone()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <form onSubmit={submit} style={{ background: 'var(--bg, #fff)', color: 'inherit', padding: '1.5rem', borderRadius: 12, display: 'grid', gap: '.75rem', width: 'min(92vw, 340px)' }}>
        <strong>Choose a new password</strong>
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password, 8 characters or more" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <span className="error-text">{error}</span>}
        <button type="submit" className="btn btn-primary">Save password</button>
      </form>
    </div>
  )
}
