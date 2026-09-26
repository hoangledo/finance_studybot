import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Cappy, type Mood } from './Cappy'

export function SpeechBubble({ children, tail = 'left', className }: { children: ReactNode; tail?: 'left' | 'bottom'; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: tail === 'left' ? -6 : 0 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 300 }}
      className={clsx('relative rounded-2xl border-2 border-line bg-surface px-4 py-3 font-bold', className)}
    >
      {children}
      {tail === 'left' ? (
        <span className="absolute top-1/2 -left-[9px] h-4 w-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-surface" />
      ) : (
        <span className="absolute -bottom-[9px] left-8 h-4 w-4 rotate-45 border-r-2 border-b-2 border-line bg-surface" />
      )}
    </motion.div>
  )
}

/** Cappy with a speech bubble to the right. */
export function CappySays({
  mood = 'happy',
  size = 96,
  children,
  className,
}: {
  mood?: Mood
  size?: number
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex items-center gap-4', className)}>
      <Cappy mood={mood} size={size} className="shrink-0" />
      <SpeechBubble className="min-w-0">{children}</SpeechBubble>
    </div>
  )
}
