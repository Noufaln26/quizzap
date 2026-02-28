import { useState } from 'react'
import { sounds } from '../lib/sounds.js'
import { useLocation } from 'react-router-dom'

export default function MuteButton() {
  const [muted, setMuted] = useState(sounds.isMuted())
  const location = useLocation()

  // Don't show on admin pages
  if (location.pathname.startsWith('/admin')) return null

  function toggle() {
    const nowMuted = sounds.toggleMute()
    setMuted(nowMuted)
  }

  return (
    <button
      onClick={toggle}
      className="fixed top-3 right-3 z-50 w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-lg active:scale-90 transition-transform"
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
