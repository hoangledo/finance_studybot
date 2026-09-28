import { useEffect, useState } from 'react'

/** Subscribe to a CSS media query. */
export function useMediaQuery(query: string) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/** Phone-width layout (below Tailwind's `sm` breakpoint). */
export const usePhone = () => useMediaQuery('(max-width: 639px)')

/** A touch-first device (no hover, coarse pointer) — hide keyboard hints, show touch controls. */
export const useTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)')

/**
 * Height of the on-screen keyboard (iOS/Android), from the Visual Viewport API.
 * Fixed-position sheets add this to their bottom offset so inputs stay visible.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}
