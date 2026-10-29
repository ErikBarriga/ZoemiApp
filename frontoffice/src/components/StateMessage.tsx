import type { ReactNode } from 'react'

export function StateMessage({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'error' }) {
  return (
    <p className={kind === 'error' ? 'state-message state-error' : 'state-message'} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
