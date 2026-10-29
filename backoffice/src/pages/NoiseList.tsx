import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { publicUrl } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { NoiseRow } from '../types'

export const DIRECTION_LABEL = {
  bottom: 'Desde abajo',
  top: 'Desde arriba',
  left: 'Desde la izquierda',
  right: 'Desde la derecha',
  center: 'Círculo en el centro'
} as const

export default function NoiseList() {
  const [msg, setMsg] = useState<string | null>(null)
  const items = useAsync(async () => {
    const { data, error } = await supabase.from('noise_activities').select('*').order('position')
    if (error) throw error
    return (data ?? []) as NoiseRow[]
  }, [])

  const toggle = async (n: NoiseRow) => {
    const { error } = await supabase.from('noise_activities').update({ published: !n.published }).eq('id', n.id)
    setMsg(error ? errorMessage(error) : null)
    items.reload()
  }
  const remove = async (n: NoiseRow) => {
    if (!window.confirm(`¿Borrar la actividad “${n.text}”?`)) return
    const { error } = await supabase.from('noise_activities').delete().eq('id', n.id)
    setMsg(error ? errorMessage(error) : null)
    items.reload()
  }

  return (
    <>
      <PageHeader
        eyebrow="Practica tu Voz"
        title="Haz ruido"
        actions={<Link className="btn btn-primary" to="/ruido/nueva">Nueva actividad</Link>}
      />
      {(items.error || msg) && <Banner kind="error">{items.error ?? msg}</Banner>}
      {items.loading && <p className="help">Cargando…</p>}
      {!items.loading && (items.data ?? []).length === 0 && (
        <Banner kind="info">No hay actividades todavía. Usa “Nueva actividad” para agregar la primera.</Banner>
      )}
      <ul className="list">
        {(items.data ?? []).map((n) => (
          <li key={n.id} className="list-item">
            <img className="file-thumb" src={publicUrl(n.image_path) ?? undefined} alt="" />
            <div className="list-main">
              <strong>{n.text}</strong>
              <span className="help">
                {DIRECTION_LABEL[n.direction]} · {n.effect === 'reveal' ? 'con ruido se descubre' : 'con ruido se tapa'}
              </span>
            </div>
            <span className={n.published ? 'pill pill-on' : 'pill'}>{n.published ? 'Publicada' : 'Borrador'}</span>
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={() => void toggle(n)}>
                {n.published ? 'Ocultar' : 'Publicar'}
              </button>
              <Link className="btn btn-secondary" to={`/ruido/${n.id}`}>Editar</Link>
              <button type="button" className="btn btn-danger" onClick={() => void remove(n)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
