import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Public web client id (jaybulb-signin). Not a secret; jaybulb-api checks it as an audience.
const CLIENT_ID = '337798947774-he7noqsqk3epo00ic06ibpom75p3tr3h.apps.googleusercontent.com'

let loading
const loadGsi = () => (loading ??= new Promise((ok, no) => {
  const s = document.createElement('script')
  s.src = 'https://accounts.google.com/gsi/client'
  s.onload = ok
  s.onerror = no
  document.head.append(s)
}))

export default function GoogleButton({ onError }) {
  const box = useRef(null)
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    loadGsi().then(() => {
      if (!live) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          const r = await loginWithGoogle(credential)
          if (r.error) onError?.(r.error)
          else navigate('/browse')
        },
      })
      window.google.accounts.id.renderButton(box.current, { type: 'standard', shape: 'pill', size: 'large', width: Math.min(400, box.current.offsetWidth) })
    }).catch(() => {})
    return () => { live = false }
  }, [])

  return <div ref={box} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0', minHeight: 44, width: '100%' }} />
}
