import { useEffect, useRef, useState } from 'react'
import { ScreenHeader } from '../components/ScreenHeader'
import { StateMessage } from '../components/StateMessage'
import { TileIcon, UiIcon } from '../components/icons'
import { getNoiseActivities, mediaUrl, prefetchMedia } from '../lib/api'
import { useAsync, useAudioPlayer, useMic } from '../lib/hooks'
import { revealStyle } from '../lib/reveal'
import type { NoiseActivity } from '../types'

type Sensitivity = 'low' | 'mid' | 'high'
// Volumen mínimo (RMS) para contar como "ruido". "high" = detecta voces suaves.
const THRESHOLD: Record<Sensitivity, number> = { low: 0.06, mid: 0.03, high: 0.015 }
const SENS_LABEL: Record<Sensitivity, string> = { low: 'Fuerte', mid: 'Normal', high: 'Suave' }

export default function Noise() {
  const { data, error, loading } = useAsync(getNoiseActivities, [])
  return (
    <main className="screen noise">
      <ScreenHeader title="Haz ruido" color="#8FE3C8" back="/voz" />
      {loading && <StateMessage>Cargando…</StateMessage>}
      {error && <StateMessage kind="error">No se pudo cargar. Revisa tu conexión e intenta otra vez.</StateMessage>}
      {data && data.length === 0 && <StateMessage>Todavía no hay actividades.</StateMessage>}
      {data && data.length > 0 && <NoiseRunner activities={data} />}
    </main>
  )
}

function NoiseRunner({ activities }: { activities: NoiseActivity[] }) {
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [sens, setSens] = useState<Sensitivity>('mid')
  const [volume, setVolume] = useState(0)
  const mic = useMic()
  const { play } = useAudioPlayer()
  const activity = activities[idx]
  const progressRef = useRef(0)

  useEffect(() => {
    void prefetchMedia(activities.flatMap((a) => [mediaUrl(a.audio_path), mediaUrl(a.image_path)]))
  }, [activities])

  useEffect(() => {
    progressRef.current = 0
    setProgress(0)
    play(mediaUrl(activity.audio_path))
  }, [activity.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bucle: mide el volumen y avanza o retrocede el avance de la animación.
  useEffect(() => {
    if (mic.status !== 'on') return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const v = mic.read()
      const loud = v > THRESHOLD[sens]
      const p = progressRef.current + (loud ? dt * 0.9 : -dt * 0.35)
      progressRef.current = Math.max(0, Math.min(1, p))
      setVolume(v)
      setProgress(progressRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mic.status, mic.read, sens]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = activity.effect === 'reveal' ? progress : 1 - progress
  const success = progress >= 0.98
  const img = mediaUrl(activity.image_path)
  const meter = Math.min(1, volume / (THRESHOLD[sens] * 3))

  const go = (d: number) => setIdx((idx + d + activities.length) % activities.length)

  return (
    <>
      <section className="question-card">
        <p className="question-text">{activity.text}</p>
        {activity.audio_path && (
          <div className="question-actions">
            <button type="button" className="btn btn-primary" onClick={() => play(mediaUrl(activity.audio_path))}>
              <UiIcon name="speaker" size={30} />
              <span>Escuchar</span>
            </button>
          </div>
        )}
      </section>

      <div className="stage" aria-label="Imagen escondida">
        {img && <img src={img} alt="" crossOrigin="anonymous" draggable={false} style={revealStyle(activity.direction, visible)} />}
        {success && (
          <div className="stage-win" role="status">
            <UiIcon name="star" size={34} />
            <span>¡Lo lograste!</span>
          </div>
        )}
      </div>

      <div className="meter" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={mic.status === 'on' && meter > i / 5 ? 'meter-seg on' : 'meter-seg'} />
        ))}
      </div>

      {mic.status === 'denied' && (
        <StateMessage kind="error">No pudimos usar el micrófono. Permite el acceso al micrófono en tu navegador.</StateMessage>
      )}
      {mic.status === 'unsupported' && (
        <StateMessage kind="error">Este navegador no permite usar el micrófono. Prueba con Chrome o Safari actualizados.</StateMessage>
      )}

      <div className="noise-controls">
        <button type="button" className="btn btn-white" onClick={() => go(-1)} aria-label="Actividad anterior" disabled={activities.length < 2}>
          <UiIcon name="back" size={36} />
        </button>
        {mic.status === 'on' ? (
          <button type="button" className="btn btn-white btn-wide" onClick={mic.stop}>
            <span>Detener</span>
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-wide" onClick={() => void mic.start()}>
            <TileIcon name="mic" size={40} />
            <span>Haz ruido</span>
          </button>
        )}
        <button type="button" className="btn btn-white" onClick={() => go(1)} aria-label="Actividad siguiente" disabled={activities.length < 2}>
          <UiIcon name="next" size={36} />
        </button>
      </div>

      <div className="sens" role="group" aria-label="Sensibilidad del micrófono">
        <span>Se activa con voz:</span>
        {(['high', 'mid', 'low'] as Sensitivity[]).map((s) => (
          <button key={s} type="button" className={sens === s ? 'chip chip-on' : 'chip'} aria-pressed={sens === s} onClick={() => setSens(s)}>
            {SENS_LABEL[s]}
          </button>
        ))}
      </div>
    </>
  )
}
