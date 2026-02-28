import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import PlayerJoin from './pages/PlayerJoin.jsx'
import PlayerGame from './pages/PlayerGame.jsx'
import HostGame from './pages/HostGame.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminEditor from './pages/AdminEditor.jsx'
import MuteButton from './components/MuteButton.jsx'

export default function App() {
  return (
    <div className="h-full relative">
      <MuteButton />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<PlayerJoin />} />
        <Route path="/play" element={<PlayerGame />} />
        <Route path="/host" element={<HostGame />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/quiz/:id" element={<AdminEditor />} />
        <Route path="/admin/quiz/new" element={<AdminEditor />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}
