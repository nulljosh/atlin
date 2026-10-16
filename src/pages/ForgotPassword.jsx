import { useState } from 'react'
import { Link } from 'react-router-dom'
import { spark } from '../lib/spark.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('Email is required')
    if (!email.includes('@')) return setError('Enter a valid email address')
    const { error: err } = await spark.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://brick.jaybulb.com/reset-password'
    })
    if (err) return setError(err.message)
    setSent(true)
  }

  return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>Reset password</h1>
        <p className="subtitle">
          {sent
            ? 'Check your inbox for a reset link'
            : 'Enter your email to receive a reset link'}
        </p>
        {!sent ? (
          <form onSubmit={handleSubmit}>
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
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Send reset link
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p className="success-text" style={{ marginBottom: '1.5rem' }}>
              If an account exists for {email}, a reset link has been sent.
            </p>
            <button className="btn btn-primary" onClick={() => setSent(false)}>
              Try another email
            </button>
          </div>
        )}
        <div className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
