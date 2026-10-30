import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { removeMedia } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Origin, SongRow } from '../types'

export const ORIGIN_LABEL: Record<Origin, string> = {
  own: 'Propia o grabada por nosotros',
  public_domain: 'Dominio público',
  licensed: 'Con licencia'
}

export default function Songs() {
  const [msg, setMsg] = useState<string | null>(null)
  const songs = useAsync(async () => {
    const { data, error } = await supabase.from('songs').select('*').order('position')
    if (error) throw error
    return (data ?? []) as SongRow[]
  }, [])

  const toggle = async (s: SongRow) => {
    const { error } = await supabase.from('songs').update({ published: !s.published }).eq('id', s.id)
    setMsg(error ? errorMessage(error) : null)
    songs.reload()
  }
  const remove = async (s: SongRow) => {
    if (!window.confirm(`¿Borrar la canción “${s.title}”?`)) return
    const { error } = await supabase.from('songs').delete().eq('id', s.id)
    if (!error) await removeMedia([s.audio_path])
    setMsg(error ? errorMessage(error) : null)
    songs.reload()
  }

  return (
    <>
      <PageHeader
        eyebrow="Practica tu Voz"
        title="Karaoke"
        actions={<Link className="btn btn-primary" to="/karaoke/nueva">Nueva canción</Link>}
      />
      {(songs.error || msg) && <Banner kind="error">{songs.error ?? msg}</Banner>}
      {songs.loading && <p className="help">Cargando…</p>}
      {!songs.loading && (songs.data ?? []).length === 0 && (
        <Banner kind="info">No hay canciones todavía. Usa “Nueva canción” para agregar la primera.</Banner>
      )}
      <ul className="list">
        {(songs.data ?? []).map((s) => (
          <li key={s.id} className="list-item">
            <div className="list-main">
              <strong>{s.title}</strong>
              <span className="help">{ORIGIN_LABEL[s.origin]}</span>
            </div>
            <span className={s.published ? 'pill pill-on' : 'pill'}>{s.published ? 'Publicada' : 'Borrador'}</span>
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={() => void toggle(s)}>
                {s.published ? 'Ocultar' : 'Publicar'}
              </button>
              <Link className="btn btn-secondary" to={`/karaoke/${s.id}`}>Editar</Link>
              <button type="button" className="btn btn-danger" onClick={() => void remove(s)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
