import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import clsx from 'clsx'
import { Cappy, type Mood } from './mascot/Cappy'
import { useKeyboardInset, usePhone } from '../lib/device'

export function Md({ children, className }: { children: string; className?: string }) {
  return (
    <div className={clsx('prose-fin', className)}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Dialog that becomes a bottom sheet on phones: drag the handle down to close, sits above the
 * on-screen keyboard, and respects the home-bar safe area. Centered card on larger screens.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const phone = usePhone()
  const keyboard = useKeyboardInset()
  const drag = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          style={phone ? { paddingBottom: keyboard } : undefined}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={clsx(
              'card flex w-full flex-col overflow-hidden shadow-2xl',
              phone ? 'rounded-b-none border-b-0' : 'max-h-[88dvh] rounded-3xl',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
            )}
            style={phone ? { maxHeight: `calc(100dvh - ${keyboard}px - env(safe-area-inset-top, 0px) - 16px)` } : undefined}
            initial={phone ? { y: '100%' } : { y: 30, opacity: 0 }}
            animate={phone ? { y: 0 } : { y: 0, opacity: 1 }}
            exit={phone ? { y: '100%' } : { y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            drag={phone ? 'y' : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            {/* Header doubles as the drag handle on phones */}
            <div className="shrink-0 touch-none px-5 pt-2 sm:pt-5" onPointerDown={(e) => phone && drag.start(e)}>
              {phone && <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" aria-hidden />}
              <div className="flex items-center justify-between gap-3 pb-3">
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <button className="-mr-2 grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-surface-2" onClick={onClose} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),20px)]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Ring({
  value,
  size = 44,
  stroke = 5,
  color = 'var(--brand)',
  children,
}: {
  value: number // 0..1
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Bar({ value, color = 'var(--brand)', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={clsx('h-3 overflow-hidden rounded-full bg-surface-2', className)}>
      <motion.div
        className="shine h-full min-w-0 rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ type: 'spring', damping: 22 }}
      />
    </div>
  )
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
      <div className="min-w-0 flex-1">
        {/* On phones the sticky header already shows the page name */}
        <h1 className="font-display text-3xl font-bold max-md:sr-only sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted md:mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Empty({ mood = 'happy', title, body, action }: { mood?: Mood; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <Cappy mood={mood} size={120} />
      <h3 className="mt-3 font-display text-xl font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
      style={{ background: color ? `${color}22` : 'var(--surface-2)', color: color ?? 'var(--muted)' }}
    >
      {children}
    </span>
  )
}
