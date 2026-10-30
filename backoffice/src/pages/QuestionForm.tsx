import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileField } from '../components/FileField'
import { Banner, Card, Choice, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { removeMedia, unusedPaths } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { OptionRow, QuestionRow, Section } from '../types'

interface OptionForm {
  image: string | null
  text: string
  correct: boolean
}
const emptyOptions = (): OptionForm[] => [0, 1, 2].map(() => ({ image: null, text: '', correct: false }))

export default function QuestionForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const [sectionId, setSectionId] = useState('')
  const [text, setText] = useState('')
  const [audio, setAudio] = useState<string | null>(null)
  const [sound, setSound] = useState<string | null>(null)
  const [options, setOptions] = useState<OptionForm[]>(emptyOptions())
  const [published, setPublished] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedIn, setSavedIn] = useState<string | null>(null)

  const sections = useAsync(async () => {
    const { data, error: e } = await supabase.from('sections').select('*').order('position')
    if (e) throw e
    return (data ?? []) as Section[]
  }, [])

  const existing = useAsync(async () => {
    if (!id) return null
    const [q, o] = await Promise.all([
      supabase.from('questions').select('*').eq('id', id).single(),
      supabase.from('question_options').select('*').eq('question_id', id).order('position')
    ])
    if (q.error) throw q.error
    if (o.error) throw o.error
    return { question: q.data as QuestionRow, options: (o.data ?? []) as OptionRow[] }
  }, [id])

  // Valor inicial de la sección (nueva pregunta) y carga de datos (edición).
  useEffect(() => {
    if (!editing && !sectionId && sections.data?.length) setSectionId(sections.data[0].id)
  }, [editing, sectionId, sections.data])

  useEffect(() => {
    const d = existing.data
    if (!d) return
    setSectionId(d.question.section_id)
    setText(d.question.text)
    setAudio(d.question.audio_path)
    setSound(d.question.sound_path)
    setPublished(d.question.published)
    const opts = emptyOptions()
    d.options.slice(0, 3).forEach((o, i) => {
      opts[i] = { image: o.image_path, text: o.text ?? '', correct: o.is_correct }
    })
    setOptions(opts)
  }, [existing.data])

  const setOption = (i: number, patch: Partial<OptionForm>) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  const setCorrect = (i: number) => setOptions((prev) => prev.map((o, j) => ({ ...o, correct: j === i })))

  const missing: string[] = []
  if (!sectionId) missing.push('la sección')
  if (!text.trim()) missing.push('el texto')
  if (!audio) missing.push('el audio')
  options.forEach((o, i) => {
    if (!o.image && !o.text.trim()) missing.push(`la imagen ${i + 1}`)
  })
  if (!options.some((o) => o.correct)) missing.push('marcar la correcta')
  const ready = missing.length === 0

  const save = async () => {
    if (!ready) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        section_id: sectionId,
        text: text.trim(),
        audio_path: audio,
        sound_path: sound,
        published
      }
      let questionId = id ?? ''
      if (editing) {
        const { error: e } = await supabase.from('questions').update(payload).eq('id', questionId)
        if (e) throw e
        const { error: d } = await supabase.from('question_options').delete().eq('question_id', questionId)
        if (d) throw d
      } else {
        const { data, error: e } = await supabase.from('questions').insert(payload).select('id').single()
        if (e) throw e
        questionId = (data as { id: string }).id
      }
      const rows = options.map((o, i) => ({
        question_id: questionId,
        position: i,
        image_path: o.image,
        text: o.text.trim() || null,
        is_correct: o.correct
      }))
      const { error: oe } = await supabase.from('question_options').insert(rows)
      if (oe) throw oe

      // Ya guardado: borra del almacenamiento lo que se reemplazó o quitó.
      const d = existing.data
      if (d) {
        await removeMedia(
          unusedPaths(
            [d.question.audio_path, d.question.sound_path, ...d.options.map((o) => o.image_path)],
            [audio, sound, ...options.map((o) => o.image)]
          )
        )
      }

      if (editing) {
        navigate('/preguntas')
      } else {
        setSavedIn(sections.data?.find((s) => s.id === sectionId)?.name ?? '')
        setText('')
        setAudio(null)
        setSound(null)
        setOptions(emptyOptions())
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const sectionName = sections.data?.find((s) => s.id === sectionId)?.name

  return (
    <>
      <PageHeader
        eyebrow="Escucha la Pregunta"
        title={editing ? 'Editar pregunta' : sectionName ? `Nueva pregunta en ${sectionName}` : 'Nueva pregunta'}
      />

      {savedIn !== null && (
        <Banner kind="ok">
          Pregunta guardada en {savedIn}. <Link to="/preguntas">Ver todas las preguntas</Link>
        </Banner>
      )}
      {(sections.error || existing.error) && <Banner kind="error">{sections.error ?? existing.error}</Banner>}
      {error && <Banner kind="error">{error}</Banner>}

      <Card title="1. ¿A cuál sección va?">
        {sections.data && (
          <Choice
            label="Sección"
            value={sectionId || null}
            onChange={(v) => {
              setSectionId(v)
              setSavedIn(null)
            }}
            options={sections.data.filter((s) => s.active || s.id === sectionId).map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
        <p className="help">Para crear más secciones, ve a “Secciones” en el menú.</p>
      </Card>

      <Card title="2. Texto de la pregunta">
        <label htmlFor="texto" className="visually-hidden">Texto de la pregunta</label>
        <input
          id="texto"
          type="text"
          className="input"
          value={text}
          maxLength={300}
          onChange={(e) => {
            setText(e.target.value)
            setSavedIn(null)
          }}
          placeholder="Ejemplo: ¿Cuál imagen es un perro?"
        />
      </Card>

      <Card title="3. Audio de la pregunta">
        <FileField label="Audio de la pregunta" kind="audio" path={audio} onChange={setAudio} help="Es el audio que escuchará el niño al tocar “Escuchar”." />
        <hr className="sep" />
        <FileField label="Audio del sonido (opcional)" kind="audio" path={sound} onChange={setSound} help="Solo para preguntas como “¿Cuál animal hace este sonido?”." />
      </Card>

      <Card title="4. Tres opciones y cuál es la correcta">
        <p className="help">Sube una imagen por opción. Para letras o números puedes escribir el texto en lugar de subir imagen.</p>
        <div className="grid-3">
          {options.map((o, i) => (
            <div key={i} className={o.correct ? 'option-card option-card-on' : 'option-card'}>
              <strong>Opción {i + 1}</strong>
              <FileField label={`Imagen ${i + 1}`} kind="image" path={o.image} onChange={(p) => setOption(i, { image: p })} compact />
              <div className="field">
                <label htmlFor={`op-text-${i}`} className="field-label small">O texto corto (letra o número)</label>
                <input id={`op-text-${i}`} className="input" maxLength={12} value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} />
              </div>
              <label className="radio">
                <input type="radio" name="correcta" checked={o.correct} onChange={() => setCorrect(i)} />
                <span>Es la correcta</span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      <label className="radio">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <span>Publicada (la verán los niños)</span>
      </label>

      <div className="row wrap">
        <button type="button" className="btn btn-primary" disabled={!ready || saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar pregunta'}
        </button>
        <span className="status">{ready ? 'Todo listo para guardar' : `Falta: ${missing.join(', ')}`}</span>
      </div>
    </>
  )
}
