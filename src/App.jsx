import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import Landing from './pages/Landing'
const Listings = lazy(() => import('./pages/Listings'))
const ListingDetail = lazy(() => import('./pages/ListingDetail'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Settings = lazy(() => import('./pages/Settings'))
import { WebMCP } from './lib/webmcp'

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  // The landing runs the real app in a frame-less iframe: /browse?embed.
  const embed = new URLSearchParams(location.search).has('embed')
  document.documentElement.classList.toggle('embed', embed)

  return (
    <div className="app">
      <div className="noise-overlay" />
      {!embed && location.pathname !== '/' && <Nav />}
      {user && <WebMCP />}
      <Suspense fallback={<p role="status">Loading…</p>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={user ? <Navigate to="/browse" replace /> : <Landing />} />
        <Route path="/browse" element={<Listings />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
      </Suspense>
    </div>
  )
}
