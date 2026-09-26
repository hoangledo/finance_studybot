import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

export type Mood = 'idle' | 'happy' | 'cheer' | 'think' | 'oops' | 'sleepy' | 'wave'

const FUR = '#b98a5e'
const FUR_DARK = '#8f6440'
const FUR_LIGHT = '#dcb68d'
const SNOUT = '#a2774f'
const EAR_IN = '#6e4a2c'
const INK = '#3a2615'

/**
 * Cappy the capybara — FinQuest's mascot. Hand-drawn SVG with a yuzu on its head,
 * a breathing idle loop, random blinks, and a pose per mood.
 */
export function Cappy({ mood = 'idle', size = 120, className }: { mood?: Mood; size?: number; className?: string }) {
  const reduce = useReducedMotion()
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (reduce || mood === 'sleepy' || mood === 'cheer') return
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 140)
        loop()
      }, 2400 + Math.random() * 2600)
    }
    loop()
    return () => clearTimeout(t)
  }, [mood, reduce])

  const bodyAnim = reduce
    ? {}
    : mood === 'cheer'
      ? { y: [0, -12, 0, -8, 0], transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.6 } }
      : mood === 'oops'
        ? { rotate: [0, -4, 3, -2, 0], transition: { duration: 0.6 } }
        : { y: [0, -2.5, 0], transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const } }

  return (
    <div className={clsx('relative inline-block select-none', className)} style={{ width: size, height: size }} aria-hidden>
      <motion.svg viewBox="0 0 120 124" width={size} height={size} animate={bodyAnim} style={{ overflow: 'visible', originX: '50%', originY: '90%' }}>
        {/* shadow */}
        <ellipse cx="60" cy="120" rx="34" ry="4" fill="rgba(0,0,0,0.12)" />

        {/* feet */}
        <ellipse cx="44" cy="115" rx="9" ry="5.5" fill={FUR_DARK} />
        <ellipse cx="76" cy="115" rx="9" ry="5.5" fill={FUR_DARK} />

        {/* body */}
        <path d="M22 96 C22 76 38 66 60 66 C82 66 98 76 98 96 C98 110 84 117 60 117 C36 117 22 110 22 96 Z" fill={FUR} />
        <ellipse cx="60" cy="99" rx="23" ry="15" fill={FUR_LIGHT} opacity="0.7" />

        {/* arms */}
        <Arms mood={mood} reduce={!!reduce} />

        {/* coin held in front (hidden while cheering — it's tossed up) */}
        {mood !== 'cheer' && (
          <g>
            <circle cx="60" cy="104" r="9.5" fill="#ffc93c" stroke="#e3a514" strokeWidth="2.2" />
            <text x="60" y="108.2" textAnchor="middle" fontSize="11" fontWeight="900" fill="#a86f00" fontFamily="Nunito, sans-serif">
              $
            </text>
          </g>
        )}

        {/* head */}
        <g transform={mood === 'oops' ? 'rotate(-6 60 50)' : mood === 'think' ? 'rotate(4 60 50)' : undefined}>
          {/* ears */}
          <ellipse cx="27" cy="25" rx="9" ry="8" fill={FUR_DARK} />
          <ellipse cx="93" cy="25" rx="9" ry="8" fill={FUR_DARK} />
          <ellipse cx="27" cy="25.5" rx="4.6" ry="4" fill={EAR_IN} />
          <ellipse cx="93" cy="25.5" rx="4.6" ry="4" fill={EAR_IN} />
          {/* head shape — capybaras are wonderfully boxy */}
          <rect x="20" y="22" width="80" height="60" rx="28" fill={FUR} />
          <rect x="20" y="22" width="80" height="22" rx="11" fill={FUR} />
          {/* snout */}
          <rect x="36" y="52" width="48" height="28" rx="14" fill={SNOUT} />
          <ellipse cx="52" cy="60" rx="3" ry="2.2" fill={INK} />
          <ellipse cx="68" cy="60" rx="3" ry="2.2" fill={INK} />
          {/* blush */}
          <ellipse cx="30" cy="58" rx="6" ry="3.6" fill="#ff8fa3" opacity="0.55" />
          <ellipse cx="90" cy="58" rx="6" ry="3.6" fill="#ff8fa3" opacity="0.55" />
          <Eyes mood={mood} blink={blink} />
          <Mouth mood={mood} />
          {/* the famous yuzu */}
          <g>
            <circle cx="60" cy="18" r="8.5" fill="#ffae2b" stroke="#e8901a" strokeWidth="1.6" />
            <circle cx="57" cy="15.5" r="2" fill="#ffd27a" />
            <path d="M60 10 C62 5 67 4 70 6 C67 9 64 10 60 10 Z" fill="#2fbf71" />
          </g>
        </g>
      </motion.svg>

      <Extras mood={mood} reduce={!!reduce} size={size} />
    </div>
  )
}

