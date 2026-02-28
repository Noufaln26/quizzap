import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full bg-zap flex flex-col items-center justify-center relative overflow-hidden noise">
      {/* Decorative orbs */}
      <div className="absolute top-[-100px] right-[-80px] w-64 h-64 rounded-full bg-zap-electric opacity-20 blur-3xl" />
      <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-zap-pink opacity-20 blur-3xl" />

      {/* Logo */}
      <div className="animate-bounce-in flex flex-col items-center mb-10">
        <div className="text-7xl mb-2 animate-zap-flash">⚡</div>
        <h1 className="font-display text-6xl text-zap-yellow tracking-wide drop-shadow-lg">
          QuizZap
        </h1>
        <p className="text-white/60 font-body text-lg mt-2 font-semibold">Party quiz. Lightning fast.</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs px-6 animate-slide-up">
        <button
          onClick={() => navigate('/join')}
          className="bg-zap-yellow text-zap-purple font-display text-2xl py-4 rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          Join Game
        </button>
        <button
          onClick={() => navigate('/host')}
          className="bg-zap-electric text-white font-display text-2xl py-4 rounded-2xl shadow-xl active:scale-95 transition-transform border-2 border-white/20"
        >
          Host Game
        </button>
      </div>

      {/* Admin link */}
      <button
        onClick={() => navigate('/admin')}
        className="absolute bottom-8 text-white/30 font-body text-sm underline active:text-white/60"
      >
        Quiz Creator
      </button>
    </div>
  )
}
