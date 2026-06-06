import React from 'react'

const T = {
  en: {
    title:'DigitalRohtak', sub:'Rohtak Properties', loc:'📍 Rohtak, Haryana, India ☸',
    mobPh:'10-digit mobile number', cont:'Continue →',
    step2hint:'Enter Property ID (required) + any one more field to verify',
    pidLabel:'Property ID', ownerLabel:'Owner Name', colonyLabel:'Colony Name', addrLabel:'Address',
    required:'*', searchBtn:'Search Property', clearBtn:'Clear',
    emptyTitle:'Search for a Property', emptySub:'Enter Property ID to get started',
    noMatchTitle:'No matching property found', noMatchSub:'Please verify your Property ID and other details',
    owner:'Owner Name', colony:'Colony', address:'Address',
    cert:'Self Certified', details:'View on ULB Portal',
    yes:'✓ Yes', no:'— No', logout:'Logout',
    f1:'© Sadahaq International | Managed by Sadahaq Trust'
  },
  hi: {
    title:'डिजिटल रोहतक', sub:'रोहतक संपत्तियां', loc:'📍 रोहतक, हरियाणा, भारत ☸',
    mobPh:'10 अंकों का मोबाइल नंबर', cont:'जारी रखें →',
    step2hint:'संपत्ति ID (अनिवार्य) + कोई एक और फ़ील्ड भरें',
    pidLabel:'संपत्ति ID', ownerLabel:'मालिक का नाम', colonyLabel:'कॉलोनी का नाम', addrLabel:'पता',
    required:'*', searchBtn:'संपत्ति खोजें', clearBtn:'साफ़ करें',
    emptyTitle:'संपत्ति खोजें', emptySub:'शुरू करने के लिए संपत्ति ID दर्ज करें',
    noMatchTitle:'कोई मिलान नहीं मिला', noMatchSub:'कृपया अपनी संपत्ति ID और अन्य विवरण जांचें',
    owner:'मालिक', colony:'कॉलोनी', address:'पता',
    cert:'स्व-प्रमाणित', details:'ULB पोर्टल पर देखें',
    yes:'✓ हाँ', no:'— नहीं', logout:'लॉगआउट',
    f1:'© सदाहक इंटरनेशनल | प्रबंधित सदाहक ट्रस्ट द्वारा'
  }
}

