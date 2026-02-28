import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleLogin() {
    if (!password) { setError('Enter password'); return }
    // Store in sessionStorage and test against server
    sessionStorage.setItem('quizzap-admin', password)
    // Verify by trying to fetch quizzes with this password
    fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/quizzes`, {
      headers: { 'x-admin-password': password }
    }).then(r => {
      if (r.status === 401) { setError('Wrong password'); sessionStorage.removeItem('quizzap-admin') }
      else navigate('/admin/dashboard')
    }).catch(() => navigate('/admin/dashboard'))
  }

  return (
    <div className="h-full bg-zap flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-5xl">🔐</span>
          <h1 className="font-display text-4xl text-zap-yellow mt-2">Admin</h1>
          <p className="text-white/50 font-body mt-1">Quiz Creator</p>
        </div>

        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-5 py-4 text-white font-body text-xl placeholder:text-white/20 focus:outline-none focus:border-zap-yellow transition-colors mb-4"
          style={{ fontSize: '18px' }}
        />

        {error && <p className="text-red-400 font-body text-center mb-4">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full bg-zap-yellow text-zap-purple font-display text-2xl py-4 rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          Enter ⚡
        </button>

        <button onClick={() => navigate('/')} className="w-full mt-4 text-white/40 font-body text-sm py-2">← Back</button>
      </div>
    </div>
  )
}
