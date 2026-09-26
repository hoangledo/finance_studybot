import { create } from 'zustand'

export type ThemePref = 'system' | 'light' | 'dark'

function read(): ThemePref {
  try {
    return (localStorage.getItem('finquest.theme') as ThemePref) || 'system'
  } catch {
    return 'system'
  }
}

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export const useTheme = create<{ pref: ThemePref; set: (p: ThemePref) => void }>((set) => ({
  pref: read(),
  set: (pref) => {
    try {
      localStorage.setItem('finquest.theme', pref)
    } catch {
      /* ignore */
    }
    apply(pref)
    set({ pref })
  },
}))

export function initTheme() {
  apply(read())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply(useTheme.getState().pref))
}