function Login({ onLogin, lang, setLang }) {
  const [mob, setMob] = React.useState('')
  const [pin, setPin] = React.useState('')
  const [showPin, setShowPin] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [emailOtp, setEmailOtp] = React.useState('')
  const [step, setStep] = React.useState(1)
  const [pid, setPid] = React.useState('')
  const [owner, setOwner] = React.useState('')
  const [colony, setColony] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')
  const [colonies, setColonies] = React.useState([])
  const [verifiedRecord, setVerifiedRecord] = React.useState(null)
  const [usePasskey, setUsePasskey] = React.useState(false)
  const [rememberMe, setRememberMe] = React.useState(true)
  const t = T[lang]

  React.useEffect(() => {
    fetch('/api/colonies').then(r => r.json()).then(res => setColonies(res.colonies || [])).catch(() => {})
    checkPasskeyAvailable()
  }, [])

  async function checkPasskeyAvailable() {
    if (window.PublicKeyCredential) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      setUsePasskey(available)
    }
  }

  async function loginWithPasskey() {
    try {
      const credentialId = localStorage.getItem('dr_passkey_id')
      if (!credentialId) {
        setError(lang === 'en' ? 'No passkey found. Please register first.' : 'कोई पासकी नहीं मिली। कृपया पहले पंजीकरण करें।')
        return
      }
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)) }],
          userVerification: 'required'
        }
      })
      if (credential) {
        const stored = localStorage.getItem('dr_user')
        if (stored) {
          const u = JSON.parse(stored)
          onLogin(u)
        }
      }
    } catch (err) {
      setError(lang === 'en' ? 'Passkey authentication failed' : 'पासकी प्रमाणीकरण विफल')
    }
  }

  async function checkMobile() {
    if (mob.length < 10) return
    if (!['6', '7', '8', '9'].includes(mob[0])) {
      setError(lang === 'en' ? 'Mobile number must start with 6, 7, 8, or 9' : 'मोबाइल नंबर 6, 7, 8, या 9 से शुरू होना चाहिए')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/register-mobile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91' + mob })
      }).then(r => r.json())
      
      if (res.existing) {
        setStep(2)
      } else {
        setStep(2)
      }
    } catch (err) {
      setError('Server error')
    } finally {
      setVerifying(false)
    }
  }

  async function verifyPinAndLogin() {
    if (!pin.trim() || pin.length < 4) {
      setError(lang === 'en' ? 'PIN must be at least 4 digits' : 'PIN कम से कम 4 अंकों का होना चाहिए')
      return
    }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91' + mob, pin: pin.trim() })
      }).then(r => r.json())
      
      if (res.success) {
        const roles = res.user.role ? res.user.role.split(',') : []
        const u = { mobile: '+91' + mob, pid: res.user.pid || '', verified: true, roles, email: res.user.email || '' }
        if (rememberMe) {
          localStorage.setItem('dr_user', JSON.stringify(u))
          localStorage.setItem('dr_session_expiry', Date.now() + (365 * 24 * 60 * 60 * 1000))
        }
        onLogin(u)
      } else if (res.new_user) {
        // New user - save PIN immediately and go to role selection
        await fetch('/api/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: '+91' + mob, pin: pin.trim(), pid: '', intent: 'new', role: 'new' })
        })
        setStep(6)
      } else {
        setError(lang === 'en' ? 'Invalid PIN' : 'गलत PIN')
      }
    } catch (err) {
      setError('Server error')
    } finally {
      setVerifying(false)
    }
  }

  function sendEmailOTP() {
    if (!email.trim()) {
      setError(lang === 'en' ? 'Please enter email address' : 'कृपया ईमेल पता दर्ज करें')
      return
    }
    if (!email.includes('@')) {
      setError(lang === 'en' ? 'Please enter a valid email address' : 'कृपया वैध ईमेल पता दर्ज करें')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError(lang === 'en' ? 'Please enter a valid email address' : 'कृपया वैध ईमेल पता दर्ज करें')
      return
    }
    setVerifying(true)
    setError('')
    fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        setStep(4)
      } else {
        setError(res.error || 'Failed to send OTP')
      }
    }).catch(() => setError('Server error')).finally(() => setVerifying(false))
  }

  function verifyEmailOTP() {
    if (!emailOtp.trim() || emailOtp.length !== 4) {
      setError(lang === 'en' ? 'Please enter 4-digit OTP' : 'कृपया 4 अंकों का OTP दर्ज करें')
      return
    }
    setVerifying(true)
    setError('')
    fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), otp: emailOtp.trim() })
    }).then(r => r.json()).then(async res => {
      if (res.verified) {
        // OTP verified - now ask for new PIN
        const newPin = prompt(lang === 'en' ? 'Enter new 4-6 digit PIN:' : 'नया 4-6 अंकों का PIN दर्ज करें:')
        if (newPin && newPin.length >= 4 && /^\d+$/.test(newPin)) {
          // Update PIN and email in database
          await fetch('/api/save-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '+91' + mob, pin: newPin, email: email.trim(), pid: '', intent: 'reset', role: 'reset' })
          })
          alert(lang === 'en' ? '✓ PIN reset successful! Please login with new PIN.' : '✓ PIN रीसेट सफल! कृपया नए PIN से लॉगिन करें।')
          setStep(1)
          setPin('')
          setEmail('')
          setEmailOtp('')
        } else {
          setError(lang === 'en' ? 'Invalid PIN format' : 'गलत PIN प्रारूप')
        }
      } else {
        setError(res.error || 'Invalid OTP')
      }
    }).catch(() => setError('Server error')).finally(() => setVerifying(false))
  }
  function verify() {
    if (!pid.trim()) { setError(lang === 'en' ? 'Property ID is required' : 'संपत्ति ID अनिवार्य है'); return }
    const extras = [owner, colony, address].filter(v => v.trim().length > 0)
    if (extras.length < 1) { setError(lang === 'en' ? 'Please fill at least one more field' : 'कृपया कम से कम एक और फ़ील्ड भरें'); return }
    setVerifying(true); setError('')
    fetch('/api/verify-property', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid.trim(), owner_name: owner, colony, address })
    }).then(r => r.json()).then(res => {
      if (res.verified) {
        setVerifiedRecord({ mobile: '+91' + mob, pid: res.record.pid, pin: pin.trim(), email: email.trim() || '' })
        setStep(6)
      } else {
        setError(lang === 'en' ? 'Property not found or details do not match' : 'संपत्ति नहीं मिली या विवरण मेल नहीं खाते')
      }
    }).catch(() => setError('Server error')).finally(() => setVerifying(false))
  }

  async function handleRoleSelection(intent, roles) {
    const u = { mobile: '+91' + mob, pid: '', verified: true, roles, email: '' }
    if (rememberMe) {
      localStorage.setItem('dr_user', JSON.stringify(u))
      localStorage.setItem('dr_session_expiry', Date.now() + (365 * 24 * 60 * 60 * 1000))
    }
    await fetch('/api/save-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: u.mobile, pid: '', intent, role: roles.join(','), pin: pin.trim(), email: '' }) })
    await createPasskey(u)
    onLogin(u)
  }

  async function createPasskey(user) {
    if (!window.PublicKeyCredential) return
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      const userId = new TextEncoder().encode(user.mobile)
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'DigitalRohtak', id: window.location.hostname },
          user: { id: userId, name: user.mobile, displayName: user.mobile },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { userVerification: 'required', authenticatorAttachment: 'platform' },
          timeout: 60000
        }
      })
      if (credential) {
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
        localStorage.setItem('dr_passkey_id', credentialId)
      }
    } catch (err) {
      console.log('Passkey creation skipped:', err)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card" style={{ maxWidth: step === 6 ? 520 : 400 }}>
        <div className="flag"><div className="s"/><div className="w"/><div className="g"/></div>
        <div className="lang-row">
          <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
        <div className="wheel">☸</div>
        <div className="login-title">{t.title}</div>
        <div className="login-sub">{t.sub}</div>
        <div className="login-loc">{t.loc}</div>

        {step === 1 && <>
          <label className="field-label">📱 {lang === 'en' ? 'Mobile Number' : 'मोबाइल नंबर'}</label>
          <div className="mob-row">
            <div className="cc">🇮🇳 +91</div>
            <input className="finput" style={{ marginBottom: 0 }} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10}
              placeholder={t.mobPh} value={mob}
              onChange={e => setMob(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && mob.length === 10 && checkMobile()} autoFocus />
          </div>
          {error && <div className="err">⚠️ {error}</div>}
          <button className="cont-btn" style={{ marginTop: 6 }} onClick={checkMobile} disabled={mob.length < 10 || verifying}>
            {verifying ? '...' : t.cont}
          </button>
          {usePasskey && localStorage.getItem('dr_passkey_id') && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button onClick={loginWithPasskey} style={{ background: 'none', border: '2px solid var(--g)', color: 'var(--g)', padding: '10px 20px', borderRadius: 8, fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}>
                🔐 {lang === 'en' ? 'Login with Biometric' : 'बायोमेट्रिक से लॉगिन'}
              </button>
            </div>
          )}
        </>}

        {step === 2 && <>
          <label className="field-label">🔐 {lang === 'en' ? 'Enter Your PIN' : 'अपना PIN दर्ज करें'}</label>
          <div style={{ position: 'relative' }}>
            <input className="finput" type={showPin ? "tel" : "password"} inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder={lang === 'en' ? 'Enter PIN (min 4 digits)' : 'PIN दर्ज करें (कम से कम 4 अंक)'} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} style={{ paddingRight: '45px' }} autoFocus />
            <button type="button" onClick={() => setShowPin(!showPin)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '5px', lineHeight: 1 }}>
              {showPin ? '👁️' : '🔒'}
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: '.85rem' }}>
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <span>{lang === 'en' ? 'Remember me' : 'मुझे याद रखें'}</span>
          </label>
          {error && <div className="err">⚠️ {error}</div>}
          <button className="cont-btn" onClick={verifyPinAndLogin} disabled={verifying || pin.length < 4}>
            {verifying ? '...' : (lang === 'en' ? 'Continue →' : 'जारी रखें →')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '.85rem' }}>
            <div className="back-link" onClick={() => { setStep(1); setPin(''); setError('') }}>← {lang === 'en' ? 'Back' : 'वापस'}</div>
            <div className="back-link" onClick={async () => {
              // Check if user has email
              const res = await fetch('/api/register-mobile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: '+91' + mob })
              }).then(r => r.json())
              
              if (res.existing && res.existing.email) {
                setEmail(res.existing.email)
                // Send OTP directly
                fetch('/api/send-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: res.existing.email })
                }).then(r => r.json()).then(otpRes => {
                  if (otpRes.success) {
                    setStep(4)
                  } else {
                    setError('Failed to send OTP')
                  }
                })
              } else {
                // No email, ask for it
                setStep(3)
              }
            }} style={{ color: 'var(--s)' }}>{lang === 'en' ? 'Forgot PIN?' : 'PIN भूल गए?'}</div>
          </div>
        </>}

        {step === 3 && <>
          <label className="field-label">📧 {lang === 'en' ? 'Email Address' : 'ईमेल पता'}</label>
          <input className="finput" type="email" placeholder={lang === 'en' ? 'your@email.com' : 'आपका@ईमेल.com'} value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          <div style={{ fontSize: '.8rem', color: '#888', marginTop: 8, lineHeight: 1.4 }}>
            {lang === 'en' ? 'We\'ll send a verification code to create/reset your PIN' : 'हम आपका PIN बनाने/रीसेट करने के लिए कोड भेजेंगे'}
          </div>
          {error && <div className="err">⚠️ {error}</div>}
          <button className="cont-btn" onClick={sendEmailOTP} disabled={verifying}>
            {verifying ? '...' : (lang === 'en' ? 'Send OTP →' : 'OTP भेजें →')}
          </button>
          <div className="back-link" onClick={() => { setStep(2); setEmail(''); setError('') }}>← {lang === 'en' ? 'Back' : 'वापस'}</div>
        </>}

        {step === 4 && <>
          <div className="hint">📧 {lang === 'en' ? `OTP sent to ${email}` : `${email} पर OTP भेजा गया`}</div>
          <label className="field-label">{lang === 'en' ? 'Enter 4-digit OTP' : '4 अंकों का OTP दर्ज करें'}</label>
          <input className="finput" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="0000" value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
          {error && <div className="err">⚠️ {error}</div>}
          <button className="cont-btn" onClick={verifyEmailOTP} disabled={verifying}>
            {verifying ? '...' : (lang === 'en' ? 'Verify →' : 'सत्यापित करें →')}
          </button>
          <div className="back-link" onClick={() => { setStep(3); setEmailOtp(''); setError('') }}>← {lang === 'en' ? 'Back' : 'वापस'}</div>
        </>}

        {step === 5 && <>
          <div className="hint">🔐 {t.step2hint}</div>
          <label className="field-label">{t.pidLabel} <span style={{ color: 'var(--s)' }}>*</span></label>
          <input className="finput" placeholder={t.pidLabel} value={pid} onChange={e => setPid(e.target.value)} autoFocus />
          <label className="field-label">{t.ownerLabel} <span style={{ color: '#ccc', fontSize: '.72rem' }}>{lang === 'en' ? '(optional if NA)' : '(वैकल्पिक)'}</span></label>
          <input className="finput" placeholder={t.ownerLabel} value={owner} onChange={e => setOwner(e.target.value)} />
          <label className="field-label">{t.colonyLabel}</label>
          <select className="finput" value={colony} onChange={e => setColony(e.target.value)}>
            <option value="">{lang === 'en' ? 'Select Colony' : 'कॉलोनी चुनें'}</option>
            {colonies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="field-label">{t.addrLabel}</label>
          <input className="finput" placeholder={t.addrLabel} value={address} onChange={e => setAddress(e.target.value)} />
          {error && <div className="err">⚠️ {error}</div>}
          <button className="cont-btn" onClick={verify} disabled={verifying}>
            {verifying ? '...' : (lang === 'en' ? 'Verify & Enter →' : 'सत्यापित करें →')}
          </button>
          <div className="back-link" onClick={() => { setStep(2); setError('') }}>← {lang === 'en' ? 'Back' : 'वापस'}</div>
        </>}

        {step === 6 && <>
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--g)', marginBottom: 4 }}>
              {lang === 'en' ? '✓ Property Verified' : '✓ संपत्ति सत्यापित'}
            </div>
            <div style={{ fontSize: '.75rem', color: '#888' }}>
              {lang === 'en' ? 'Now select your role(s) to continue' : 'जारी रखने के लिए अपनी भूमिका चुनें'}
            </div>
          </div>
          <IntentSelector lang={lang} onDone={handleRoleSelection} />
          <div className="back-link" onClick={() => setStep(3)}>← {lang === 'en' ? 'Back' : 'वापस'}</div>
        </>}
      </div>
    </div>
  )
}

