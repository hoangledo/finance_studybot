import { create } from 'zustand'
import confetti from 'canvas-confetti'
import type { AccessoryId } from '../avatar/parts'

export type ToastKind = 'xp' | 'level' | 'streak' | 'goal' | 'info' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: string
  /** Runs when the toast is tapped (it is dismissed either way). */
  onTap?: () => void
  /** Stay until tapped instead of fading after a few seconds. */
  sticky?: boolean
}

interface FxState {
  toasts: Toast[]
  levelUp: { level: number; unlocks: AccessoryId[] } | null
  streak: number | null
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
  showLevelUp: (level: number, unlocks?: AccessoryId[]) => void
  closeLevelUp: () => void
  showStreak: (n: number) => void
  closeStreak: () => void
}

let nextId = 1

export const useFx = create<FxState>((set, get) => ({
  toasts: [],
  levelUp: null,
  streak: null,
  push: (t) => {
    const id = nextId++
    set({ toasts: [...get().toasts, { ...t, id }] })
    if (!t.sticky) setTimeout(() => get().dismiss(id), t.kind === 'error' ? 6000 : 3200)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  showLevelUp: (level, unlocks = []) => {
    set({ levelUp: { level, unlocks } })
    burst()
  },
  closeLevelUp: () => set({ levelUp: null }),
  showStreak: (n) => set({ streak: n }),
  closeStreak: () => set({ streak: null }),
}))

export function burst(intensity = 1) {
  const colors = ['#1ed39a', '#ffc93c', '#4cb8ff', '#ff7a45', '#9b7bff']
  confetti({ particleCount: Math.round(90 * intensity), spread: 75, origin: { y: 0.65 }, colors })
  setTimeout(
    () => confetti({ particleCount: Math.round(50 * intensity), spread: 110, origin: { y: 0.6 }, colors, scalar: 0.8 }),
    180,
  )
}

export const toast = (t: Omit<Toast, 'id'>) => useFx.getState().push(t)
