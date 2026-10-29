import { Navigate, Route, Routes } from 'react-router-dom'
import { configured } from './lib/supabase'
import { StateMessage } from './components/StateMessage'
import Home from './pages/Home'
import Listen from './pages/Listen'
import Quiz from './pages/Quiz'
import Voice from './pages/Voice'
import Noise from './pages/Noise'
import Karaoke from './pages/Karaoke'

export default function App() {
  if (!configured) {
    return (
      <main className="screen">
        <StateMessage kind="error">
          Falta configurar Supabase. Copia .env.example como .env.local y llena VITE_SUPABASE_URL y
          VITE_SUPABASE_ANON_KEY.
        </StateMessage>
      </main>
    )
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/escucha" element={<Listen />} />
      <Route path="/escucha/:sectionId" element={<Quiz />} />
      <Route path="/voz" element={<Voice />} />
      <Route path="/voz/ruido" element={<Noise />} />
      <Route path="/voz/karaoke" element={<Karaoke />} />
      <Route path="/voz/karaoke/:songId" element={<Karaoke />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
