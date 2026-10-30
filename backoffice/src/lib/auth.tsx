import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'

export type Stage = 'loading' | 'signedOut' | 'needMfaEnroll' | 'needMfaCode' | 'notAdmin' | 'ready'

export interface Enrollment {
  factorId: string
  qr: string
  secret: string
}

interface AuthValue {
  stage: Stage
  email: string | null
  /** Todas devuelven un mensaje de error (texto) o null si salió bien. */
  signIn: (email: string, password: string) => Promise<string | null>
  verifyCode: (code: string) => Promise<string | null>
  startEnroll: () => Promise<Enrollment | string>
  finishEnroll: (factorId: string, code: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

async function resolveStage(): Promise<{ stage: Stage; email: string | null }> {
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session) return { stage: 'signedOut', email: null }
  const email = session.user.email ?? null

  // 1) ¿Está en la lista de administradores? (cada usuario puede leer solo su fila)
  const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
  if (!row) return { stage: 'notAdmin', email }

  // 2) Segundo paso (aal2) DESACTIVADO temporalmente para desarrollo local.
  //    Para reactivarlo, vuelve a poner la verificación de aal2 y la condición en is_admin() (schema.sql).
  return { stage: 'ready', email }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ stage: Stage; email: string | null }>({ stage: 'loading', email: null })
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    const next = await resolveStage()
    if (alive.current) setState(next)
  }, [])

  useEffect(() => {
    alive.current = true
    void refresh()
    const { data } = supabase.auth.onAuthStateChange(() => {
      // No se llama a Supabase dentro del callback (puede bloquearse): se difiere.
      setTimeout(() => void refresh(), 0)
    })
    return () => {
      alive.current = false
      data.subscription.unsubscribe()
    }
  }, [refresh])

  const value = useMemo<AuthValue>(
    () => ({
      stage: state.stage,
      email: state.email,

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) return 'Correo o contraseña incorrectos.'
        await refresh()
        return null
      },

      verifyCode: async (code) => {
        const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
        const factor = factors?.totp?.[0]
        if (fErr || !factor) return 'No se encontró tu verificación en dos pasos.'
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
        if (error) return 'Código incorrecto o vencido. Escribe el código actual de tu app.'
        await refresh()
        return null
      },

      startEnroll: async () => {
        // Limpia intentos anteriores que nunca se terminaron de verificar.
        const { data: factors } = await supabase.auth.mfa.listFactors()
        for (const f of factors?.all ?? []) {
          if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `ZoemiApp ${Date.now()}`
        })
        if (error || !data) return error?.message ?? 'No se pudo iniciar la verificación en dos pasos.'
        return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
      },

      finishEnroll: async (factorId, code) => {
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
        if (error) return 'Código incorrecto. Revisa que el código sea el actual.'
        await refresh()
        return null
      },

      signOut: async () => {
        await supabase.auth.signOut()
        await refresh()
      }
    }),
    [state, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
