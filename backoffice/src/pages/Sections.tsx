import { useState } from 'react'
import { Banner, Card, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { removeMedia } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Section } from '../types'

const ICONS = [
  { value: 'paw', label: 'Huella' },
  { value: 'question', label: 'Pregunta' },
  { value: 'letters', label: 'Letras' },
  { value: 'star', label: 'Estrella' },
  { value: 'heart', label: 'Corazón' },
  { value: 'sun', label: 'Sol' }
]
const COLORS = ['#FFD166', '#C9B8FF', '#8EC5FF', '#8FE3C8', '#FFA8C8', '#FFB88A']

type Draft = Omit<Section, 'id'> & { id?: string }
const blank = (position: number): Draft => ({ name: '', color: COLORS[0], icon: 'star', position, active: true })

export default function Sections() {
  const [msg, setMsg] = useState<string | null>(null)
  const sections = useAsync(async () => {
    const { data, error } = await supabase.from('sections').select('*').order('position')
    if (error) throw error
    return (data ?? []) as Section[]
  }, [])

  const save = async (d: Draft): Promise<boolean> => {
    if (!d.name.trim()) {
      setMsg('Escribe un nombre para la sección.')
      return false
    }
    const payload = { name: d.name.trim(), color: d.color, icon: d.icon, position: d.position, active: d.active }
    const { error } = d.id
      ? await supabase.from('sections').update(payload).eq('id', d.id)
      : await supabase.from('sections').insert(payload)
    if (error) {
      setMsg(errorMessage(error))
      return false
    }
    setMsg(null)
    sections.reload()
    return true
  }

  const remove = async (s: Section) => {
    if (!window.confirm(`¿Borrar la sección “${s.name}”? También se borrarán todas sus preguntas.`)) return
    // Se leen los archivos antes de borrar: preguntas y opciones se eliminan en cascada.
    const { data: qs } = await supabase.from('questions').select('id,audio_path,sound_path').eq('section_id', s.id)
    const questions = (qs ?? []) as { id: string; audio_path: string | null; sound_path: string | null }[]
    const { data: opts } = questions.length
      ? await supabase.from('question_options').select('image_path').in('question_id', questions.map((q) => q.id))
      : { data: [] }
    const { error } = await supabase.from('sections').delete().eq('id', s.id)
    if (!error) {
      await removeMedia([
        ...questions.flatMap((q) => [q.audio_path, q.sound_path]),
        ...((opts ?? []) as { image_path: string | null }[]).map((o) => o.image_path)
      ])
    }
    setMsg(error ? errorMessage(error) : null)
    sections.reload()
  }

  const nextPosition = (sections.data?.reduce((m, s) => Math.max(m, s.position), 0) ?? 0) + 1

  return (
    <>
      <PageHeader eyebrow="Escucha la Pregunta" title="Secciones" />
      <p className="lead">Cada sección aparece como un mosaico en “Escucha la Pregunta”. Usa el orden para decidir cuál va primero.</p>
      {(sections.error || msg) && <Banner kind="error">{sections.error ?? msg}</Banner>}

      <Card title="Nueva sección">
        <SectionEditor key={nextPosition} initial={blank(nextPosition)} onSave={save} saveLabel="Agregar sección" />
      </Card>

      {(sections.data ?? []).map((s) => (
        <Card key={s.id + s.name + s.color + s.icon + s.position + s.active}>
          <SectionEditor initial={s} onSave={save} saveLabel="Guardar cambios" onDelete={() => void remove(s)} />
        </Card>
      ))}
    </>
  )
}

function SectionEditor({
  initial,
  onSave,
  saveLabel,
  onDelete
}: {
  initial: Draft
  onSave: (d: Draft) => Promise<boolean>
  saveLabel: string
  onDelete?: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }))
  const uid = d.id ?? 'nueva'

  return (
    <div className="stack">
      <div className="row wrap">
        <div className="field grow">
          <label htmlFor={`n-${uid}`} className="field-label small">Nombre</label>
          <input id={`n-${uid}`} className="input" maxLength={60} value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`i-${uid}`} className="field-label small">Ícono</label>
          <select id={`i-${uid}`} className="input select" value={d.icon} onChange={(e) => set({ icon: e.target.value })}>
            {ICONS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`p-${uid}`} className="field-label small">Orden</label>
          <input id={`p-${uid}`} type="number" min={0} className="input input-narrow" value={d.position} onChange={(e) => set({ position: Number(e.target.value) })} />
        </div>
      </div>

      <div className="field">
        <span className="field-label small">Color del mosaico</span>
        <div className="swatches" role="group" aria-label="Color del mosaico">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={d.color.toUpperCase() === c ? 'swatch swatch-on' : 'swatch'}
              style={{ background: c }}
              aria-label={`Color ${c}`}
              aria-pressed={d.color.toUpperCase() === c}
              onClick={() => set({ color: c })}
            />
          ))}
        </div>
      </div>

      <label className="radio">
        <input type="checkbox" checked={d.active} onChange={(e) => set({ active: e.target.checked })} />
        <span>Visible para los niños</span>
      </label>

      <div className="row wrap">
        <button type="button" className="btn btn-primary" onClick={() => void onSave(d)}>{saveLabel}</button>
        {onDelete && <button type="button" className="btn btn-danger" onClick={onDelete}>Borrar</button>}
      </div>
    </div>
  )
}
