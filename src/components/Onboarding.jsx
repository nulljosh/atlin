import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../context/AuthContext'
import AtlinMark from './AtlinMark'
import './Onboarding.css'

const KEY = 'atlin-onboarded'
const steps = [1, 2, 3]

// First visit, signed out: three cards, then the choice. Always skippable, never a wall.
export default function Onboarding() {
  const { t } = useI18n()
  const { user, ready } = useAuth()
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(() => { try { return !localStorage.getItem(KEY) } catch { return false } })
  const ref = useRef(null)

  useEffect(() => { if (open && ready && !user && ref.current && !ref.current.open) ref.current.showModal() }, [open, ready, user])
  if (!open || !ready || user) return null

  function finish() {
    try { localStorage.setItem(KEY, '1') } catch { /* private mode: it just shows again */ }
    setOpen(false)
  }
  const last = i === steps.length - 1

  return (
    <dialog ref={ref} className="onboarding" aria-labelledby="ob-title" onCancel={finish}>
      <AtlinMark className="ob-mark" size={56} />
      <h2 id="ob-title">{t(`onboard_${i + 1}_title`)}</h2>
      <p>{t(`onboard_${i + 1}_body`)}</p>
      <div className="ob-dots" aria-hidden="true">{steps.map(n => <i key={n} className={n === i + 1 ? 'on' : ''} />)}</div>
      {last ? (
        <div className="ob-actions">
          <Link to="/register" className="btn btn-primary" onClick={finish}>{t('sign_up')}</Link>
          <Link to="/login" className="btn" onClick={finish}>{t('sign_in')}</Link>
        </div>
      ) : (
        <div className="ob-actions">
          <button className="btn btn-primary" onClick={() => setI(i + 1)}>{t('onboard_next')}</button>
        </div>
      )}
      <button className="ob-skip" onClick={finish}>{t('onboard_skip')}</button>
    </dialog>
  )
}
