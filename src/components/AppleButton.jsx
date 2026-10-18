import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Services ID com.heyitsmejosh.websignin; return URL atlin.jaybulb.com/login is registered with Apple.
const CLIENT_ID = 'com.heyitsmejosh.websignin'

let loading
const loadApple = () => (loading ??= new Promise((ok, no) => {
  const s = document.createElement('script')
  s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
  s.onload = ok
  s.onerror = no
  document.head.append(s)
}))

export default function AppleButton({ onError }) {
  const { loginWithApple } = useAuth()
  const navigate = useNavigate()

  async function go() {
    try {
      await loadApple()
      window.AppleID.auth.init({ clientId: CLIENT_ID, scope: 'name email', redirectURI: `${location.origin}/login`, usePopup: true })
      const { authorization } = await window.AppleID.auth.signIn()
      const r = await loginWithApple(authorization.id_token)
      if (r.error) onError?.(r.error)
      else navigate('/browse')
    } catch (e) {
      if (e?.error !== 'popup_closed_by_user') onError?.('Apple sign-in failed. Use email instead.')
    }
  }

  return (
    <button type="button" className="btn btn-apple" onClick={go}>
      <svg width="16" height="18" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true"><path d="M14.1 10.6c0-2.3 1.9-3.4 2-3.5-1.1-1.600-2.800-1.800-3.400-1.800-1.400-.1-2.800.9-3.500.9-.7 0-1.800-.8-3-.8-1.500 0-3 .9-3.800 2.300-1.600 2.800-.4 7 1.200 9.300.8 1.100 1.700 2.400 2.900 2.300 1.200 0 1.600-.7 3-.7s1.800.7 3 .7c1.300 0 2.100-1.100 2.800-2.300.9-1.300 1.300-2.600 1.300-2.700 0 0-2.500-1-2.500-3.700zM11.800 3.800c.6-.8 1.100-1.800.9-2.800-.9 0-2 .6-2.700 1.400-.6.700-1.100 1.800-1 2.700 1 .1 2.100-.5 2.800-1.300z"/></svg>
      Sign in with Apple
    </button>
  )
}
