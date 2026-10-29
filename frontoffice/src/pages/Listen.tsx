import { ScreenHeader } from '../components/ScreenHeader'
import { StateMessage } from '../components/StateMessage'
import { Tile } from '../components/Tile'
import { getSections } from '../lib/api'
import { useAsync } from '../lib/hooks'

export default function Listen() {
  const { data, error, loading } = useAsync(getSections, [])
  return (
    <main className="screen">
      <ScreenHeader title="Escucha la Pregunta" color="#8EC5FF" />
      {loading && <StateMessage>Cargando…</StateMessage>}
      {error && <StateMessage kind="error">No se pudo cargar. Revisa tu conexión e intenta otra vez.</StateMessage>}
      {data && data.length === 0 && <StateMessage>Todavía no hay secciones.</StateMessage>}
      {data && data.length > 0 && (
        <div className="tiles">
          {data.map((s) => (
            <Tile key={s.id} to={`/escucha/${s.id}`} label={s.name} icon={s.icon} color={s.color} />
          ))}
        </div>
      )}
    </main>
  )
}
