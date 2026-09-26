/** Tiny synthesized sound effects (no audio files). Muted state is a per-browser preference. */

type Sfx = 'correct' | 'wrong' | 'levelup' | 'chest' | 'tap' | 'flip'

const KEY = 'finquest.muted'
let ctx: AudioContext | null = null

export function isMuted() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(m: boolean) {
  try {
    localStorage.setItem(KEY, m ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime + start)
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur + 0.05)
}

export function play(sfx: Sfx) {
  if (isMuted()) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    return
  }
  switch (sfx) {
    case 'correct':
      tone(660, 0, 0.12, 'triangle')
      tone(990, 0.09, 0.22, 'triangle')
      break
    case 'wrong':
      tone(220, 0, 0.16, 'square', 0.05)
      tone(180, 0.12, 0.22, 'square', 0.05)
      break
    case 'levelup':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle'))
      break
    case 'chest':
      tone(392, 0, 0.1, 'triangle')
      tone(784, 0.08, 0.12, 'triangle')
      tone(1175, 0.16, 0.3, 'sine', 0.1)
      break
    case 'tap':
      tone(880, 0, 0.05, 'sine', 0.05)
      break
    case 'flip':
      tone(520, 0, 0.06, 'sine', 0.05)
      break
  }
}
