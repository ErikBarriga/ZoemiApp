import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    setState({ data: null, error: null, loading: true })
    load()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error: unknown) =>
        alive &&
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
          loading: false
        })
      )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

/** Reproduce un audio a la vez. */
export function useAudioPlayer() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const stop = useCallback(() => {
    const a = ref.current
    if (a) {
      a.onended = null
      a.onerror = null
      a.pause()
      ref.current = null
    }
    setPlaying(false)
  }, [])

  const play = useCallback(
    (url: string | null | undefined) => {
      if (!url) return
      stop()
      const a = new Audio()
      a.crossOrigin = 'anonymous'
      a.src = url
      a.onended = () => setPlaying(false)
      a.onerror = () => setPlaying(false)
      ref.current = a
      setPlaying(true)
      a.play().catch(() => setPlaying(false))
    },
    [stop]
  )

  useEffect(() => stop, [stop])
  return { play, stop, playing }
}

export type MicStatus = 'idle' | 'on' | 'denied' | 'unsupported'

/** Mide el volumen del micrófono (valor RMS de 0 a ~1). No graba ni envía audio. */
export function useMic() {
  const [status, setStatus] = useState<MicStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    analyserRef.current = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      })
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctor()
      await ctx.resume()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      streamRef.current = stream
      ctxRef.current = ctx
      analyserRef.current = analyser
      setStatus('on')
    } catch {
      setStatus('denied')
    }
  }, [])

  const read = useCallback((): number => {
    const analyser = analyserRef.current
    if (!analyser) return 0
    const buf = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    return Math.sqrt(sum / buf.length)
  }, [])

  useEffect(() => stop, [stop])
  return { status, start, stop, read }
}