function PropertyCard({ record, t }) {
  return (
    <div className="prop-card">
      <div className="card-header">
        <div>
          <div style={{ color: 'rgba(255,255,255,.85)', fontSize: '.72rem', marginBottom: 4, fontWeight: 600, letterSpacing: '.5px' }}>PROPERTY ID</div>
          <div className="card-pid">{(record.pid || '').toUpperCase()}</div>
        </div>
        <div className="card-type">{record.property_type || '—'}</div>
      </div>
      <div className="card-body">
        <div className="card-img-section">
          {record.image_url
            ? <img src={record.image_url.trim()} className="prop-img" alt="" onError={e => e.target.style.display = 'none'} />
            : <div className="img-ph">🏠</div>}
        </div>
        <div className="card-details">
          <div className="detail-row">
            <div className="detail-label">{t.owner}</div>
            <div className="detail-value owner">{record.owner_name || '—'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">{t.colony}</div>
            <div className="detail-value">{record.colony || '—'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">{t.address}</div>
            <div className="detail-value">{record.address || '—'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">{t.cert}</div>
            <div className="detail-value">
              {record.is_self_certified === 'TRUE'
                ? <span className="cert-yes">{t.yes}</span>
                : <span className="cert-no">{t.no}</span>}
              {record.self_cert_mobile_masked && <span style={{ marginLeft: 10, color: 'var(--s)', fontSize: '.85rem' }}>📱 {record.self_cert_mobile_masked}</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="card-footer">
        <div className="area-badges">
          {record.plot_area_sq_yard && <span className="area-badge">📐 {record.plot_area_sq_yard}</span>}
          {record.plot_area_sq_meter && <span className="area-badge">📏 {record.plot_area_sq_meter}</span>}
        </div>
        {record.details_url && <a href={record.details_url} target="_blank" rel="noreferrer" className="details-link">🔗 {t.details}</a>}
      </div>
    </div>
  )
}

function AddPropertyFlow({ user, lang, onClose, onSuccess, embedded = false }) {
  const [step, setStep] = React.useState(1)
  const [pid, setPid] = React.useState('')
  const [owner, setOwner] = React.useState('')
  const [colony, setColony] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)
  const [error, setError] = React.useState('')
  const [property, setProperty] = React.useState(null)
  const [consent, setConsent] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [colonies, setColonies] = React.useState([])
  const [images, setImages] = React.useState([])
  const [taxBills, setTaxBills] = React.useState([])
  const [deed, setDeed] = React.useState([])
  const [rentalAgreement, setRentalAgreement] = React.useState([])

  React.useEffect(() => {
    fetch('/api/colonies').then(r => r.json()).then(res => setColonies(res.colonies || [])).catch(() => {})
  }, [])

  function verifyProperty() {
    if (!pid.trim()) {
      setError(lang === 'en' ? 'Property ID is required' : 'संपत्ति ID अनिवार्य है')
      return
    }
    const extras = [owner, colony, address].filter(v => v.trim().length > 0)
    if (extras.length < 1) {
      setError(lang === 'en' ? 'Please fill at least one more field' : 'कृपया कम से कम एक और फ़ील्ड भरें')
      return
    }
    setVerifying(true)
    setError('')
    fetch('/api/verify-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid.trim(), owner_name: owner, colony, address })
    }).then(r => r.json()).then(res => {
      if (res.verified) {
        setProperty(res.record)
        setStep(2)
      } else {
        setError(lang === 'en' ? 'Property not found or details do not match' : 'संपत्ति नहीं मिली या विवरण मेल नहीं खाते')
      }
    }).catch(() => setError('Server error')).finally(() => setVerifying(false))
  }

  function submitListing() {
    if (!consent) return
    setSubmitting(true)
    
    const formData = new FormData()
    formData.append('pid', property.pid)
    formData.append('mobile', user.mobile)
    formData.append('listing_type', 'sale')
    formData.append('description', '')
    
    images.forEach(file => formData.append('images', file))
    taxBills.forEach(file => formData.append('tax_bills', file))
    deed.forEach(file => formData.append('deed', file))
    rentalAgreement.forEach(file => formData.append('rental_agreement', file))
    
    fetch('/api/add-listing', {
      method: 'POST',
      body: formData
    }).then(r => r.json()).then(res => {
      if (res.success) {
        onSuccess()
      } else {
        setError(res.error || 'Failed to add listing')
      }
    }).catch(() => setError('Server error')).finally(() => setSubmitting(false))
  }

  const modalContent = (
    <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: embedded ? 'none' : '0 8px 40px rgba(0,0,0,.3)' }} onClick={e => !embedded && e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--g)' }}>
            {lang === 'en' ? '🏠 Add Your Property' : '🏠 अपनी संपत्ति जोड़ें'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {step === 1 && (
          <div>
            <p style={{ fontSize: '.85rem', color: '#888', marginBottom: 20, lineHeight: 1.5 }}>
              {lang === 'en' ? 'Enter your Property ID and at least one more detail to verify ownership.' : 'अपनी संपत्ति ID और कम से कम एक और विवरण दर्ज करें।'}
            </p>

            <label className="field-label">{lang === 'en' ? 'Property ID' : 'संपत्ति ID'} <span style={{ color: 'var(--s)' }}>*</span></label>
            <input className="finput" placeholder={lang === 'en' ? 'Property ID' : 'संपत्ति ID'} value={pid} onChange={e => setPid(e.target.value)} autoFocus />

            <label className="field-label">{lang === 'en' ? 'Owner Name' : 'मालिक का नाम'}</label>
            <input className="finput" placeholder={lang === 'en' ? 'Owner Name' : 'मालिक का नाम'} value={owner} onChange={e => setOwner(e.target.value)} />

            <label className="field-label">{lang === 'en' ? 'Colony' : 'कॉलोनी'}</label>
            <select className="finput" value={colony} onChange={e => setColony(e.target.value)}>
              <option value="">{lang === 'en' ? 'Select Colony' : 'कॉलोनी चुनें'}</option>
              {colonies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="field-label">{lang === 'en' ? 'Address' : 'पता'}</label>
            <input className="finput" placeholder={lang === 'en' ? 'Address' : 'पता'} value={address} onChange={e => setAddress(e.target.value)} />

            {error && <div className="err">⚠️ {error}</div>}

            <button className="cont-btn" onClick={verifyProperty} disabled={verifying}>
              {verifying ? '...' : (lang === 'en' ? 'Verify Property →' : 'संपत्ति सत्यापित करें →')}
            </button>
          </div>
        )}

        {step === 2 && property && (
          <div>
            <div style={{ background: '#f0fff0', border: '2px solid var(--g)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--g)', textTransform: 'uppercase', marginBottom: 8 }}>✓ {lang === 'en' ? 'Property Verified' : 'संपत्ति सत्यापित'}</div>
              <div style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--g)', marginBottom: 8 }}>{property.pid?.toUpperCase()}</div>
              <div style={{ fontSize: '.85rem', color: '#555', marginBottom: 4 }}><strong>{lang === 'en' ? 'Owner:' : 'मालिक:'}</strong> {property.owner_name}</div>
              <div style={{ fontSize: '.85rem', color: '#555', marginBottom: 4 }}><strong>{lang === 'en' ? 'Colony:' : 'कॉलोनी:'}</strong> {property.colony}</div>
              <div style={{ fontSize: '.85rem', color: '#555' }}><strong>{lang === 'en' ? 'Address:' : 'पता:'}</strong> {property.address}</div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, border: '2px solid #ffd199', borderRadius: 12, cursor: 'pointer', marginBottom: 20, background: consent ? '#fff8f0' : '#fff' }} onClick={() => setConsent(!consent)}>
              <div style={{
                width: 22, height: 22, borderRadius: 4, flexShrink: 0, marginTop: 2,
                border: `2px solid ${consent ? 'var(--s)' : '#ccc'}`,
                background: consent ? 'var(--s)' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {consent && <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>✓</span>}
              </div>
              <div style={{ fontSize: '.85rem', lineHeight: 1.5, color: '#333' }}>
                {lang === 'en'
                  ? 'I confirm that I am the legal owner or authorized representative of this property.'
                  : 'मैं पुष्टि करता/करती हूं कि मैं इस संपत्ति का कानूनी मालिक या अधिकृत प्रतिनिधि हूं।'}
              </div>
            </label>

            <div style={{ marginBottom: 20 }}>
              <label className="field-label">{lang === 'en' ? '📷 Property Images (Optional)' : '📷 संपत्ति की तस्वीरें'}</label>
              <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files))} style={{ padding: 10, border: '2px solid #ffd199', borderRadius: 8, width: '100%', fontSize: '.85rem' }} />
              {images.length > 0 && <div style={{ fontSize: '.75rem', color: 'var(--g)', marginTop: 4 }}>{images.length} {lang === 'en' ? 'files selected' : 'फ़ाइलें चुनी गईं'}</div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="field-label">{lang === 'en' ? '📄 Property Tax Bills (Optional)' : '📄 संपत्ति कर बिल'}</label>
              <input type="file" multiple accept="image/*,.pdf" onChange={e => setTaxBills(Array.from(e.target.files))} style={{ padding: 10, border: '2px solid #ffd199', borderRadius: 8, width: '100%', fontSize: '.85rem' }} />
              {taxBills.length > 0 && <div style={{ fontSize: '.75rem', color: 'var(--g)', marginTop: 4 }}>{taxBills.length} {lang === 'en' ? 'files selected' : 'फ़ाइलें चुनी गईं'}</div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="field-label">{lang === 'en' ? '📜 Registered Deed (Optional)' : '📜 पंजीकृत विलेख'}</label>
              <input type="file" multiple accept="image/*,.pdf" onChange={e => setDeed(Array.from(e.target.files))} style={{ padding: 10, border: '2px solid #ffd199', borderRadius: 8, width: '100%', fontSize: '.85rem' }} />
              {deed.length > 0 && <div style={{ fontSize: '.75rem', color: 'var(--g)', marginTop: 4 }}>{deed.length} {lang === 'en' ? 'files selected' : 'फ़ाइलें चुनी गईं'}</div>}
            </div>

            {user.roles?.includes('lease_owner') && (
              <div style={{ marginBottom: 20 }}>
                <label className="field-label">{lang === 'en' ? '📝 Sample Rental Agreement (Optional)' : '📝 किराया समझौता'}</label>
                <input type="file" multiple accept="image/*,.pdf" onChange={e => setRentalAgreement(Array.from(e.target.files))} style={{ padding: 10, border: '2px solid #ffd199', borderRadius: 8, width: '100%', fontSize: '.85rem' }} />
                {rentalAgreement.length > 0 && <div style={{ fontSize: '.75rem', color: 'var(--g)', marginTop: 4 }}>{rentalAgreement.length} {lang === 'en' ? 'files selected' : 'फ़ाइलें चुनी गईं'}</div>}
              </div>
            )}

            {error && <div className="err">⚠️ {error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="cont-btn" onClick={submitListing} disabled={!consent || submitting} style={{ flex: 1 }}>
                {submitting ? '...' : (lang === 'en' ? 'Add to Listings' : 'लिस्टिंग में जोड़ें')}
              </button>
              <button onClick={() => setStep(1)} style={{
                padding: '13px 20px', background: 'none', color: '#888', border: '2px solid #e0e0e0',
                borderRadius: 10, fontSize: '.9rem', fontWeight: 600, cursor: 'pointer'
              }}>
                {lang === 'en' ? 'Back' : 'वापस'}
              </button>
            </div>
          </div>
        )}
      </div>
  )

  return embedded ? modalContent : (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      {modalContent}
    </div>
  )
}

function MyListingsPage({ user, lang, onClose }) {
  const [listings, setListings] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch(`/api/listings?mobile=${encodeURIComponent(user.mobile)}`)
      .then(r => r.json())
      .then(res => {
        setListings(res.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--g)' }}>
            {lang === 'en' ? '🏘️ My Listings' : '🏘️ मेरी लिस्टिंग'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{lang === 'en' ? 'Loading...' : 'लोड हो रहा है...'}</div>}

        {!loading && listings.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>{lang === 'en' ? 'No listings yet' : 'अभी कोई लिस्टिंग नहीं'}</div>
            <div style={{ fontSize: '.85rem' }}>{lang === 'en' ? 'Add your first property to get started' : 'शुरू करने के लिए अपनी पहली संपत्ति जोड़ें'}</div>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {listings.map(listing => (
              <div key={listing.id} style={{ border: '2px solid #ffd199', borderRadius: 12, padding: 16, background: '#fff8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--g)', marginBottom: 4 }}>{listing.pid?.toUpperCase()}</div>
                    <div style={{ fontSize: '.85rem', color: '#888' }}>{listing.owner_name}</div>
                  </div>
                  <div style={{ background: listing.listing_type === 'sale' ? 'var(--s)' : 'var(--g)', color: '#fff', padding: '4px 12px', borderRadius: 8, fontSize: '.75rem', fontWeight: 600 }}>
                    {listing.listing_type === 'sale' ? (lang === 'en' ? 'For Sale' : 'बिक्री के लिए') : (lang === 'en' ? 'For Rent' : 'किराए के लिए')}
                  </div>
                </div>
                <div style={{ fontSize: '.85rem', color: '#555', marginBottom: 4 }}><strong>{lang === 'en' ? 'Colony:' : 'कॉलोनी:'}</strong> {listing.colony}</div>
                <div style={{ fontSize: '.85rem', color: '#555', marginBottom: 4 }}><strong>{lang === 'en' ? 'Address:' : 'पता:'}</strong> {listing.address}</div>
                {listing.ask_price && <div style={{ fontSize: '.85rem', color: '#555', marginBottom: 4 }}><strong>{lang === 'en' ? 'Price:' : 'कीमत:'}</strong> ₹{listing.ask_price}</div>}
                <div style={{ fontSize: '.75rem', color: '#888', marginTop: 8 }}>{lang === 'en' ? 'Added:' : 'जोड़ा गया:'} {new Date(listing.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileModal({ user, lang, onClose, onUpdate }) {
  const [selected, setSelected] = React.useState(user.roles || [])
  const groupColors = { owner: 'var(--s)', seeker: 'var(--g)', professional: '#5c6bc0' }

  function toggle(value) {
    setSelected(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  function handleSave() {
    if (!selected.length) return
    const ownerRoles = ['seller', 'lease_owner', 'rent_owner', 'developer']
    const primaryIntent = selected.some(r => ownerRoles.includes(r)) ? 'sell' : 'seek'
    const updated = { ...user, roles: selected }
    localStorage.setItem('dr_user', JSON.stringify(updated))
    fetch('/api/save-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: user.mobile, pid: user.pid || '', intent: primaryIntent, role: selected.join(','), email: user.email || '' }) })
    onUpdate(updated)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--g)' }}>{lang === 'en' ? '👤 Profile & Roles' : '👤 प्रोफ़ाइल और भूमिका'}</div>
            <div style={{ fontSize: '.8rem', color: '#888', marginTop: 4 }}>📱 {user.mobile}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '.8rem', color: 'var(--g)', marginBottom: 16, fontWeight: 600 }}>
            {lang === 'en' ? 'Update your roles (multiple allowed):' : 'अपनी भूमिकाएं अपडेट करें (एक से अधिक हो सकती हैं):'}
          </p>

          {ROLE_GROUPS.map(group => (
            <div key={group.id} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '.72rem', fontWeight: 800, color: groupColors[group.id], textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {group.icon} {lang === 'en' ? group.en : group.hi}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {group.roles.map(role => {
                  const active = selected.includes(role.value)
                  return (
                    <div key={role.value} onClick={() => toggle(role.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      border: `2px solid ${active ? groupColors[group.id] : '#ffd199'}`,
                      borderRadius: 10, cursor: 'pointer',
                      background: active ? (group.id === 'owner' ? '#fff8f0' : group.id === 'seeker' ? '#f0fff0' : '#f0f0ff') : '#fff',
                      transition: 'all .15s'
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${active ? groupColors[group.id] : '#ccc'}`,
                        background: active ? groupColors[group.id] : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {active && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 18, lineHeight: 1 }}>{role.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--g)', lineHeight: 1.2 }}>{lang === 'en' ? role.en : role.hi}</div>
                        <div style={{ fontSize: '.68rem', color: '#888', marginTop: 2 }}>{lang === 'en' ? role.sub_en : role.sub_hi}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={!selected.length} style={{
            flex: 1, padding: 13, background: selected.length ? 'var(--s)' : '#ffd199',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700, cursor: selected.length ? 'pointer' : 'not-allowed'
          }}>
            {lang === 'en' ? `Save ${selected.length} role${selected.length !== 1 ? 's' : ''}` : `${selected.length} भूमिका${selected.length !== 1 ? 'एं' : ''} सेव करें`}
          </button>
          <button onClick={onClose} style={{
            padding: '13px 20px', background: 'none', color: '#888', border: '2px solid #e0e0e0',
            borderRadius: 10, fontSize: '.9rem', fontWeight: 600, cursor: 'pointer'
          }}>
            {lang === 'en' ? 'Cancel' : 'रद्द करें'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ROLE_GROUPS = [
  {
    id: 'owner',
    en: 'Property Owner', hi: 'संपत्ति मालिक', icon: '🏠',
    roles: [
      { value: 'seller',      en: 'Seller',       hi: 'विक्रेता',       sub_en: 'Want to sell property',        sub_hi: 'संपत्ति बेचना चाहते हैं',         icon: '🤝' },
      { value: 'lease_owner', en: 'Lease Owner',  hi: 'पट्टा मालिक',   sub_en: 'Want to give on lease',        sub_hi: 'पट्टे पर देना चाहते हैं',          icon: '📝' },
      { value: 'rent_owner',  en: 'Rent Owner',   hi: 'किराया मालिक',  sub_en: 'Want to give on rent',         sub_hi: 'किराए पर देना चाहते हैं',          icon: '🔑' },
      { value: 'developer',   en: 'Developer',    hi: 'डेवलपर',        sub_en: 'Build / develop properties',   sub_hi: 'संपत्ति बनाना / विकसित करना',      icon: '🏗️' },
    ]
  },
  {
    id: 'seeker',
    en: 'Property Seeker', hi: 'संपत्ति खोजने वाले', icon: '🔍',
    roles: [
      { value: 'buyer',        en: 'Buyer',         hi: 'खरीदार',        sub_en: 'Want to purchase property',    sub_hi: 'संपत्ति खरीदना चाहते हैं',         icon: '👥' },
      { value: 'tenant',       en: 'Tenant',        hi: 'किरायेदार',     sub_en: 'Want to take on rent',         sub_hi: 'किराए पर लेना चाहते हैं',          icon: '🏡' },
      { value: 'lease_seeker', en: 'Lease Seeker',  hi: 'पट्टा खोजने वाले', sub_en: 'Want to take on lease',    sub_hi: 'पट्टे पर लेना चाहते हैं',          icon: '📋' },
      { value: 'investor',     en: 'Investor',      hi: 'निवेशक',        sub_en: 'Looking for investment',       sub_hi: 'निवेश के अवसर खोज रहे हैं',        icon: '💰' },
    ]
  },
  {
    id: 'professional',
    en: 'Professional', hi: 'पेशेवर', icon: '💼',
    roles: [
      { value: 'agent',      en: 'Agent / Broker', hi: 'एजेंट / दलाल',  sub_en: 'Facilitate property deals',    sub_hi: 'संपत्ति सौदे कराते हैं',           icon: '🤵' },
      { value: 'lawyer',     en: 'Lawyer',         hi: 'वकील',          sub_en: 'Legal services',               sub_hi: 'कानूनी सेवाएं',                    icon: '⚖️' },
      { value: 'valuer',     en: 'Valuer',         hi: 'मूल्यांकनकर्ता', sub_en: 'Property valuation',          sub_hi: 'संपत्ति मूल्यांकन',               icon: '📊' },
      { value: 'contractor', en: 'Contractor',     hi: 'ठेकेदार',       sub_en: 'Construction / renovation',    sub_hi: 'निर्माण / नवीनीकरण',              icon: '🔨' },
    ]
  }
]

const MARKETS = [
  { id: 1,  name: 'Sector 1 Market',                          area: 'Sector 1' },
  { id: 2,  name: 'Sector 2 Commercial Belt & Sabji Mandi',   area: 'Sector 2' },
  { id: 3,  name: 'Sector 3 Commercial Hub (Vivek Shopping Complex)', area: 'Sector 3' },
  { id: 4,  name: 'Sector 4 & 5 Markets',                     area: 'Sector 4-5' },
  { id: 5,  name: 'Sector 6 Market Strip',                    area: 'Sector 6' },
  { id: 6,  name: 'Sector 13 Commercial Complex',             area: 'Sector 13' },
  { id: 7,  name: 'Sector 14 Core High Street',               area: 'Sector 14' },
  { id: 8,  name: 'Sector 21 New Kath Mandi',                 area: 'Sector 21' },
  { id: 9,  name: 'Sector 18 & 18A Transport Nagar & Auto Market', area: 'Sector 18-18A' },
  { id: 10, name: 'Sector 25 Rail-Siding Hubs',               area: 'Sector 25' },
  { id: 11, name: 'Sector 26 & 27 Neighborhood CSCs',         area: 'Sector 26-27' },
  { id: 12, name: 'Sector 30 & 31-A City Centre Project',     area: 'Sector 30-31A' },
  { id: 13, name: 'Sector 34 & 35 Commercial Belts',          area: 'Sector 34-35' },
  { id: 14, name: 'Suncity SCO Market Blocks (Sector 35/36)', area: 'Suncity' },
  { id: 15, name: 'Suncity Central Plaza',                    area: 'Suncity' },
  { id: 16, name: 'Omaxe City Commercial Strips (Sector 28/28A)', area: 'Omaxe City' },
  { id: 17, name: 'Omaxe Avenue Point',                       area: 'Omaxe City' },
  { id: 18, name: 'Merion Sky Mall (Sonipat Road)',            area: 'Sonipat Road' },
  { id: 19, name: 'Liberty Jop Square Mall (Delhi Road)',     area: 'Delhi Road' },
  { id: 20, name: 'Agro Mall (Delhi Road)',                   area: 'Delhi Road' },
  { id: 21, name: 'New Grain Market (Nayi Anaj Mandi)',       area: 'City Centre' },
  { id: 22, name: 'IMT Rohtak Commercial Nodes',              area: 'IMT Rohtak' },
  { id: 23, name: 'Shori Market',                             area: 'Old City' },
  { id: 24, name: 'Quilla Road Market',                       area: 'Old City' },
  { id: 25, name: 'Railway Road Market',                      area: 'Old City' },
  { id: 26, name: 'Model Town / D-Park Area',                 area: 'Model Town' },
  { id: 27, name: 'Ramkali Market',                           area: 'Old City' },
  { id: 28, name: 'Palika Bazaar (Company Bagh)',             area: 'City Centre' },
  { id: 29, name: 'Old Housing Board Colony Market (10 Number ki Dukan)', area: 'Old City' },
  { id: 30, name: 'Sheetal Lifestyle Mall (Dariyao Nagar)',   area: 'Dariyao Nagar' },
  { id: 31, name: 'Civil Road & Circular Road High Streets',  area: 'City Centre' },
  { id: 32, name: 'Bhiwani Stand Area (Citi Center)',         area: 'City Centre' },
  { id: 33, name: 'Sukhpura Chowk & Jind Road Strip',        area: 'Jind Road' },
  { id: 34, name: 'Pratap Talkies Road / Dev Colony Markets', area: 'Dev Colony' },
]

function DigitalHaryanaSection({ lang }) {
  const [tab, setTab] = React.useState('services')
  const [search, setSearch] = React.useState('')

  const filtered = MARKETS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.area.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dh-section">
      <div className="dh-header">
        <div className="dh-title">🏛️ {lang === 'en' ? 'Digital Haryana — Rohtak' : 'डिजिटल हरियाणा — रोहतक'}</div>
        <div className="dh-tabs">
          <button className={`dh-tab${tab === 'services' ? ' active' : ''}`} onClick={() => setTab('services')}>
            ⚙️ {lang === 'en' ? 'Services' : 'सेवाएं'}
          </button>
          <button className={`dh-tab${tab === 'markets' ? ' active' : ''}`} onClick={() => setTab('markets')}>
            🏪 {lang === 'en' ? 'Markets' : 'बाज़ार'}
          </button>
        </div>
      </div>

      {tab === 'services' && (
        <div className="dh-content">
          <div className="dh-empty">⚙️ {lang === 'en' ? 'Services coming soon…' : 'सेवाएं जल्द आ रही हैं…'}</div>
        </div>
      )}

      {tab === 'markets' && (
        <div className="dh-content">
          <input
            className="dh-search"
            placeholder={lang === 'en' ? '🔍 Search markets…' : '🔍 बाज़ार खोजें…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="dh-table-wrap">
            <table className="dh-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{lang === 'en' ? 'Market Name' : 'बाज़ार का नाम'}</th>
                  <th>{lang === 'en' ? 'Area / Zone' : 'क्षेत्र / ज़ोन'}</th>
                  <th>{lang === 'en' ? 'Status' : 'स्थिति'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.name}</td>
                    <td><span className="dh-badge">{m.area}</span></td>
                    <td><span className="dh-status">🟢 {lang === 'en' ? 'Active' : 'सक्रिय'}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#888' }}>No markets found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="dh-count">{filtered.length} {lang === 'en' ? 'markets listed' : 'बाज़ार सूचीबद्ध'}</div>
        </div>
      )}
    </div>
  )
}

function BuyMegaMenu({ lang, colonies }) {
  return (
    <div className="mega-menu">
      <div className="mega-menu-content">
        <div className="mega-menu-section">
          <div className="mega-menu-title">{lang === 'en' ? 'Popular Colonies in Rohtak' : 'रोहतक की प्रमुख कॉलोनियां'}</div>
          <div className="mega-menu-grid">
            {colonies.slice(0, 12).map(col => (
              <a key={col} href="#" className="mega-menu-link">{col}</a>
            ))}
          </div>
        </div>
        <div className="mega-menu-section">
          <div className="mega-menu-title">{lang === 'en' ? 'Property Types' : 'संपत्ति प्रकार'}</div>
          <div className="mega-menu-grid">
            <a href="#" className="mega-menu-link">🏠 {lang === 'en' ? 'Residential' : 'आवासीय'}</a>
            <a href="#" className="mega-menu-link">🏛️ {lang === 'en' ? 'Apartments' : 'अपार्टमेंट'}</a>
            <a href="#" className="mega-menu-link">🏗️ {lang === 'en' ? 'Independent House' : 'स्वतंत्र मकान'}</a>
            <a href="#" className="mega-menu-link">🏭 {lang === 'en' ? 'Builder Floor' : 'बिल्डर फ्लोर'}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function RentMegaMenu({ lang, colonies }) {
  return (
    <div className="mega-menu">
      <div className="mega-menu-content">
        <div className="mega-menu-section">
          <div className="mega-menu-title">{lang === 'en' ? 'Flats for Rent in Rohtak' : 'रोहतक में किराए के लिए फ्लैट'}</div>
          <div className="mega-menu-grid">
            {colonies.slice(0, 12).map(col => (
              <a key={col} href="#" className="mega-menu-link">{col}</a>
            ))}
          </div>
        </div>
        <div className="mega-menu-section">
          <div className="mega-menu-title">{lang === 'en' ? 'Rental Options' : 'किराया विकल्प'}</div>
          <div className="mega-menu-grid">
            <a href="#" className="mega-menu-link">🏠 {lang === 'en' ? '1 BHK' : '1 BHK'}</a>
            <a href="#" className="mega-menu-link">🏘️ {lang === 'en' ? '2 BHK' : '2 BHK'}</a>
            <a href="#" className="mega-menu-link">🏛️ {lang === 'en' ? '3 BHK' : '3 BHK'}</a>
            <a href="#" className="mega-menu-link">🏗️ {lang === 'en' ? '4+ BHK' : '4+ BHK'}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function IntentSelector({ lang, onDone }) {
  const [selected, setSelected] = React.useState([])

  function toggle(value) {
    setSelected(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  function handleDone() {
    if (!selected.length) return
    // derive primary intent: owner-side roles need pid, others don't
    const ownerRoles = ['seller', 'lease_owner', 'rent_owner', 'developer']
    const primaryIntent = selected.some(r => ownerRoles.includes(r)) ? 'sell' : 'seek'
    onDone(primaryIntent, selected)
  }

  const groupColors = { owner: 'var(--s)', seeker: 'var(--g)', professional: '#5c6bc0' }

  return (
    <div style={{ textAlign: 'left' }}>
      <p style={{ fontSize: '.8rem', color: 'var(--g)', marginBottom: 16, fontWeight: 600 }}>
        {lang === 'en' ? 'Select all roles that apply (multiple allowed):' : 'सभी लागू भूमिकाएं चुनें (एक से अधिक हो सकती हैं):'}
      </p>

      {ROLE_GROUPS.map(group => (
        <div key={group.id} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 800, color: groupColors[group.id], textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            {group.icon} {lang === 'en' ? group.en : group.hi}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {group.roles.map(role => {
              const active = selected.includes(role.value)
              return (
                <div key={role.value} onClick={() => toggle(role.value)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  border: `2px solid ${active ? groupColors[group.id] : '#ffd199'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: active ? (group.id === 'owner' ? '#fff8f0' : group.id === 'seeker' ? '#f0fff0' : '#f0f0ff') : '#fff',
                  transition: 'all .15s'
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${active ? groupColors[group.id] : '#ccc'}`,
                    background: active ? groupColors[group.id] : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {active && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 18, lineHeight: 1 }}>{role.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--g)', lineHeight: 1.2 }}>{lang === 'en' ? role.en : role.hi}</div>
                    <div style={{ fontSize: '.68rem', color: '#888', marginTop: 2 }}>{lang === 'en' ? role.sub_en : role.sub_hi}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <button className="cont-btn" onClick={handleDone} disabled={!selected.length}
        style={{ marginTop: 4, background: selected.length ? 'var(--s)' : '#ffd199' }}>
        {lang === 'en' ? `Continue with ${selected.length} role${selected.length !== 1 ? 's' : ''} →` : `${selected.length} भूमिका${selected.length !== 1 ? 'एं' : ''} के साथ जारी रखें →`}
      </button>
    </div>
  )
}

export default function App() {
  const [lang, setLang] = React.useState('en')
  const [user, setUser] = React.useState(() => { try { return JSON.parse(localStorage.getItem('dr_user')) } catch { return null } })
  const [showProfile, setShowProfile] = React.useState(false)
  const [showMyListings, setShowMyListings] = React.useState(false)
  const [activeMenu, setActiveMenu] = React.useState(null)
  const [pid, setPid] = React.useState('')
  const [owner, setOwner] = React.useState('')
  const [colony, setColony] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [minPrice, setMinPrice] = React.useState('')
  const [maxPrice, setMaxPrice] = React.useState('')
  const [minArea, setMinArea] = React.useState('')
  const [maxArea, setMaxArea] = React.useState('')
  const [result, setResult] = React.useState(null)
  const [searching, setSearching] = React.useState(false)
  const [colonies, setColonies] = React.useState([])
  const t = T[lang]

  const roles = user?.roles || []
  const ownerRoles = ['seller', 'lease_owner', 'rent_owner', 'developer']
  const isOwner = roles.some(r => ownerRoles.includes(r))
  const hasOnlyOwnerRoles = roles.length > 0 && roles.every(r => ownerRoles.includes(r))
  const [showAddProperty, setShowAddProperty] = React.useState(false)
  const [hasAddedProperty, setHasAddedProperty] = React.useState(() => {
    try { return localStorage.getItem('dr_property_added') === 'true' } catch { return false }
  })

  React.useEffect(() => {
    if (!user) return
    fetch('/api/colonies').then(r => r.json()).then(res => setColonies(res.colonies || [])).catch(() => {})
  }, [user])

  if (!user) return <Login onLogin={setUser} lang={lang} setLang={setLang} />

  if (!roles.length) return (
    <div className="login-wrap">
      <div className="login-card" style={{ maxWidth: 520 }}>
        <div className="flag"><div className="s"/><div className="w"/><div className="g"/></div>
        <div className="lang-row">
          <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{lang === 'en' ? 'हिंदी' : 'English'}</button>
        </div>
        <div className="wheel">☸</div>
        <div className="login-title">{t.title}</div>
        <div className="login-sub" style={{ marginBottom: 20, color: 'var(--g)' }}>{lang === 'en' ? 'Select your role(s) to continue' : 'जारी रखने के लिए अपनी भूमिका चुनें'}</div>
        <IntentSelector lang={lang} onDone={(i, r) => {
          const updated = { ...user, roles: r }
          setUser(updated)
          localStorage.setItem('dr_user', JSON.stringify(updated))
          fetch('/api/save-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: user.mobile, pid: user.pid || '', intent: i, role: r.join(',') }) })
        }} />
        <div style={{ marginTop: 16, fontSize: '.75rem', color: 'var(--s)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { localStorage.removeItem('dr_user'); setUser(null) }}>← {lang === 'en' ? 'Logout' : 'लॉगआउट'}</div>
      </div>
    </div>
  )

  // If user has ONLY owner roles and hasn't added property yet, show add property flow
  if (hasOnlyOwnerRoles && !hasAddedProperty) {
    return (
      <div className="login-wrap">
        <div className="login-card" style={{ maxWidth: 520 }}>
          <div className="flag"><div className="s"/><div className="w"/><div className="g"/></div>
          <div className="wheel">☸</div>
          <div className="login-title">{t.title}</div>
          <div style={{ fontSize: '.9rem', color: 'var(--g)', marginBottom: 20, textAlign: 'center' }}>
            {lang === 'en' ? '👋 Welcome! Let\'s add your property first' : '👋 स्वागत है! पहले अपनी संपत्ति जोड़ें'}
          </div>
          <AddPropertyFlow 
            user={user} 
            lang={lang}
            embedded={true}
            onClose={() => {
              localStorage.setItem('dr_property_added', 'true')
              setHasAddedProperty(true)
            }} 
            onSuccess={() => {
              localStorage.setItem('dr_property_added', 'true')
              setHasAddedProperty(true)
            }} 
          />
        </div>
      </div>
    )
  }

  const pidRequired = roles.some(r => ownerRoles.includes(r)) && !roles.some(r => !ownerRoles.includes(r))

  function search() {
    if (pidRequired && !pid.trim()) return
    if (!pidRequired && !pid.trim() && !owner.trim() && !colony.trim() && !address.trim()) return
    setSearching(true)
    fetch('/api/verify-property', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid.trim(), owner_name: owner, colony, address })
    }).then(r => r.json()).then(res => {
      setResult(res.verified ? res.record : false)
    }).catch(() => setResult(false)).finally(() => setSearching(false))
  }

  function clear() { setPid(''); setOwner(''); setColony(''); setAddress(''); setMinPrice(''); setMaxPrice(''); setMinArea(''); setMaxArea(''); setResult(null) }

  return (
    <div>
      {showProfile && <ProfileModal user={user} lang={lang} onClose={() => setShowProfile(false)} onUpdate={setUser} />}
      {showMyListings && <MyListingsPage user={user} lang={lang} onClose={() => setShowMyListings(false)} />}
      {showAddProperty && <AddPropertyFlow user={user} lang={lang} onClose={() => setShowAddProperty(false)} onSuccess={() => {
        setShowAddProperty(false)
        alert(lang === 'en' ? '✓ Property added to listings!' : '✓ संपत्ति लिस्टिंग में जोड़ दी गई!')
      }} />}
      <header className="header">
        <div className="hflag"><div className="s"/><div className="w"/><div className="g"/></div>
        <div className="hcontent">
          <div className="hlogo">
            <div className="hwheel">☸</div>
            <div>
              <div className="htitle">{t.title}</div>
              <div className="hsub">{t.sub}</div>
              <div className="hloc">{t.loc}</div>
            </div>
          </div>
          <div className="hright">
            <button className="hlang" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{lang === 'en' ? 'हिंदी' : 'English'}</button>
            {isOwner && (
              <>
                <button className="hlang" style={{ background: 'var(--g)', color: '#fff' }} onClick={() => setShowAddProperty(true)}>
                  ➕ {lang === 'en' ? 'Add Property' : 'संपत्ति जोड़ें'}
                </button>
                <button className="hlang" onClick={() => setShowMyListings(true)}>
                  🏘️ {lang === 'en' ? 'My Listings' : 'मेरी लिस्टिंग'}
                </button>
              </>
            )}
            <span className="huser">📱 {user.mobile}</span>
            <button className="hlang" onClick={() => setShowProfile(true)} title={lang === 'en' ? 'Profile & Roles' : 'प्रोफ़ाइल और भूमिका'}>
              👤 {lang === 'en' ? 'Profile' : 'प्रोफ़ाइल'}
            </button>
            <button className="hlogout" onClick={() => { localStorage.removeItem('dr_user'); setUser(null) }}>{t.logout}</button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-container">
          <div className="nav-item" onMouseEnter={() => setActiveMenu('buy')} onMouseLeave={() => setActiveMenu(null)}>
            <a href="#" className="nav-link">{lang === 'en' ? '🏠 Buy' : '🏠 खरीदें'}</a>
            {activeMenu === 'buy' && <BuyMegaMenu lang={lang} colonies={colonies} />}
          </div>
          <div className="nav-item" onMouseEnter={() => setActiveMenu('rent')} onMouseLeave={() => setActiveMenu(null)}>
            <a href="#" className="nav-link">{lang === 'en' ? '🔑 Rent' : '🔑 किराया'}</a>
            {activeMenu === 'rent' && <RentMegaMenu lang={lang} colonies={colonies} />}
          </div>
          <a href="#" className="nav-link">{lang === 'en' ? '🏢 Commercial' : '🏢 व्यावसायिक'}</a>
          <a href="#" className="nav-link">{lang === 'en' ? '🛏️ PG/Co-Living' : '🛏️ PG/सह-रहना'}</a>
          <a href="#" className="nav-link">{lang === 'en' ? '📐 Plots' : '📐 प्लॉट'}</a>
        </div>
      </nav>

      <div className="search-section">
        <div className="search-grid">
          <div className="search-field">
            <label className="search-label">{t.pidLabel} {pidRequired && <span className="req">{t.required}</span>}{!pidRequired && <span style={{color:'rgba(255,255,255,.6)',fontSize:'.7rem',textTransform:'none',letterSpacing:0}}>(optional)</span>}</label>
            <input className="sinput pid-input" placeholder={t.pidLabel} value={pid} onChange={e => setPid(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <div className="search-field">
            <label className="search-label">{t.ownerLabel}</label>
            <input className="sinput" placeholder={t.ownerLabel} value={owner} onChange={e => setOwner(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <div className="search-field">
            <label className="search-label">{t.colonyLabel}</label>
            <select className="sinput" value={colony} onChange={e => setColony(e.target.value)}>
              <option value="">{lang === 'en' ? 'Select Colony' : 'कॉलोनी चुनें'}</option>
              {colonies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="search-field">
            <label className="search-label">{t.addrLabel}</label>
            <input className="sinput" placeholder={t.addrLabel} value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="search-btn" onClick={search} disabled={(pidRequired ? !pid.trim() : (!pid.trim() && !owner.trim() && !colony.trim() && !address.trim())) || searching}>{searching ? '...' : t.searchBtn}</button>
            <button className="clear-btn" onClick={clear}>{t.clearBtn}</button>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '16px auto 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div className="search-field">
            <label className="search-label">{lang === 'en' ? 'Min Price (₹)' : 'न्यूनतम कीमत (₹)'}</label>
            <input className="sinput" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </div>
          <div className="search-field">
            <label className="search-label">{lang === 'en' ? 'Max Price (₹)' : 'अधिकतम कीमत (₹)'}</label>
            <input className="sinput" type="number" placeholder="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <div className="search-field">
            <label className="search-label">{lang === 'en' ? 'Min Area (sq yd)' : 'न्यूनतम क्षेत्र'}</label>
            <input className="sinput" type="number" placeholder="0" value={minArea} onChange={e => setMinArea(e.target.value)} />
          </div>
          <div className="search-field">
            <label className="search-label">{lang === 'en' ? 'Max Area (sq yd)' : 'अधिकतम क्षेत्र'}</label>
            <input className="sinput" type="number" placeholder="0" value={maxArea} onChange={e => setMaxArea(e.target.value)} />
          </div>
        </div>
      </div>

      <main className="main">
        {result === null && (
          <>
            <div className="empty-state">
              <div className="empty-icon">🏘️</div>
              <div className="empty-title">{t.emptyTitle}</div>
              <div className="empty-sub">{t.emptySub}</div>
            </div>
            <DigitalHaryanaSection lang={lang} />
          </>
        )}
        {result === false && (
          <div className="no-match">
            <div className="no-match-icon">🔍</div>
            <div className="no-match-title">{t.noMatchTitle}</div>
            <div className="no-match-sub">{t.noMatchSub}</div>
          </div>
        )}
        {result && result.pid && <PropertyCard record={result} t={t} />}
      </main>

      <footer className="footer">
        <p>{t.f1}</p>
      </footer>
    </div>
  )
}
