import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppleButton from '../components/AppleButton'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { register } = useAuth()
  const { t } = useI18n()


  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError(t('auth_err_name'))
    if (!email.trim()) return setError(t('auth_err_email'))
    if (password.length < 8) return setError(t('auth_err_pw_short'))
    if (password !== confirm) return setError(t('auth_err_pw_match'))

    const result = await register(name.trim(), email.trim(), password)
    if (result.error) return setError(result.error)
    setSent(true)
  }

  if (sent) return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>{t('auth_check_email')}</h1>
        <p className="subtitle">{t('auth_sent', { email: email.trim() })}</p>
        <p className="auth-switch"><Link to="/login">{t('auth_go_signin')}</Link></p>
      </div>
    </div>
  )

  return (
    <div className="page-auth">
      <div className="auth-card fade-up">
        <h1>{t('auth_create')}</h1>
        <p className="subtitle">{t('auth_create_sub')}</p>
        <AppleButton onError={setError} />
        <GoogleButton onError={setError} />
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">{t('auth_name')}</label>
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
          <div className="input-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              placeholder={t('auth_pw_new_ph')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm">{t('auth_confirm')}</label>
            <input
              id="confirm"
              type="password"
              placeholder={t('auth_confirm_ph')}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {t('auth_create')}
          </button>
        </form>
        <div className="auth-footer">
          {t('auth_have_account')} <Link to="/login">{t('sign_in')}</Link>
        </div>
      </div>
    </div>
  )
}
