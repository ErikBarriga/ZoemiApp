import type { CSSProperties } from 'react'
import type { Direction } from '../types'

/** Igual que en el front office: así la vista previa es idéntica a lo que verá el niño. */
export function revealStyle(direction: Direction, visible: number): CSSProperties {
  const v = Math.max(0, Math.min(1, visible))
  const hidden = Math.round((1 - v) * 100)
  switch (direction) {
    case 'bottom':
      return { transform: `translateY(${hidden}%)` }
    case 'top':
      return { transform: `translateY(-${hidden}%)` }
    case 'left':
      return { transform: `translateX(-${hidden}%)` }
    case 'right':
      return { transform: `translateX(${hidden}%)` }
    default: {
      if (v <= 0) return { opacity: 0 }
      const r = v * 100
      const mask = `radial-gradient(circle at 50% 50%, #000 ${r}%, transparent ${r + 0.5}%)`
      return { WebkitMaskImage: mask, maskImage: mask }
    }
  }
}
