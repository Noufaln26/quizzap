import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { socket } from '../lib/socket.js'
import { sounds } from '../lib/sounds.js'

const COLORS = [
  { bg: 'bg-answer-red', border: 'border-red-400', shape: '▲' },
  { bg: 'bg-answer-blue', border: 'border-blue-400', shape: '◆' },
  { bg: 'bg-answer-yellow', border: 'border-yellow-400', shape: '●' },
  { bg: 'bg-answer-green', border: 'border-green-400', shape: '■' },
]

export default function PlayerGame() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { pin, nickname } = state || {}

  const [phase, setPhase] = useState('waiting') // waiting | question | answered | reveal | leaderboard | podium
  const [question, setQuestion] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [result, setResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [podium, setPodium] = useState(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(100) // percent
  const timerRef = useRef(null)
  const timerStartRef = useRef(null)

  useEffect(() => {
    if (!pin || !nickname) { navigate('/'); return }

    socket.on('game:started', () => setPhase('waiting'))

    socket.on('question:start', (data) => {
      setQuestion(data)
      setSelectedIndex(null)
      setResult(null)
      setPhase('question')
      setTimeLeft(100)
      timerStartRef.current = Date.now()

      // Animate timer bar
      clearInterval(timerRef.current)
      const total = data.timerSeconds * 1000
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStartRef.current
        const pct = Math.max(0, 100 - (elapsed / total) * 100)
        setTimeLeft(pct)
        if (pct <= 20) sounds.countdownUrgent()
        if (pct <= 0) clearInterval(timerRef.current)
      }, 100)
    })

    socket.on('answer:received', () => {
      sounds.answerSubmit()
      setPhase('answered')
    })

    socket.on('answer:reveal', (data) => {
      clearInterval(timerRef.current)
      sounds[data.isCorrect ? 'correct' : 'wrong']()
      setResult(data)
      setPhase('reveal')
    })

    socket.on('leaderboard:update', ({ leaderboard: lb }) => {
      sounds.leaderboard()
      setLeaderboard(lb)
      setPhase('leaderboard')
    })

    socket.on('game:ended', ({ leaderboard: lb }) => {
      sounds.podium()
      setLeaderboard(lb)
      setPhase('podium')
    })

    socket.on('host:disconnected', () => {
      setPhase('disconnected')
    })

    socket.on('disconnect', (reason) => {
      // Only show disconnect screen immediately if the server explicitly ended the connection.
      // For transient drops (transport errors, timeouts), wait for reconnection to fail.
      if (reason === 'io server disconnect') {
        setPhase('disconnected')
      }
    })

    socket.on('reconnect_failed', () => {
      setPhase('disconnected')
    })

    return () => {
      clearInterval(timerRef.current)
      socket.off('game:started')
      socket.off('question:start')
      socket.off('answer:received')
      socket.off('answer:reveal')
      socket.off('leaderboard:update')
      socket.off('game:ended')
      socket.off('host:disconnected')
      socket.off('disconnect')
      socket.off('reconnect_failed')
    }
  }, [pin, nickname, navigate])

  function handleAnswer(index) {
    if (phase !== 'question' || selectedIndex !== null) return
    setSelectedIndex(index)
    socket.emit('player:answer', { pin, optionIndex: index })
  }

  const myRank = leaderboard.findIndex(p => p.nickname === nickname) + 1
  const myScore = leaderboard.find(p => p.nickname === nickname)?.score || 0

  // ── Waiting ──────────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-pulse text-6xl mb-6">⚡</div>
        <h2 className="font-display text-3xl text-zap-yellow mb-2">Get Ready!</h2>
        <p className="text-white/60 font-body text-lg mb-2">You're in as</p>
        <div className="bg-white/10 rounded-2xl px-6 py-3 mb-8">
          <span className="font-display text-2xl text-white">{nickname}</span>
        </div>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-zap-yellow animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-white/40 font-body text-sm mt-4">Waiting for host to start...</p>
      </div>
    )
  }

  // ── Question ─────────────────────────────────────────────────────────────
  if (phase === 'question' || phase === 'answered') {
    const timerColor = timeLeft > 50 ? 'bg-green-400' : timeLeft > 25 ? 'bg-yellow-400' : 'bg-red-400'
    return (
      <div className="h-full flex flex-col bg-zap">
        {/* Timer bar */}
        <div className="h-2 bg-white/10 flex-shrink-0">
          <div
            className={`h-full ${timerColor} transition-all ease-linear`}
            style={{ width: `${timeLeft}%`, transition: phase === 'question' ? 'width 0.1s linear' : 'none' }}
          />
        </div>

        {/* Question info */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-white/50 font-body text-xs font-bold uppercase tracking-widest">
              Q{question?.questionNumber}/{question?.totalQuestions}
            </span>
            <span className="text-white/50 font-body text-xs">{Math.round(timeLeft / 100 * (question?.timerSeconds || 20))}s</span>
          </div>
        </div>

        {/* Question text + image */}
        <div className="flex-1 flex flex-col justify-end px-4 pb-3 min-h-0">
          {question?.imageUrl && (
            <img
              src={question.imageUrl}
              alt=""
              className="w-full max-h-32 object-cover rounded-xl mb-3"
            />
          )}
          <div className="bg-white/10 rounded-2xl px-4 py-3 mb-4">
            <p className="font-body font-bold text-white text-lg text-center leading-snug">
              {question?.questionText}
            </p>
          </div>

          {/* Answer buttons */}
          <div className="grid grid-cols-2 gap-3">
            {question?.options?.map((opt, i) => {
              const col = COLORS[i]
              const isSelected = selectedIndex === i
              const isLocked = phase === 'answered'
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={isLocked}
                  className={`answer-btn ${col.bg} ${isSelected ? 'ring-4 ring-white scale-95' : ''} ${isLocked && !isSelected ? 'opacity-40' : ''} justify-start`}
                >
                  <span className="text-2xl flex-shrink-0">{col.shape}</span>
                  <span className="text-sm font-body font-bold leading-tight text-left">{opt.text}</span>
                </button>
              )
            })}
          </div>

          {phase === 'answered' && (
            <div className="text-center mt-4 animate-slide-up">
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-zap-yellow animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-white/50 font-body text-sm mt-2">Answer locked! Waiting...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Reveal ───────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const isCorrect = result?.isCorrect
    return (
      <div className={`h-full flex flex-col items-center justify-center px-6 text-center ${isCorrect ? 'bg-green-900' : 'bg-red-900'} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 animate-bounce-in">
          <div className="text-8xl mb-4">{isCorrect ? '✅' : '❌'}</div>
          <h2 className={`font-display text-4xl mb-2 ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
            {isCorrect ? 'Correct!' : 'Wrong!'}
          </h2>

          {isCorrect && (
            <div className="space-y-2 mb-6">
              <div className="bg-white/10 rounded-2xl px-6 py-3">
                <span className="font-display text-3xl text-zap-yellow">+{result.points}</span>
                <p className="text-white/60 font-body text-sm">points</p>
              </div>
              {result.streak > 1 && (
                <div className="bg-orange-500/30 rounded-xl px-4 py-2">
                  <span className="text-orange-300 font-body font-bold text-sm">🔥 {result.streak}x Streak! +{result.streakBonus}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-white/10 rounded-2xl px-6 py-3">
            <p className="text-white/60 font-body text-sm">Total Score</p>
            <span className="font-display text-3xl text-white">{result?.totalScore || 0}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  if (phase === 'leaderboard') {
    return (
      <div className="h-full bg-zap flex flex-col px-4 py-6 overflow-hidden">
        <h2 className="font-display text-3xl text-zap-yellow text-center mb-4 animate-slide-down">⚡ Leaderboard</h2>

        {/* My rank highlight */}
        {myRank > 0 && (
          <div className="bg-zap-yellow/20 border border-zap-yellow/40 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between animate-bounce-in">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl text-zap-yellow">#{myRank}</span>
              <span className="font-body font-bold text-white">{nickname}</span>
            </div>
            <span className="font-display text-xl text-zap-yellow">{myScore}</span>
          </div>
        )}

        {/* Top players */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {leaderboard.slice(0, 8).map((p, i) => (
            <div
              key={p.nickname}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 animate-slide-up stagger-${Math.min(i+1,4)} ${p.nickname === nickname ? 'bg-zap-yellow/20 border border-zap-yellow/30' : 'bg-white/10'}`}
            >
              <span className="font-display text-xl text-white/60 w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="font-body font-bold text-white flex-1 truncate">{p.nickname}</span>
              <span className="font-display text-lg text-zap-yellow">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Podium / End ─────────────────────────────────────────────────────────
  if (phase === 'podium') {
    const isWinner = myRank === 1
    const isTop3 = myRank <= 3
    const top3 = leaderboard.slice(0, 3)

    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-6 text-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-zap-electric/20 to-transparent" />
        <div className="relative z-10 animate-bounce-in w-full max-w-sm">
          <div className="text-6xl mb-2">{isWinner ? '🏆' : isTop3 ? '🎉' : '⭐'}</div>
          <h2 className="font-display text-4xl text-zap-yellow mb-1">Game Over!</h2>

          {/* Player result */}
          <div className="bg-white/10 rounded-2xl px-6 py-4 mb-6">
            <p className="text-white/60 font-body text-sm mb-1">Your final rank</p>
            <div className="font-display text-5xl text-white">#{myRank}</div>
            <p className="font-body font-bold text-zap-yellow text-xl mt-1">{myScore} pts</p>
            {isWinner && <p className="text-yellow-300 font-body font-bold mt-2">🏆 You won! Amazing!</p>}
          </div>

          {/* Top 3 */}
          <div className="space-y-2 mb-6">
            {top3.map((p, i) => (
              <div key={p.nickname} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${i === 0 ? 'bg-yellow-500/30' : 'bg-white/10'}`}>
                <span className="text-xl">{['🥇','🥈','🥉'][i]}</span>
                <span className="font-body font-bold text-white flex-1 text-left truncate">{p.nickname}</span>
                <span className="font-display text-lg text-zap-yellow">{p.score}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-zap-yellow text-zap-purple font-display text-xl py-4 rounded-2xl shadow-xl active:scale-95 transition-transform"
          >
            Play Again ⚡
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'disconnected') {
    return (
      <div className="h-full bg-zap flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="font-display text-3xl text-red-400 mb-2">Connection Lost</h2>
        <p className="text-white/60 font-body mb-6">The game session ended or the connection dropped.</p>
        <button onClick={() => navigate('/')} className="bg-zap-yellow text-zap-purple font-display text-xl px-8 py-3 rounded-2xl active:scale-95 transition-transform">
          Go Home
        </button>
      </div>
    )
  }

  return null
}
