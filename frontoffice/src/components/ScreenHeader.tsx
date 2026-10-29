import { Link } from 'react-router-dom'
import { UiIcon } from './icons'

export function ScreenHeader({ title, color, back = '/' }: { title: string; color: string; back?: string }) {
  return (
    <header className="screen-header">
      <Link to={back} className="icon-btn" aria-label="Volver">
        <UiIcon name="back" size={40} />
      </Link>
      <h1 style={{ background: color }}>{title}</h1>
    </header>
  )
}