function Eyes({ mood, blink }: { mood: Mood; blink: boolean }) {
  if (mood === 'cheer' || mood === 'happy')
    return (
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M37 44 Q43 37 49 44" />
        <path d="M71 44 Q77 37 83 44" />
      </g>
    )
  if (mood === 'sleepy' || blink)
    return (
      <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M37 43 Q43 47 49 43" />
        <path d="M71 43 Q77 47 83 43" />
      </g>
    )
  if (mood === 'oops')
    return (
      <g>
        <circle cx="43" cy="42" r="6" fill="#fff" />
        <circle cx="77" cy="42" r="6" fill="#fff" />
        <circle cx="43" cy="43" r="3" fill={INK} />
        <circle cx="77" cy="43" r="3" fill={INK} />
      </g>
    )
  const dy = mood === 'think' ? -3 : 0
  const dx = mood === 'think' ? 2 : 0
  return (
    <g>
      <ellipse cx={43 + dx} cy={42 + dy} rx="4.6" ry="5.4" fill={INK} />
      <ellipse cx={77 + dx} cy={42 + dy} rx="4.6" ry="5.4" fill={INK} />
      <circle cx={44.6 + dx} cy={40 + dy} r="1.6" fill="#fff" />
      <circle cx={78.6 + dx} cy={40 + dy} r="1.6" fill="#fff" />
    </g>
  )
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'cheer')
    return (
      <g>
        <path d="M52 68 Q60 80 68 68 Z" fill="#6b2f22" />
        <path d="M55 72 Q60 76 65 72" fill="#ff8fa3" />
      </g>
    )
  if (mood === 'oops') return <path d="M52 71 Q56 68 60 71 Q64 74 68 71" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  if (mood === 'sleepy') return <ellipse cx="60" cy="71" rx="2.6" ry="2.2" fill={INK} />
  if (mood === 'think') return <path d="M54 71 L66 70" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
  return <path d="M53 69 Q56.5 73 60 69 Q63.5 73 67 69" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
}

function Arms({ mood, reduce }: { mood: Mood; reduce: boolean }) {
  if (mood === 'cheer')
    return (
      <g fill={FUR_DARK}>
        <ellipse cx="20" cy="70" rx="7" ry="11" transform="rotate(-35 20 70)" />
        <ellipse cx="100" cy="70" rx="7" ry="11" transform="rotate(35 100 70)" />
      </g>
    )
  if (mood === 'wave')
    return (
      <g fill={FUR_DARK}>
        <ellipse cx="45" cy="100" rx="7" ry="6" />
        <motion.g
          style={{ transformBox: 'view-box', transformOrigin: '94px 84px' }}
          animate={reduce ? {} : { rotate: [0, -18, 8, -18, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.8 }}
        >
          <ellipse cx="102" cy="68" rx="7" ry="12" transform="rotate(28 102 68)" />
        </motion.g>
      </g>
    )
  if (mood === 'think')
    return (
      <g fill={FUR_DARK}>
        <ellipse cx="45" cy="100" rx="7" ry="6" />
        <ellipse cx="74" cy="84" rx="6.5" ry="6" />
      </g>
    )
  return (
    <g fill={FUR_DARK}>
      <ellipse cx="47" cy="102" rx="7" ry="6" />
      <ellipse cx="73" cy="102" rx="7" ry="6" />
    </g>
  )
}

function Extras({ mood, reduce, size }: { mood: Mood; reduce: boolean; size: number }) {
  const s = size / 120
  return (
    <AnimatePresence>
      {mood === 'think' && (
        <motion.span
          key="q"
          className="absolute font-display font-bold text-sky-ink"
          style={{ right: -4 * s, top: -6 * s, fontSize: 26 * s }}
          initial={{ opacity: 0, y: 6 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: [0, -4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          exit={{ opacity: 0 }}
        >
          ?
        </motion.span>
      )}
      {mood === 'sleepy' && (
        <motion.span
          key="z"
          className="absolute font-display font-bold text-sky-ink"
          style={{ right: -2 * s, top: -4 * s, fontSize: 18 * s }}
          animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0], y: [4, -10], x: [0, 6] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          z<span style={{ fontSize: 13 * s }}>z</span>
        </motion.span>
      )}
      {mood === 'oops' && (
        <motion.svg
          key="drop"
          viewBox="0 0 10 14"
          className="absolute"
          style={{ right: 14 * s, top: 18 * s, width: 12 * s, height: 16 * s }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <path d="M5 0 C8 5 10 8 10 10 A5 5 0 0 1 0 10 C0 8 2 5 5 0 Z" fill="#7cc8ff" />
        </motion.svg>
      )}
      {mood === 'cheer' && (
        <>
          <motion.svg
            key="coin"
            viewBox="0 0 20 20"
            className="absolute"
            style={{ left: '50%', top: -18 * s, width: 20 * s, height: 20 * s, marginLeft: -10 * s }}
            animate={reduce ? {} : { y: [0, -14, 0], rotateY: [0, 360] }}
            transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.6 }}
          >
            <circle cx="10" cy="10" r="8.5" fill="#ffc93c" stroke="#e3a514" strokeWidth="2" />
          </motion.svg>
          {[-1, 1].map((d) => (
            <motion.span
              key={d}
              className="absolute text-gold"
              style={{ top: 10 * s, [d < 0 ? 'left' : 'right']: -8 * s, fontSize: 16 * s } as React.CSSProperties}
              animate={reduce ? {} : { scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: d > 0 ? 0.5 : 0 }}
            >
              ✦
            </motion.span>
          ))}
        </>
      )}
    </AnimatePresence>
  )
}
