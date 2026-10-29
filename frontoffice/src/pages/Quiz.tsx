import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { StateMessage } from '../components/StateMessage'
import { UiIcon } from '../components/icons'
import { getQuestions, getSections, mediaUrl, prefetchMedia } from '../lib/api'
import { useAsync, useAudioPlayer } from '../lib/hooks'
import { shuffle } from '../lib/shuffle'
import type { Question } from '../types'

export default function Quiz() {
  const { sectionId = '' } = useParams()
  const sections = useAsync(getSections, [])
  const questions = useAsync(() => getQuestions(sectionId), [sectionId])
  const section = sections.data?.find((s) => s.id === sectionId)
  const title = section?.name ?? 'Escucha la Pregunta'
  const color = section?.color ?? '#8EC5FF'

  return (
    <main className="screen quiz">
      <ScreenHeader title={title} color={color} back="/escucha" />
      {questions.loading && <StateMessage>Cargando…</StateMessage>}
      {questions.error && (
        <StateMessage kind="error">No se pudo cargar. Revisa tu conexión e intenta otra vez.</StateMessage>
      )}
      {questions.data && questions.data.length === 0 && <StateMessage>Todavía no hay preguntas aquí.</StateMessage>}
      {questions.data && questions.data.length > 0 && <QuizRunner key={sectionId} questions={questions.data} />}
    </main>
  )
}

function QuizRunner({ questions }: { questions: Question[] }) {
  // Historial de preguntas vistas: permite volver a la anterior.
  const [history, setHistory] = useState<number[]>(() => [Math.floor(Math.random() * questions.length)])
  const [pos, setPos] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const { play, stop } = useAudioPlayer()

  const question = questions[history[pos]]
  const options = useMemo(() => shuffle(question.question_options), [question.id, pos]) // eslint-disable-line react-hooks/exhaustive-deps
  const questionAudio = mediaUrl(question.audio_path)
  const soundAudio = mediaUrl(question.sound_path)

  // Al cambiar de pregunta: se reinicia el estado y se lee la pregunta.
  useEffect(() => {
    setWrong([])
    setDone(false)
    play(questionAudio)
    return stop
  }, [question.id, pos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guarda audios e imágenes para usar sin conexión.
  useEffect(() => {
    const urls = questions.flatMap((q) => [
      mediaUrl(q.audio_path),
      mediaUrl(q.sound_path),
      ...q.question_options.map((o) => mediaUrl(o.image_path))
    ])
    void prefetchMedia(urls)
  }, [questions])

  const next = () => {
    if (pos < history.length - 1) {
      setPos(pos + 1)
      return
    }
    const all = questions.map((_, i) => i)
    const unseen = all.filter((i) => !history.includes(i))
    const pool = unseen.length > 0 ? unseen : all.filter((i) => i !== history[pos])
    const pick = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : history[pos]
    setHistory([...history, pick])
    setPos(pos + 1)
  }
  const prev = () => {
    if (pos > 0) setPos(pos - 1)
  }

  const choose = (id: string, correct: boolean) => {
    if (done) return
    if (correct) setDone(true)
    else if (!wrong.includes(id)) setWrong([...wrong, id])
  }

  const retry = !done && wrong.length > 0

  return (
    <>
      <section className="question-card">
        <p className="question-text">{question.text}</p>
        <div className="question-actions">
          <button type="button" className="btn btn-primary" onClick={() => play(questionAudio)} disabled={!questionAudio}>
            <UiIcon name="speaker" size={30} />
            <span>Escuchar</span>
          </button>
          {soundAudio && (
            <button type="button" className="btn btn-yellow" onClick={() => play(soundAudio)} aria-label="Escuchar el sonido">
              <UiIcon name="wave" size={30} />
              <span>Sonido</span>
            </button>
          )}
        </div>
      </section>

      <div className={done ? 'feedback feedback-ok' : retry ? 'feedback feedback-retry' : 'feedback'} role="status" aria-live="polite">
        {done && <UiIcon name="check" size={28} />}
        {retry && <UiIcon name="x" size={28} />}
        <span>{done ? '¡Muy bien!' : retry ? '¡Casi! Prueba otra vez' : 'Toca la respuesta'}</span>
      </div>

      <div className="quiz-options">
        {options.map((o, i) => {
          const isWrong = wrong.includes(o.id)
          const isRight = done && o.is_correct
          const img = mediaUrl(o.image_path)
          return (
            <button
              key={o.id}
              type="button"
              className={isRight ? 'option option-right' : isWrong ? 'option option-wrong' : 'option'}
              onClick={() => choose(o.id, o.is_correct)}
              aria-label={`Opción ${i + 1}`}
            >
              {img ? (
                <img src={img} alt="" crossOrigin="anonymous" draggable={false} />
              ) : (
                <span className="option-text">{o.text}</span>
              )}
              {isRight && (
                <span className="badge badge-ok">
                  <UiIcon name="check" size={26} />
                </span>
              )}
              {isWrong && (
                <span className="badge badge-bad">
                  <UiIcon name="x" size={24} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <nav className="quiz-nav">
        <button type="button" className="btn btn-white btn-prev" onClick={prev} disabled={pos === 0} aria-label="Pregunta anterior">
          <UiIcon name="back" size={40} />
        </button>
        <button type="button" className={done ? 'btn btn-primary btn-next' : 'btn btn-white btn-next'} onClick={next}>
          <span>Siguiente</span>
          <UiIcon name="next" size={36} />
        </button>
      </nav>
    </>
  )
}
