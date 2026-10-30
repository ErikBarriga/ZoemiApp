// Sonidos de acierto y de error generados con Web Audio (sin archivos, funcionan sin conexión).
// Los de error son suaves a propósito: avisan sin asustar ni frustrar.

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number; slideTo?: number }

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function play(notes: Note[]) {
  const c = audio()
  if (!c) return
  const now = c.currentTime
  for (const n of notes) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    const start = now + n.t
    const end = start + n.d
    osc.type = n.type ?? 'sine'
    osc.frequency.setValueAtTime(n.f, start)
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, end)
    const peak = n.v ?? 0.25
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(end + 0.05)
  }
}

const SUCCESS: Note[][] = [
  // Arpegio ascendente (Do-Mi-Sol-Do)
  [
    { f: 523, t: 0, d: 0.18 },
    { f: 659, t: 0.12, d: 0.18 },
    { f: 784, t: 0.24, d: 0.18 },
    { f: 1047, t: 0.36, d: 0.45 }
  ],
  // Fanfarria corta
  [
    { f: 392, t: 0, d: 0.12, type: 'triangle' },
    { f: 392, t: 0.14, d: 0.12, type: 'triangle' },
    { f: 392, t: 0.28, d: 0.12, type: 'triangle' },
    { f: 523, t: 0.42, d: 0.5, type: 'triangle', v: 0.3 }
  ],
  // Destellos agudos
  [
    { f: 1319, t: 0, d: 0.15 },
    { f: 1568, t: 0.1, d: 0.15 },
    { f: 2093, t: 0.2, d: 0.15 },
    { f: 1568, t: 0.32, d: 0.15 },
    { f: 2349, t: 0.42, d: 0.4 }
  ],
  // Silbido que sube y acorde final
  [
    { f: 400, slideTo: 1200, t: 0, d: 0.3, type: 'triangle' },
    { f: 523, t: 0.32, d: 0.5, v: 0.2 },
    { f: 659, t: 0.32, d: 0.5, v: 0.2 },
    { f: 784, t: 0.32, d: 0.5, v: 0.2 }
  ]
]

const FAIL: Note[][] = [
  // Dos tonos suaves que bajan
  [
    { f: 330, t: 0, d: 0.2, type: 'triangle', v: 0.22 },
    { f: 262, t: 0.18, d: 0.35, type: 'triangle', v: 0.22 }
  ],
  // "Bloop" que cae
  [{ f: 400, slideTo: 150, t: 0, d: 0.35, v: 0.28 }],
  // "Uh-oh"
  [
    { f: 392, t: 0, d: 0.15, type: 'triangle', v: 0.22 },
    { f: 311, t: 0.2, d: 0.3, type: 'triangle', v: 0.22 }
  ],
  // Trombón triste suave
  [
    { f: 294, t: 0, d: 0.18, type: 'triangle', v: 0.2 },
    { f: 277, t: 0.2, d: 0.18, type: 'triangle', v: 0.2 },
    { f: 262, t: 0.4, d: 0.18, type: 'triangle', v: 0.2 },
    { f: 247, slideTo: 196, t: 0.6, d: 0.45, type: 'triangle', v: 0.2 }
  ]
]

const last = { success: -1, fail: -1 }

/** Elige al azar uno distinto del anterior, para que se alternen. */
function pick(kind: 'success' | 'fail', list: Note[][]): Note[] {
  let i = Math.floor(Math.random() * list.length)
  if (list.length > 1 && i === last[kind]) i = (i + 1) % list.length
  last[kind] = i
  return list[i]
}

export const playSuccess = () => play(pick('success', SUCCESS))
export const playFail = () => play(pick('fail', FAIL))
