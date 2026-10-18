import { useState } from 'react'
import { Link } from 'react-router-dom'
import { spark } from '../lib/spark.js'
import { useI18n } from '../i18n'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { t } = useI18n()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError(t('auth_err_email'))
    if (!email.includes('@')) return setError(t('auth_err_email_bad'))
    const { error: err } = await spark.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://atlin.jaybulb.com/reset-password'
    })
    if (err) return setError(err.message)
    setSent(true)
  }

  return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>{t('auth_reset')}</h1>
        <p className="subtitle">
          {sent
            ? t('auth_reset_sent_sub')
            : t('auth_reset_sub')}
        </p>
        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">{t('email')}</label>
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
              {t('auth_send_link')}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p className="success-text" style={{ marginBottom: '1.5rem' }}>
              {t('auth_reset_sent', { email })}
            </p>
            <button className="btn btn-primary" onClick={() => setSent(false)}>
              {t('auth_try_another')}
            </button>
          </div>
        )}
        <div className="auth-footer">
          <Link to="/login">{t('auth_back_signin')}</Link>
        </div>
      </div>
    </div>
  )
}
