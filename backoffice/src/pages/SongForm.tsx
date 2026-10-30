import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileField } from '../components/FileField'
import { Banner, Card, Choice, PageHeader } from '../components/ui'
import { errorMessage, useAsync } from '../lib/hooks'
import { publicUrl, removeMedia, unusedPaths } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { Origin, SongLineRow, SongRow } from '../types'
import { ORIGIN_LABEL } from './Songs'

interface LineForm {
  text: string
  start: number | null
}

const ORIGINS = (Object.keys(ORIGIN_LABEL) as Origin[]).map((value) => ({ value, label: ORIGIN_LABEL[value] }))
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

export default function SongForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [title, setTitle] = useState('')
  const [audio, setAudio] = useState<string | null>(null)
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [lines, setLines] = useState<LineForm[]>([{ text: '', start: null }])
  const [bulk, setBulk] = useState('')
  const [published, setPublished] = useState(true)
  const [now, setNow] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const existing = useAsync(async () => {
    if (!id) return null
    const [s, l] = await Promise.all([
      supabase.from('songs').select('*').eq('id', id).single(),
      supabase.from('song_lines').select('*').eq('song_id', id).order('position')
    ])
    if (s.error) throw s.error
    if (l.error) throw l.error
    return { song: s.data as SongRow, lines: (l.data ?? []) as SongLineRow[] }
  }, [id])

  useEffect(() => {
    const d = existing.data
    if (!d) return
    setTitle(d.song.title)
    setAudio(d.song.audio_path)
    setOrigin(d.song.origin)
    setPublished(d.song.published)
    setLines(d.lines.length ? d.lines.map((l) => ({ text: l.text, start: Number(l.start_seconds) })) : [{ text: '', start: null }])
  }, [existing.data])

  const setLine = (i: number, patch: Partial<LineForm>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  // La línea "actual" es la primera que todavía no tiene tiempo.
  const cur = lines.findIndex((l) => l.start === null)

  const mark = () => {
    if (cur < 0 || !audioRef.current) return
    setLine(cur, { start: Math.round(audioRef.current.currentTime * 10) / 10 })
  }
  const undo = () => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].start !== null) {
        setLine(i, { start: null })
        return
      }
    }
  }
  const applyBulk = () => {
    const rows = bulk.split('\n').map((t) => t.trim()).filter(Boolean)
    if (rows.length) setLines(rows.map((text) => ({ text, start: null })))
  }

  const missing: string[] = []
  if (!title.trim()) missing.push('el nombre')
  if (!audio) missing.push('el audio')
  if (!origin) missing.push('el origen')
  if (lines.some((l) => !l.text.trim())) missing.push('el texto de todas las líneas')
  const unmarked = lines.filter((l) => l.start === null).length
  if (unmarked > 0) missing.push(`los tiempos de ${unmarked} línea${unmarked === 1 ? '' : 's'}`)
  const ready = missing.length === 0

  const save = async () => {
    if (!ready || !audio || !origin) return
    setSaving(true)
    setError(null)
    try {
      const payload = { title: title.trim(), audio_path: audio, origin, published }
      let songId = id ?? ''
      if (editing) {
        const { error: e } = await supabase.from('songs').update(payload).eq('id', songId)
        if (e) throw e
        const { error: d } = await supabase.from('song_lines').delete().eq('song_id', songId)
        if (d) throw d
      } else {
        const { data, error: e } = await supabase.from('songs').insert(payload).select('id').single()
        if (e) throw e
        songId = (data as { id: string }).id
      }
      const rows = lines.map((l, i) => ({ song_id: songId, position: i, text: l.text.trim(), start_seconds: l.start ?? 0 }))
      const { error: le } = await supabase.from('song_lines').insert(rows)
      if (le) throw le
      const old = existing.data
      if (old) await removeMedia(unusedPaths([old.song.audio_path], [audio]))
      if (editing) navigate('/karaoke')
      else {
        setSaved(true)
        setTitle('')
        setAudio(null)
        setOrigin(null)
        setLines([{ text: '', start: null }])
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const url = publicUrl(audio)

  return (
    <>
      <PageHeader eyebrow="Practica tu Voz" title={editing ? 'Editar canción de Karaoke' : 'Nueva canción de Karaoke'} />
      {saved && <Banner kind="ok">Canción guardada.</Banner>}
      {(existing.error || error) && <Banner kind="error">{existing.error ?? error}</Banner>}

      <Card title="Cómo funciona">
        <p className="help">
          Cada canción tiene su audio y su letra dividida en líneas. A cada línea le marcas el segundo en que empieza, y
          así la app resalta la línea correcta mientras suena.
        </p>
      </Card>

      <Card title="1. Nombre de la canción">
        <label htmlFor="titulo" className="visually-hidden">Nombre de la canción</label>
        <input id="titulo" className="input" maxLength={120} value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false) }} />
      </Card>

      <Card title="2. Audio de la canción">
        <FileField label="Audio de la canción" kind="audio" path={audio} onChange={setAudio} help="Puede ser la canción completa o solo la pista musical." />
      </Card>

      <Card title="3. Origen de la canción">
        <p className="help">Solo sube canciones propias, de dominio público o con licencia.</p>
        <Choice label="Origen" value={origin} onChange={setOrigin} options={ORIGINS} />
      </Card>

      <Card title="4. Letra y tiempos">
        <div className="field">
          <label htmlFor="bulk" className="field-label small">Pega la letra (una línea por renglón)</label>
          <textarea id="bulk" className="input textarea" rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button type="button" className="btn btn-secondary self-start" onClick={applyBulk} disabled={!bulk.trim()}>
            Crear líneas
          </button>
        </div>

        <p className="help">Reproduce el audio y toca “Marcar línea” justo cuando empiece cada una.</p>
        {url ? (
          <audio ref={audioRef} src={url} controls className="sync-audio" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} />
        ) : (
          <Banner kind="info">Sube el audio para poder marcar los tiempos.</Banner>
        )}
        <div className="row wrap">
          <button type="button" className="btn btn-yellow" onClick={mark} disabled={cur < 0 || !url}>
            Marcar línea {cur >= 0 ? cur + 1 : ''}
          </button>
          <button type="button" className="btn btn-secondary" onClick={undo}>Deshacer</button>
          <span className="status">Tiempo actual: {fmt(now)}</span>
        </div>

        <div className="stack">
          {lines.map((l, i) => (
            <div key={i} className={i === cur ? 'line-row line-row-cur' : 'line-row'}>
              <span className="line-n">{i + 1}</span>
              <label className="visually-hidden" htmlFor={`t-${i}`}>Segundo de inicio de la línea {i + 1}</label>
              <input
                id={`t-${i}`}
                type="number"
                min={0}
                step={0.1}
                className="input input-narrow"
                value={l.start ?? ''}
                placeholder="—"
                onChange={(e) => setLine(i, { start: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <label className="visually-hidden" htmlFor={`l-${i}`}>Texto de la línea {i + 1}</label>
              <input id={`l-${i}`} className="input grow" value={l.text} onChange={(e) => setLine(i, { text: e.target.value })} />
              <button
                type="button"
                className="btn btn-secondary"
                aria-label={`Quitar la línea ${i + 1}`}
                disabled={lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-secondary self-start" onClick={() => setLines((p) => [...p, { text: '', start: null }])}>
          Agregar línea
        </button>
      </Card>

      <label className="radio">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <span>Publicada (la verán los niños)</span>
      </label>

      <div className="row wrap">
        <button type="button" className="btn btn-primary" disabled={!ready || saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar canción'}
        </button>
        <span className="status">{ready ? 'Todo listo para guardar' : `Falta: ${missing.join(', ')}`}</span>
      </div>
    </>
  )
}
