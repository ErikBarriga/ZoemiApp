import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Banner } from './components/ui'
import { useAuth } from './lib/auth'
import { configured } from './lib/supabase'
import Login from './pages/Login'
import NoiseForm from './pages/NoiseForm'
import NoiseList from './pages/NoiseList'
import QuestionForm from './pages/QuestionForm'
import Questions from './pages/Questions'
import Sections from './pages/Sections'
import SongForm from './pages/SongForm'
import Songs from './pages/Songs'

export default function App() {
  const { stage } = useAuth()

  if (!configured) {
    return (
      <div className="login-wrap">
        <Banner kind="error">
          Falta configurar Supabase. Copia .env.example como .env.local y llena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
        </Banner>
      </div>
    )
  }
  // Sin sesión de administrador verificada no se muestra NADA del panel.
  if (stage !== 'ready') return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/preguntas" replace />} />
        <Route path="/preguntas" element={<Questions />} />
        <Route path="/preguntas/nueva" element={<QuestionForm />} />
        <Route path="/preguntas/:id" element={<QuestionForm />} />
        <Route path="/secciones" element={<Sections />} />
        <Route path="/ruido" element={<NoiseList />} />
        <Route path="/ruido/nueva" element={<NoiseForm />} />
        <Route path="/ruido/:id" element={<NoiseForm />} />
        <Route path="/karaoke" element={<Songs />} />
        <Route path="/karaoke/nueva" element={<SongForm />} />
        <Route path="/karaoke/:id" element={<SongForm />} />
        <Route path="*" element={<Navigate to="/preguntas" replace />} />
      </Route>
    </Routes>
  )
}
