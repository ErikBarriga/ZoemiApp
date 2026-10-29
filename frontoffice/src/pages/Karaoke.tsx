import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { StateMessage } from '../components/StateMessage'
import { Tile } from '../components/Tile'
import { UiIcon } from '../components/icons'
import { getSong, getSongs, mediaUrl, prefetchMedia } from '../lib/api'
import { useAsync } from '../lib/hooks'
import type { Song, SongLine } from '../types'

export default function Karaoke() {
  const { songId } = useParams()
  return songId ? <Player songId={songId} /> : <SongList />
}

function SongList() {
  const { data, error, loading } = useAsync(getSongs, [])
  return (
    <main className="screen">
      <ScreenHeader title="Karaoke" color="#FFA8C8" back="/voz" />
      {loading && <StateMessage>Cargando…</StateMessage>}
      {error && <StateMessage kind="error">No se pudo cargar. Revisa tu conexión e intenta otra vez.</StateMessage>}
      {data && data.length === 0 && <StateMessage>Todavía no hay canciones.</StateMessage>}
      {data && data.length > 0 && (
        <div className="tiles">
          {data.map((s) => (
            <Tile key={s.id} to={`/voz/karaoke/${s.id}`} label={s.title} icon="note" color="#FFA8C8" />
          ))}
        </div>
      )}
    </main>
  )
}

function Player({ songId }: { songId: string }) {
  const { data, error, loading } = useAsync(() => getSong(songId), [songId])
  return (
    <main className="screen karaoke">
      <ScreenHeader title={data?.song.title ?? 'Karaoke'} color="#FFA8C8" back="/voz/karaoke" />
      {loading && <StateMessage>Cargando…</StateMessage>}
      {error && (
        <>
          <StateMessage kind="error">No se pudo cargar la canción.</StateMessage>
          <Link className="btn btn-white" to="/voz/karaoke">Volver a las canciones</Link>
        </>
      )}
      {data && <KaraokeRunner song={data.song} lines={data.lines} />}
    </main>
  )
}

function KaraokeRunner({ song, lines }: { song: Song; lines: SongLine[] }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentRef = useRef<HTMLParagraphElement>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const url = mediaUrl(song.audio_path)

  useEffect(() => {
    void prefetchMedia([url])
  }, [url])

  // Mientras suena, se lee el tiempo en cada cuadro para resaltar la línea justo a tiempo.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      if (audioRef.current) setT(audioRef.current.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const current = lines.reduce((acc, l, i) => (l.start_seconds <= t ? i : acc), -1)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    currentRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [current])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play().catch(() => setPlaying(false))
    else a.pause()
  }
  const seekLine = (i: number) => {
    const a = audioRef.current
    if (!a || lines.length === 0) return
    const target = Math.max(0, Math.min(lines.length - 1, i))
    a.currentTime = lines[target].start_seconds
    setT(a.currentTime)
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={url ?? undefined}
        crossOrigin="anonymous"
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <section className="lyrics" aria-label="Letra de la canción">
        {lines.map((l, i) => (
          <p key={l.id} ref={i === current ? currentRef : undefined} className={i === current ? 'line line-current' : 'line'}>
            {l.text}
          </p>
        ))}
      </section>
      <div className="karaoke-controls">
        <button type="button" className="btn btn-white" onClick={() => seekLine(current - 1)} aria-label="Línea anterior">
          <UiIcon name="back" size={40} />
        </button>
        <button type="button" className="btn btn-primary btn-wide" onClick={toggle}>
          <UiIcon name={playing ? 'pause' : 'play'} size={40} />
          <span>{playing ? 'Pausa' : 'Cantar'}</span>
        </button>
        <button type="button" className="btn btn-white" onClick={() => seekLine(current + 1)} aria-label="Línea siguiente">
          <UiIcon name="next" size={40} />
        </button>
      </div>
    </>
  )
}
