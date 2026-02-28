import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.js'
import { sounds } from '../lib/sounds.js'

export default function PlayerJoin() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleJoin() {
    if (pin.length !== 6) { setError('Enter your 6-digit PIN'); return }
    if (!nickname.trim()) { setError('Enter a nickname'); return }
    if (nickname.trim().length > 14) { setError('Nickname max 14 characters'); return }
    setError('')
    setLoading(true)
    sounds.answerSubmit()

    socket.off('join:success')
    socket.off('join:error')

    socket.on('join:success', ({ nickname: name }) => {
      socket.off('join:error')
      navigate('/play', { state: { pin, nickname: name } })
    })

    socket.on('join:error', ({ message }) => {
      setError(message)
      setLoading(false)
      socket.off('join:success')
    })

    socket.once('connect', () => {
      socket.emit('player:join', { pin, nickname: nickname.trim() })
    })

    socket.disconnect()
    socket.connect()
  }

  return (
    <div className="h-full bg-zap flex flex-col items-center justify-center px-6 relative overflow-hidden noise">
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-zap-electric opacity-15 blur-3xl" />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl">⚡</span>
          <h1 className="font-display text-4xl text-zap-yellow mt-1">Join QuizZap</h1>
        </div>

        {/* PIN Input */}
        <div className="mb-4">
          <label className="text-white/70 font-body font-bold text-sm uppercase tracking-widest mb-2 block">
            Game PIN
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            value={pin}
            onChange={e => setPin(e.target.value.slice(0, 6))}
            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-5 py-4 text-white font-display text-3xl text-center tracking-widest placeholder:text-white/20 focus:outline-none focus:border-zap-yellow transition-colors"
            style={{ fontSize: '28px' }}
            disabled={loading}
          />
        </div>

        {/* Nickname Input */}
        <div className="mb-6">
          <label className="text-white/70 font-body font-bold text-sm uppercase tracking-widest mb-2 block">
            Your Nickname
          </label>
          <input
            type="text"
            placeholder="e.g. QuizMaster99"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={14}
            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-5 py-4 text-white font-body font-bold text-xl placeholder:text-white/20 focus:outline-none focus:border-zap-yellow transition-colors"
            style={{ fontSize: '18px' }}
            disabled={loading}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 mb-4 text-red-300 font-body text-center animate-slide-down">
            {error}
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-zap-yellow text-zap-purple font-display text-2xl py-4 rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? '⚡ Joining...' : '⚡ Join Game'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 text-white/40 font-body text-sm py-2 active:text-white/70"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
