import { Link } from 'react-router-dom'
import { TileIcon } from './icons'

interface Props {
  to: string
  label: string
  icon: string
  color: string
  big?: boolean
}

/** Mosaico grande: ícono + texto simple. Es un enlace de ≥ 200 px para facilitar el toque. */
export function Tile({ to, label, icon, color, big }: Props) {
  return (
    <Link to={to} className={big ? 'tile tile-big' : 'tile'} style={{ background: color }}>
      <TileIcon name={icon} size={big ? 144 : 104} />
      <span>{label}</span>
    </Link>
  )
}
