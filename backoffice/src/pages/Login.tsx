import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import type { Enrollment } from '../lib/auth'
import { Banner } from '../components/ui'

export default function Login() {
  const { stage, email, signOut } = useAuth()

  return (
    <div className="login-wrap">
      <main className="login-card">
        <div>
          <p className="login-brand">ZoemiApp</p>
          <h1>Acceso al panel de contenido</h1>
          <p className="help">Solo para administradores</p>
        </div>

        {stage === 'loading' && <p className="help">Cargando…</p>}
        {stage === 'signedOut' && <PasswordStep />}
        {stage === 'needMfaCode' && <CodeStep />}
        {stage === 'needMfaEnroll' && <EnrollStep />}
        {stage === 'notAdmin' && (
          <>
            <Banner kind="error">
              La cuenta {email} no tiene permiso de administrador. Si es tuya, agrégala a la tabla “admins” (ver README).
            </Banner>
            <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          </>
        )}

        <p className="help small">
          Esta pantalla no permite crear cuentas. Las cuentas de administrador se dan de alta desde Supabase.
        </p>
      </main>
    </div>
  )
}

function PasswordStep() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.')
      return
    }
    setBusy(true)
    setError(await signIn(email, password))
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="field">
        <label htmlFor="correo" className="field-label">Correo</label>
        <input id="correo" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="clave" className="field-label">Contraseña</label>
        <div className="row">
          <input
            id="clave"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={() => setShow(!show)}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
      {error && <Banner kind="error">{error}</Banner>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Entrando…' : 'Continuar'}
      </button>
    </form>
  )
}

function CodeInput({ onSubmit, label }: { onSubmit: (code: string) => Promise<string | null>; label: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError('El código tiene 6 números.')
      return
    }
    setBusy(true)
    setError(await onSubmit(code))
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="field">
        <label htmlFor="codigo" className="field-label">Código de 6 dígitos</label>
        <input
          id="codigo"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          className="input input-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      {error && <Banner kind="error">{error}</Banner>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Verificando…' : label}
      </button>
    </form>
  )
}

function CodeStep() {
  const { verifyCode, signOut } = useAuth()
  return (
    <>
      <p className="lead">Abre tu app de autenticación y escribe el código de 6 dígitos.</p>
      <CodeInput onSubmit={verifyCode} label="Verificar" />
      <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
        Cancelar
      </button>
    </>
  )
}

function EnrollStep() {
  const { startEnroll, finishEnroll, signOut } = useAuth()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void startEnroll().then((r) => {
      if (!alive) return
      if (typeof r === 'string') setError(r)
      else setEnrollment(r)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <p className="lead">
        Para proteger el panel, activa la verificación en dos pasos. Escanea este código con una app de autenticación
        (Google Authenticator, Microsoft Authenticator, Authy…) y escribe el código que muestre.
      </p>
      {error && <Banner kind="error">{error}</Banner>}
      {!enrollment && !error && <p className="help">Preparando…</p>}
      {enrollment && (
        <>
          <img src={enrollment.qr} alt="Código QR para la app de autenticación" className="qr" />
          <p className="help small">
            Si no puedes escanearlo, escribe esta clave en tu app: <code>{enrollment.secret}</code>
          </p>
          <CodeInput onSubmit={(c) => finishEnroll(enrollment.factorId, c)} label="Activar y entrar" />
        </>
      )}
      <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
        Cancelar
      </button>
    </>
  )
}
