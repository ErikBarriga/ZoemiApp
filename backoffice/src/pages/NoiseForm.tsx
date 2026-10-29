import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileField } from '../components/FileField'
import { Banner, Card, Choice, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { revealStyle } from '../lib/reveal'
import { publicUrl } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Direction, Effect, NoiseRow } from '../types'
import { DIRECTION_LABEL } from './NoiseList'

const DIRECTIONS = (Object.keys(DIRECTION_LABEL) as Direction[]).map((value) => ({ value, label: DIRECTION_LABEL[value] }))
const EFFECTS: { value: Effect; label: string }[] = [
  { value: 'reveal', label: 'Con ruido se descubre' },
  { value: 'cover', label: 'Con ruido se tapa' }
]

export default function NoiseForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [audio, setAudio] = useState<string | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>('bottom')
  const [effect, setEffect] = useState<Effect>('reveal')
  const [published, setPublished] = useState(true)
  const [level, setLevel] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const existing = useAsync(async () => {
    if (!id) return null
    const { data, error: e } = await supabase.from('noise_activities').select('*').eq('id', id).single()
    if (e) throw e
    return data as NoiseRow
  }, [id])

  useEffect(() => {
    const d = existing.data
    if (!d) return
    setText(d.text)
    setAudio(d.audio_path)
    setImage(d.image_path)
    setDirection(d.direction)
    setEffect(d.effect)
    setPublished(d.published)
  }, [existing.data])

  const missing: string[] = []
  if (!text.trim()) missing.push('la instrucción')
  if (!audio) missing.push('el audio')
  if (!image) missing.push('la imagen')
  const ready = missing.length === 0

  const visible = effect === 'reveal' ? level / 100 : 1 - level / 100
  const imgUrl = publicUrl(image)

  const save = async () => {
    if (!ready || !image) return
    setSaving(true)
    setError(null)
    try {
      const payload = { text: text.trim(), audio_path: audio, image_path: image, direction, effect, published }
      const { error: e } = editing
        ? await supabase.from('noise_activities').update(payload).eq('id', id!)
        : await supabase.from('noise_activities').insert(payload)
      if (e) throw e
      if (editing) navigate('/ruido')
      else {
        setSaved(true)
        setText('')
        setAudio(null)
        setImage(null)
        setLevel(0)
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Practica tu Voz" title={editing ? 'Editar actividad de Haz ruido' : 'Nueva actividad de Haz ruido'} />
      {saved && <Banner kind="ok">Actividad guardada.</Banner>}
      {(existing.error || error) && <Banner kind="error">{existing.error ?? error}</Banner>}

      <div className="split">
        <div className="stack grow">
          <Card title="1. Instrucción para el niño">
            <label htmlFor="instr" className="visually-hidden">Instrucción</label>
            <input
              id="instr"
              className="input"
              maxLength={200}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setSaved(false)
              }}
              placeholder="Ejemplo: ¡Grita fuerte para ver quién se esconde!"
            />
          </Card>

          <Card title="2. Audio de la instrucción">
            <FileField label="Audio de la instrucción" kind="audio" path={audio} onChange={setAudio} />
          </Card>

          <Card title="3. Imagen que se asoma">
            <FileField label="Imagen" kind="image" path={image} onChange={setImage} />
          </Card>

          <Card title="4. ¿Por dónde aparece?">
            <Choice label="Dirección" value={direction} onChange={setDirection} options={DIRECTIONS} />
          </Card>

          <Card title="5. Qué hace el ruido">
            <Choice label="Efecto" value={effect} onChange={setEffect} options={EFFECTS} />
          </Card>

          <label className="radio">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span>Publicada (la verán los niños)</span>
          </label>

          <div className="row wrap">
            <button type="button" className="btn btn-primary" disabled={!ready || saving} onClick={() => void save()}>
              {saving ? 'Guardando…' : 'Guardar actividad'}
            </button>
            <span className="status">{ready ? 'Todo listo para guardar' : `Falta: ${missing.join(', ')}`}</span>
          </div>
        </div>

        <aside className="card preview-card">
          <h2>Vista previa</h2>
          <div className="preview-stage">
            {imgUrl ? (
              <img src={imgUrl} alt="Vista previa de la imagen" style={revealStyle(direction, visible)} />
            ) : (
              <p className="help centered">Sube una imagen para ver cómo se muestra</p>
            )}
          </div>
          <label htmlFor="nivel" className="field-label">Probar con ruido: {level}%</label>
          <input id="nivel" type="range" min={0} max={100} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <p className="help">Mueve la barra para simular el volumen de la voz del niño.</p>
        </aside>
      </div>
    </>
  )
}
