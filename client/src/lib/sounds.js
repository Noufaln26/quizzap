import { Howl, Howler } from 'howler'

// We'll use simple synthesized tones via Web Audio API as fallback
// since we don't have actual audio files. Real deployment should swap these for MP3s.

class SoundManager {
  constructor() {
    this.muted = localStorage.getItem('quizzap-muted') === 'true'
    this.ctx = null
  }

  getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    return this.ctx
  }

  playTone(freq, duration, type = 'sine', gain = 0.3) {
    if (this.muted) return
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gainNode.gain.setValueAtTime(gain, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch (e) {}
  }

  playChord(freqs, duration) {
    freqs.forEach(f => this.playTone(f, duration, 'triangle', 0.15))
  }

  tick() { this.playTone(880, 0.08, 'square', 0.15) }

  answerSubmit() { this.playTone(600, 0.12, 'sine', 0.2) }

  correct() {
    this.playTone(523, 0.1)
    setTimeout(() => this.playTone(659, 0.1), 100)
    setTimeout(() => this.playTone(784, 0.2), 200)
  }

  wrong() {
    this.playTone(200, 0.3, 'sawtooth', 0.2)
  }

  leaderboard() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.playTone(f, 0.15, 'triangle', 0.2), i * 120)
    )
  }

  podium() {
    const melody = [523, 659, 784, 659, 784, 1047]
    melody.forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, 'triangle', 0.25), i * 150))
  }

  countdownUrgent() { this.playTone(440, 0.06, 'square', 0.25) }

  toggleMute() {
    this.muted = !this.muted
    localStorage.setItem('quizzap-muted', this.muted)
    return this.muted
  }

  isMuted() { return this.muted }
}

export const sounds = new SoundManager()
