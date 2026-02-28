import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/socket.js'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const password = sessionStorage.getItem('quizzap-admin')

  useEffect(() => {
    if (!password) { navigate('/admin'); return }
    apiFetch('/quizzes').then(data => { setQuizzes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [password, navigate])

  async function deleteQuiz(id) {
    if (!confirm('Delete this quiz?')) return
    await apiFetch(`/quizzes/${id}`, { method: 'DELETE' }, password)
    setQuizzes(q => q.filter(x => x.id !== id))
  }

  return (
    <div className="h-full bg-zap flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/50 hover:text-white text-xl">←</button>
          <h1 className="font-display text-2xl text-zap-yellow">My Quizzes</h1>
        </div>
        <button
          onClick={() => navigate('/admin/quiz/new')}
          className="bg-zap-yellow text-zap-purple font-display text-base px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          + New Quiz
        </button>
      </div>

      {/* Quiz list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {!loading && quizzes.length === 0 && (
          <div className="text-center text-white/40 font-body py-20">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-xl font-bold mb-2">No quizzes yet</p>
            <p className="text-sm">Create your first quiz to get started</p>
            <button
              onClick={() => navigate('/admin/quiz/new')}
              className="mt-6 bg-zap-yellow text-zap-purple font-display text-lg px-6 py-3 rounded-xl"
            >
              Create Quiz ⚡
            </button>
          </div>
        )}

        <div className="space-y-3">
          {quizzes.map(q => (
            <div key={q.id} className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 animate-slide-up">
              {q.cover_image_url ? (
                <img src={q.cover_image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-zap-electric/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚡</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg text-white truncate">{q.title}</div>
                {q.description && <div className="text-white/50 font-body text-sm truncate">{q.description}</div>}
                <div className="text-white/30 font-body text-xs mt-1">
                  {new Date(q.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate(`/admin/quiz/${q.id}`)}
                  className="bg-zap-electric/40 text-white rounded-xl px-3 py-2 font-body text-sm font-bold active:scale-95"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteQuiz(q.id)}
                  className="bg-red-500/30 text-red-300 rounded-xl px-3 py-2 font-body text-sm font-bold active:scale-95"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
