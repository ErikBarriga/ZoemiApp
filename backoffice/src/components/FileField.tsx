import { useState } from 'react'
import { ACCEPT, publicUrl, uploadMedia } from '../lib/storage'
import { errorMessage } from '../lib/hooks'

interface Props {
  label: string
  kind: 'image' | 'audio'
  path: string | null
  onChange: (path: string | null) => void
  help?: string
  compact?: boolean
}

/** Subir / reemplazar / quitar un audio o una imagen del bucket "media". */
export function FileField({ label, kind, path, onChange, help, compact }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = publicUrl(path)
  const inputId = `file-${label.replace(/\s+/g, '-')}-${kind}`

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadMedia(file, kind))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? 'file-field file-compact' : 'file-field'}>
      {!compact && <span className="field-label">{label}</span>}
      {help && <p className="help">{help}</p>}

      {path && url ? (
        <div className="file-chip">
          {kind === 'image' ? (
            <img src={url} alt="" className="file-thumb" />
          ) : (
            <audio src={url} controls preload="none" className="file-audio" />
          )}
          <span className="file-name">{path.split('/').pop()}</span>
          <button type="button" className="btn btn-secondary" onClick={() => onChange(null)}>
            Quitar
          </button>
        </div>
      ) : (
        <label htmlFor={inputId} className={busy ? 'btn btn-secondary is-busy' : 'btn btn-secondary'}>
          {busy ? 'Subiendo…' : kind === 'image' ? 'Subir imagen' : 'Subir audio'}
          <input
            id={inputId}
            type="file"
            accept={ACCEPT[kind]}
            className="visually-hidden"
            disabled={busy}
            onChange={(e) => {
              void pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
