import { ScreenHeader } from '../components/ScreenHeader'
import { Tile } from '../components/Tile'

export default function Voice() {
  return (
    <main className="screen">
      <ScreenHeader title="Practica tu Voz" color="#8FE3C8" />
      <div className="tiles">
        <Tile to="/voz/ruido" label="Haz ruido" icon="mic" color="#8FE3C8" />
        <Tile to="/voz/karaoke" label="Karaoke" icon="note" color="#FFA8C8" />
      </div>
    </main>
  )
}
