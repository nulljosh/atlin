import { useState } from 'react'
import { Link } from 'react-router-dom'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { register } = useAuth()


  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Name is required')
    if (!email.trim()) return setError('Email is required')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')

    const result = await register(name.trim(), email.trim(), password)
    if (result.error) return setError(result.error)
    setSent(true)
  }

  if (sent) return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>Check your email</h1>
        <p className="subtitle">We sent a link to {email.trim()}. Open it to confirm, then sign in.</p>
        <p className="auth-switch"><Link to="/login">Go to sign in</Link></p>
      </div>
    </div>
  )

  return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>Create account</h1>
        <p className="subtitle">Start browsing homes anywhere</p>
        <GoogleButton onError={setError} />
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Create account
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
