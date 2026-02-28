export async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const count = 200
  const defaults = { origin: { y: 0.7 } }

  function fire(particleRatio, opts) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) })
  }

  fire(0.25, { spread: 26, startVelocity: 55, colors: ['#FFD600', '#7B2FFF'] })
  fire(0.2, { spread: 60, colors: ['#FF2D78', '#00E5FF'] })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#FFD600', '#ffffff'] })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45, colors: ['#7B2FFF', '#FF2D78'] })
}
