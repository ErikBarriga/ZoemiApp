import { Tile } from '../components/Tile'

export default function Home() {
  return (
    <main className="screen">
      <header className="home-header">
        <p className="wordmark">ZoemiApp</p>
        <h1>¿Qué quieres hacer hoy?</h1>
        <p className="muted">Toca un cuadro grande</p>
      </header>
      <div className="tiles tiles-two">
        <Tile big to="/escucha" label="Escucha la Pregunta" icon="ear" color="#8EC5FF" />
        <Tile big to="/voz" label="Practica tu Voz" icon="mouth" color="#8FE3C8" />
      </div>
    </main>
  )
}
