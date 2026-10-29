import type { ReactNode } from 'react'

/** Íconos grandes de los mosaicos (cuadrícula de 64). */
const TILE: Record<string, ReactNode> = {
  paw: (
    <>
      <ellipse cx="32" cy="42" rx="12" ry="10" />
      <ellipse cx="14" cy="26" rx="5" ry="7" />
      <ellipse cx="26" cy="15" rx="5" ry="7" />
      <ellipse cx="38" cy="15" rx="5" ry="7" />
      <ellipse cx="50" cy="26" rx="5" ry="7" />
    </>
  ),
  question: (
    <>
      <circle cx="32" cy="32" r="26" />
      <path d="M23 25c0-5 4-9 9-9s9 4 9 8c0 6-9 7-9 13" />
      <circle cx="32" cy="47" r="1.5" fill="currentColor" />
    </>
  ),
  letters: (
    <>
      <path d="M6 46L18 14l12 32M10 36h16" />
      <path d="M42 22l6-6v32M40 48h16" />
    </>
  ),
  mic: (
    <>
      <rect x="24" y="6" width="16" height="30" rx="8" />
      <path d="M14 30c0 10 8 17 18 17s18-7 18-17M32 47v11M22 58h20" />
    </>
  ),
  note: (
    <>
      <path d="M24 48V12l30-6v36" />
      <circle cx="16" cy="48" r="8" />
      <circle cx="46" cy="42" r="8" />
    </>
  ),
  ear: (
    <>
      <path d="M20 28C20 14 28 8 36 8C46 8 52 16 52 24C52 34 44 36 42 44C40 52 34 56 28 56C22 56 20 52 22 48" />
      <path d="M32 24C32 19 41 19 41 25C41 31 34 32 33 38" />
    </>
  ),
  mouth: (
    <>
      <path d="M6 32C14 22 22 20 32 26C42 20 50 22 58 32C50 46 42 50 32 50C22 50 14 46 6 32Z" />
      <path d="M6 32C18 36 46 36 58 32" />
    </>
  ),
  star: <path d="M32 6l7.8 16.4 18 2.2-13.2 12.4 3.4 17.8L32 46l-16 8.8 3.4-17.8L6.2 24.6l18-2.2z" />,
  heart: <path d="M32 54C10 38 8 24 16 16c6-6 14-4 16 2 2-6 10-8 16-2 8 8 6 22-16 38z" />,
  sun: (
    <>
      <circle cx="32" cy="32" r="11" />
      <path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5" />
    </>
  )
}

export const TILE_ICON_NAMES = Object.keys(TILE)

export function TileIcon({ name, size = 112 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TILE[name] ?? TILE.star}
    </svg>
  )
}

/** Íconos pequeños de botones (cuadrícula de 32). */
const UI: Record<string, { node: ReactNode; filled?: boolean }> = {
  back: { node: <path d="M20 6L10 16l10 10" /> },
  next: { node: <path d="M12 6l10 10-10 10" /> },
  check: { node: <path d="M6 17l7 7 13-14" /> },
  x: { node: <path d="M8 8l16 16M24 8L8 24" /> },
  speaker: {
    node: (
      <>
        <path d="M4 12h6l8-6v20l-8-6H4z" />
        <path d="M23 11c2 2.5 2 7.5 0 10" />
      </>
    )
  },
  wave: { node: <path d="M3 16v0M8 11v10M13 6v20M18 10v12M23 13v6M28 15v2" /> },
  play: { node: <path d="M9 5l17 11L9 27z" />, filled: true },
  pause: {
    node: (
      <>
        <rect x="8" y="6" width="5" height="20" rx="1.5" />
        <rect x="19" y="6" width="5" height="20" rx="1.5" />
      </>
    ),
    filled: true
  },
  star: { node: <path d="M16 3l3.9 8.2 9 1.1-6.6 6.2 1.7 8.9L16 23l-8 4.4 1.7-8.9-6.6-6.2 9-1.1z" />, filled: true },
  refresh: { node: <path d="M6 16a10 10 0 1 0 3-7.2M6 5v6h6" /> }
}

export function UiIcon({ name, size = 32 }: { name: keyof typeof UI | string; size?: number }) {
  const icon = UI[name] ?? UI.star
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill={icon.filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon.node}
    </svg>
  )
}
