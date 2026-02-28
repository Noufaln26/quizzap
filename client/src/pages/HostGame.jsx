import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.js'
import { sounds } from '../lib/sounds.js'
import { fireConfetti } from '../lib/confetti.js'
import { apiFetch } from '../lib/socket.js'

const COLORS = [
  { bg: 'bg-answer-red', label: 'A', shape: '▲' },
  { bg: 'bg-answer-blue', label: 'B', shape: '◆' },
  { bg: 'bg-answer-yellow', label: 'C', shape: '●' },
  { bg: 'bg-answer-green', label: 'D', shape: '■' },
]

export default function HostGame() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('setup') // setup | lobby | question | reveal | leaderboard | podium
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [pin, setPin] = useState(null)
  const [players, setPlayers] = useState([])
  const [question, setQuestion] = useState(null)
  const [answerCount, setAnswerCount] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [revealData, setRevealData] = useState(null)
  const [timeLeft, setTimeLeft] = useState(100)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)
  const timerStartRef = useRef(null)

  useEffect(() => {
    apiFetch('/quizzes').then(setQuizzes).catch(() => {})

    if (!socket.connected) socket.connect()

    socket.on('game:created', ({ pin: p, quizTitle, questionCount }) => {
      setPin(p)
      setPhase('lobby')
    })

    socket.on('player:joined', ({ players: ps }) => {
      sounds.tick()
      setPlayers(ps)
    })

    socket.on('player:left', ({ players: ps }) => setPlayers(ps || []))

    socket.on('question:start', (data) => {
      setQuestion(data)
      setAnswerCount(0)
      setRevealData(null)
      setPhase('question')
      setTimeLeft(100)
      timerStartRef.current = Date.now()

      clearInterval(timerRef.current)
      const total = data.timerSeconds * 1000
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStartRef.current
        const pct = Math.max(0, 100 - (elapsed / total) * 100)
        setTimeLeft(pct)
        if (pct <= 0) clearInterval(timerRef.current)
      }, 100)
    })

    socket.on('answer:count', ({ count }) => setAnswerCount(count))

    socket.on('answer:reveal', (data) => {
      clearInterval(timerRef.current)
      setRevealData(data)
      setPhase('reveal')
    })

    socket.on('leaderboard:update', ({ leaderboard: lb }) => {
      sounds.leaderboard()
      setLeaderboard(lb)
      setPhase('leaderboard')
    })

    socket.on('game:ended', ({ leaderboard: lb }) => {
      setLeaderboard(lb)
      setPhase('podium')
      setTimeout(() => fireConfetti(), 300)
      sounds.podium()
    })

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        setPhase('disconnected')
      }
    })

    socket.on('reconnect_failed', () => {
      setPhase('disconnected')
    })

    return () => {
      clearInterval(timerRef.current)
      socket.off('game:created')
      socket.off('player:joined')
      socket.off('player:left')
      socket.off('question:start')
      socket.off('answer:count')
      socket.off('answer:reveal')
      socket.off('leaderboard:update')
      socket.off('game:ended')
      socket.off('disconnect')
      socket.off('reconnect_failed')
    }
  }, [])

  function launchGame() {
    if (!selectedQuiz) return
    setLoading(true)
    socket.emit('host:create-game', { quizId: selectedQuiz.id })
    setLoading(false)
  }

  function startGame() {
    if (players.length === 0) return
    socket.emit('host:start-game', { pin })
    setPhase('question-wait')
    socket.emit('host:next-question', { pin })
  }

  function nextQuestion() {
    socket.emit('host:next-question', { pin })
  }

  function revealAnswer() {
    socket.emit('host:reveal', { pin })
  }

  function showLeaderboard() {
    socket.emit('host:show-leaderboard', { pin })
  }

  const joinUrl = `${window.location.origin}/join`

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-8 overflow-y-auto py-8">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="text-center mb-8">
            <span className="text-5xl">⚡</span>
            <h1 className="font-display text-4xl text-zap-yellow mt-1">Host a Game</h1>
            <p className="text-white/50 font-body mt-1">Select a quiz to begin</p>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center text-white/40 font-body py-12">
              <p className="text-4xl mb-3">📝</p>
              <p>No quizzes yet.</p>
              <button onClick={() => navigate('/admin')} className="mt-4 text-zap-yellow underline">Create one in Admin →</button>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {quizzes.map(q => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuiz(q)}
                  className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${selectedQuiz?.id === q.id ? 'border-zap-yellow bg-zap-yellow/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                >
                  <div className="font-display text-xl text-white">{q.title}</div>
                  {q.description && <div className="text-white/50 font-body text-sm mt-1">{q.description}</div>}
                </button>
              ))}
            </div>
          )}

          {selectedQuiz && (
            <button
              onClick={launchGame}
              disabled={loading}
              className="w-full bg-zap-yellow text-zap-purple font-display text-2xl py-4 rounded-2xl shadow-xl active:scale-95 transition-transform"
            >
              {loading ? 'Creating...' : '⚡ Launch Game'}
            </button>
          )}

          <button onClick={() => navigate('/')} className="w-full mt-4 text-white/40 font-body text-sm py-2">← Back</button>
        </div>
      </div>
    )
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-8 text-center">
        <div className="w-full max-w-2xl animate-bounce-in">
          <p className="text-white/60 font-body font-bold text-lg uppercase tracking-widest mb-2">Join at</p>
          <p className="text-zap-cyan font-display text-2xl mb-4">{joinUrl}</p>

          <div className="bg-white/10 rounded-3xl px-10 py-6 mb-6 inline-block">
            <p className="text-white/60 font-body text-sm uppercase tracking-widest mb-1">Game PIN</p>
            <div className="font-display text-7xl text-zap-yellow tracking-widest">{pin}</div>
          </div>

          {/* Players grid */}
          <div className="mb-6">
            <p className="text-white/50 font-body text-sm mb-3">{players.length} player{players.length !== 1 ? 's' : ''} joined</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map(p => (
                <div key={p.nickname} className="bg-zap-electric/40 rounded-full px-4 py-2 animate-bounce-in">
                  <span className="font-body font-bold text-white text-sm">⚡ {p.nickname}</span>
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-white/30 font-body text-sm">Waiting for players to join...</p>
              )}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={players.length === 0}
            className="bg-zap-yellow text-zap-purple font-display text-2xl px-12 py-4 rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-40"
          >
            Start Game ⚡
          </button>
        </div>
      </div>
    )
  }

  // ── Question ─────────────────────────────────────────────────────────────
  if (phase === 'question') {
    const timerColor = timeLeft > 50 ? 'bg-green-400' : timeLeft > 25 ? 'bg-yellow-400' : 'bg-red-400'
    return (
      <div className="h-full bg-zap flex flex-col">
        {/* Timer bar */}
        <div className="h-3 bg-white/10">
          <div className={`h-full ${timerColor} transition-all ease-linear`} style={{ width: `${timeLeft}%` }} />
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 min-h-0">
          {/* Left: Question */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-body text-white/50 font-bold">Q{question?.questionNumber} of {question?.totalQuestions}</span>
              <div className="bg-zap-yellow/20 rounded-full px-4 py-1">
                <span className="font-display text-zap-yellow">{Math.round(timeLeft / 100 * (question?.timerSeconds || 20))}s</span>
              </div>
            </div>

            {question?.imageUrl && (
              <img src={question.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-2xl mb-4" />
            )}

            <div className="bg-white/10 rounded-2xl p-6 flex-1 flex items-center justify-center">
              <p className="font-display text-3xl text-white text-center leading-snug">{question?.questionText}</p>
            </div>
          </div>

          {/* Right: Answers + stats */}
          <div className="flex flex-col gap-3 lg:w-96">
            {/* Answer count */}
            <div className="bg-white/10 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-body text-white/70">Answers in</span>
              <span className="font-display text-2xl text-zap-yellow">{answerCount}/{question?.playerCount}</span>
            </div>

            {/* Colored answer tiles */}
            {question?.options?.map((opt, i) => (
              <div key={i} className={`${COLORS[i].bg} rounded-2xl p-3 flex items-center gap-3`}>
                <span className="text-2xl text-white">{COLORS[i].shape}</span>
                <span className="font-body font-bold text-white flex-1">{opt.text}</span>
              </div>
            ))}

            <button
              onClick={revealAnswer}
              className="mt-auto bg-white text-zap-purple font-display text-xl py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Reveal Answer ⚡
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const totalVotes = revealData?.totalAnswered || 0
    return (
      <div className="h-full bg-zap flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl text-zap-yellow">Answer Revealed!</h2>
          <span className="text-white/50 font-body">{revealData?.totalAnswered}/{revealData?.totalPlayers} answered</span>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4 mb-6">
          {question?.options?.map((opt, i) => {
            const isCorrect = i === revealData?.correctIndex
            const votes = revealData?.voteCounts?.[i] || 0
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
            return (
              <div
                key={i}
                className={`${COLORS[i].bg} rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden ${!isCorrect ? 'opacity-50' : ''}`}
              >
                {isCorrect && (
                  <div className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center">
                    <span className="text-green-600 text-lg">✓</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl text-white">{COLORS[i].shape}</span>
                  <span className="font-body font-bold text-white">{opt.text}</span>
                </div>
                <div className="bg-black/20 rounded-full h-2 mb-1">
                  <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-display text-white text-sm">{votes} votes ({pct}%)</span>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={showLeaderboard}
            className="flex-1 bg-zap-yellow text-zap-purple font-display text-xl py-4 rounded-2xl active:scale-95 transition-transform"
          >
            Show Leaderboard
          </button>
        </div>
      </div>
    )
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  if (phase === 'leaderboard') {
    return (
      <div className="h-full bg-zap flex flex-col p-6">
        <h2 className="font-display text-4xl text-zap-yellow text-center mb-6 animate-slide-down">⚡ Leaderboard</h2>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {leaderboard.slice(0, 10).map((p, i) => (
            <div
              key={p.nickname}
              className={`flex items-center gap-4 rounded-2xl px-5 py-4 animate-slide-up stagger-${Math.min(i+1,4)} ${i === 0 ? 'bg-yellow-500/30 border border-yellow-400/40' : 'bg-white/10'}`}
            >
              <span className="font-display text-2xl w-10 text-center text-white/70">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
              </span>
              <span className="font-body font-bold text-white flex-1 text-lg truncate">{p.nickname}</span>
              <span className="font-display text-2xl text-zap-yellow">{p.score}</span>
            </div>
          ))}
        </div>
        <button
          onClick={nextQuestion}
          className="w-full bg-zap-yellow text-zap-purple font-display text-xl py-4 rounded-2xl active:scale-95 transition-transform"
        >
          Next Question ⚡
        </button>
      </div>
    )
  }

  // ── Podium ────────────────────────────────────────────────────────────────
  if (phase === 'podium') {
    const top3 = leaderboard.slice(0, 3)
    const order = [1, 0, 2] // 2nd, 1st, 3rd visual podium order
    const heights = ['h-28', 'h-40', 'h-20']
    const medals = ['🥈', '🥇', '🥉']

    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zap-electric/30 to-transparent pointer-events-none" />
        <div className="relative z-10 w-full max-w-2xl animate-bounce-in">
          <h2 className="font-display text-5xl text-zap-yellow text-center mb-2">Game Over!</h2>
          <p className="text-white/50 font-body text-center mb-8">Final Results</p>

          {/* Podium visual */}
          <div className="flex items-end justify-center gap-3 mb-8">
            {order.map((pos, vi) => {
              const player = top3[pos]
              if (!player) return <div key={vi} className={`${heights[vi]} w-28`} />
              return (
                <div key={vi} className="flex flex-col items-center">
                  <span className="text-3xl mb-1">{medals[vi]}</span>
                  <div className="font-body font-bold text-white text-sm text-center truncate w-24 mb-2">{player.nickname}</div>
                  <div className={`${heights[vi]} w-28 rounded-t-2xl flex flex-col items-center justify-end pb-3 ${pos === 0 ? 'bg-zap-yellow' : pos === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                    <span className={`font-display text-lg ${pos === 0 ? 'text-zap-purple' : 'text-white'}`}>{player.score}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full leaderboard */}
          <div className="bg-white/10 rounded-2xl p-4 space-y-2 mb-6 max-h-48 overflow-y-auto">
            {leaderboard.map((p, i) => (
              <div key={p.nickname} className="flex items-center gap-3 text-white">
                <span className="font-display text-lg w-8 text-white/50">#{i+1}</span>
                <span className="font-body font-bold flex-1 truncate">{p.nickname}</span>
                <span className="font-display text-zap-yellow">{p.score}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { socket.disconnect(); navigate('/') }}
            className="w-full bg-zap-yellow text-zap-purple font-display text-xl py-4 rounded-2xl active:scale-95 transition-transform"
          >
            Play Again ⚡
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'disconnected') {
    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-8 text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="font-display text-3xl text-red-400 mb-2">Connection Lost</h2>
        <p className="text-white/60 font-body mb-6">The server connection dropped. Please restart the game.</p>
        <button onClick={() => { socket.connect(); navigate('/') }} className="bg-zap-yellow text-zap-purple font-display text-xl px-8 py-3 rounded-2xl active:scale-95 transition-transform">
          Go Home
        </button>
      </div>
    )
  }

  return null
}
