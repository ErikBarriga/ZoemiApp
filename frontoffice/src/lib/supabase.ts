import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)

// El front office SOLO lee contenido publicado (lo garantizan las reglas RLS).
// No guarda sesión: no hay inicio de sesión en la app de los niños.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})
