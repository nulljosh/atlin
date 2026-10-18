import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppleButton from '../components/AppleButton'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError(t('auth_err_email'))
    if (!password) return setError(t('auth_err_pw'))

    const result = await login(email.trim(), password)
    if (result.error) return setError(result.error)
    navigate('/browse')
  }


  return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>{t('auth_welcome')}</h1>
        <p className="subtitle">{t('auth_signin_sub')}</p>
        <AppleButton onError={setError} />
        <GoogleButton onError={setError} />
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={error && !email ? 'input-error' : ''}
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              placeholder={t('auth_pw_ph')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={error && !password ? 'input-error' : ''}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {t('sign_in')}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/forgot-password">{t('forgot_password')}</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--muted)' }}>|</span>
          <Link to="/register">{t('auth_create')}</Link>
        </div>
      </div>
    </div>
  )
}
