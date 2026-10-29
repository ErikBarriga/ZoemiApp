import type { ReactNode } from 'react'

export function Banner({ kind, children }: { kind: 'ok' | 'error' | 'info'; children: ReactNode }) {
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="help">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Choice<T extends string>({
  options,
  value,
  onChange,
  label
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'choice choice-on' : 'choice'}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
