import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import type { QuestionRow, Section } from '../types'

export default function Questions() {
  const [filter, setFilter] = useState('all')
  const [msg, setMsg] = useState<string | null>(null)

  const sections = useAsync(async () => {
    const { data, error } = await supabase.from('sections').select('*').order('position')
    if (error) throw error
    return (data ?? []) as Section[]
  }, [])

  const questions = useAsync(async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('id,section_id,text,audio_path,sound_path,position,published')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as QuestionRow[]
  }, [])

  const nameOf = (id: string) => sections.data?.find((s) => s.id === id)?.name ?? '—'
  const rows = (questions.data ?? []).filter((q) => filter === 'all' || q.section_id === filter)

  const togglePublished = async (q: QuestionRow) => {
    const { error } = await supabase.from('questions').update({ published: !q.published }).eq('id', q.id)
    setMsg(error ? errorMessage(error) : null)
    questions.reload()
  }
  const remove = async (q: QuestionRow) => {
    if (!window.confirm(`¿Borrar la pregunta “${q.text}”? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('questions').delete().eq('id', q.id)
    setMsg(error ? errorMessage(error) : null)
    questions.reload()
  }

  return (
    <>
      <PageHeader
        eyebrow="Escucha la Pregunta"
        title="Preguntas"
        actions={<Link className="btn btn-primary" to="/preguntas/nueva">Nueva pregunta</Link>}
      />
      {(questions.error || sections.error) && <Banner kind="error">{questions.error ?? sections.error}</Banner>}
      {msg && <Banner kind="error">{msg}</Banner>}

      <div className="row wrap">
        <label htmlFor="filtro" className="field-label">Sección</label>
        <select id="filtro" className="input select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todas</option>
          {(sections.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {questions.loading && <p className="help">Cargando…</p>}
      {!questions.loading && rows.length === 0 && (
        <Banner kind="info">No hay preguntas todavía. Usa “Nueva pregunta” para agregar la primera.</Banner>
      )}

      <ul className="list">
        {rows.map((q) => (
          <li key={q.id} className="list-item">
            <div className="list-main">
              <strong>{q.text}</strong>
              <span className="help">{nameOf(q.section_id)}</span>
            </div>
            <span className={q.published ? 'pill pill-on' : 'pill'}>{q.published ? 'Publicada' : 'Borrador'}</span>
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={() => void togglePublished(q)}>
                {q.published ? 'Ocultar' : 'Publicar'}
              </button>
              <Link className="btn btn-secondary" to={`/preguntas/${q.id}`}>Editar</Link>
              <button type="button" className="btn btn-danger" onClick={() => void remove(q)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
