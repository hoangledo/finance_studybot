import { useId } from 'react'
import { colorHex, type AccessoryId, type AnimalId, type AvatarConfig } from './parts'

const INK = '#2b2118'

/** Where each animal's eyes sit (accessories like glasses follow them). */
const EYES: Record<AnimalId, [number, number][]> = {
  fox: [[40, 57], [60, 57]],
  cat: [[40, 57], [60, 57]],
  bear: [[40, 56], [60, 56]],
  bunny: [[40, 58], [60, 58]],
  frog: [[36, 44], [64, 44]],
  panda: [[39, 57], [61, 57]],
}

export function Avatar({ config, size = 48, ring = true }: { config: AvatarConfig; size?: number; ring?: boolean }) {
  const clip = useId()
  const bg = colorHex(config.color)
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0" role="img" aria-label={`${config.animal} avatar`}>
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill={bg} />
      <g clipPath={`url(#${clip})`}>
        <circle cx="50" cy="120" r="46" fill="rgba(255,255,255,0.25)" />
        <Animal id={config.animal} />
        <Accessory id={config.accessory} animal={config.animal} />
      </g>
      {ring && <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3" />}
    </svg>
  )
}

function Face({ animal, dark = INK }: { animal: AnimalId; dark?: string }) {
  const [[lx, ly], [rx, ry]] = EYES[animal]
  const mouthY = animal === 'frog' ? 70 : 71
  return (
    <g>
      <ellipse cx={lx} cy={ly} rx="3.6" ry="4.2" fill={dark} />
      <ellipse cx={rx} cy={ry} rx="3.6" ry="4.2" fill={dark} />
      <circle cx={lx + 1.2} cy={ly - 1.5} r="1.3" fill="#fff" />
      <circle cx={rx + 1.2} cy={ry - 1.5} r="1.3" fill="#fff" />
      {animal !== 'frog' && <ellipse cx="50" cy="65" rx="3.4" ry="2.4" fill={animal === 'bunny' ? '#ff8fa3' : INK} />}
      {animal === 'frog' ? (
        <path d="M34 66 Q50 78 66 66" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M44 ${mouthY - 2} Q47 ${mouthY + 2} 50 ${mouthY - 1} Q53 ${mouthY + 2} 56 ${mouthY - 2}`} stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      <ellipse cx="31" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity="0.55" />
      <ellipse cx="69" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity="0.55" />
    </g>
  )
}

function Animal({ id }: { id: AnimalId }) {
  switch (id) {
    case 'fox':
      return (
        <g>
          <path d="M24 46 L28 16 L46 34 Z" fill="#f2702e" />
          <path d="M76 46 L72 16 L54 34 Z" fill="#f2702e" />
          <path d="M29 40 L31 24 L41 34 Z" fill="#ffe3cf" />
          <path d="M71 40 L69 24 L59 34 Z" fill="#ffe3cf" />
          <ellipse cx="50" cy="60" rx="29" ry="27" fill="#ff8a3d" />
          <path d="M21 62 Q34 60 50 74 Q66 60 79 62 Q74 88 50 88 Q26 88 21 62 Z" fill="#fff4ea" />
          <Face animal="fox" />
        </g>
      )
    case 'cat':
      return (
        <g>
          <path d="M23 48 L26 18 L46 34 Z" fill="#9aa3b1" />
          <path d="M77 48 L74 18 L54 34 Z" fill="#9aa3b1" />
          <path d="M28 40 L29 26 L40 34 Z" fill="#ffc2cf" />
          <path d="M72 40 L71 26 L60 34 Z" fill="#ffc2cf" />
          <ellipse cx="50" cy="60" rx="29" ry="27" fill="#b3bac6" />
          <path d="M44 34 L45 42 M50 33 L50 42 M56 34 L55 42" stroke="#8a93a1" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="50" cy="70" rx="12" ry="8" fill="#e9ecf1" />
          <path d="M22 64 L34 66 M22 70 L34 69 M78 64 L66 66 M78 70 L66 69" stroke="#6b7482" strokeWidth="1.4" strokeLinecap="round" />
          <Face animal="cat" />
        </g>
      )
    case 'bear':
      return (
        <g>
          <circle cx="28" cy="36" r="10" fill="#8d5e38" />
          <circle cx="72" cy="36" r="10" fill="#8d5e38" />
          <circle cx="28" cy="36" r="5" fill="#c79467" />
          <circle cx="72" cy="36" r="5" fill="#c79467" />
          <ellipse cx="50" cy="60" rx="29" ry="27" fill="#a8744a" />
          <ellipse cx="50" cy="69" rx="13" ry="10" fill="#e3bf98" />
          <Face animal="bear" />
        </g>
      )
    case 'bunny':
      return (
        <g>
          <ellipse cx="39" cy="22" rx="7" ry="19" fill="#f6f2ee" transform="rotate(-8 39 22)" />
          <ellipse cx="61" cy="22" rx="7" ry="19" fill="#f6f2ee" transform="rotate(8 61 22)" />
          <ellipse cx="39" cy="23" rx="3.4" ry="13" fill="#ffc2cf" transform="rotate(-8 39 23)" />
          <ellipse cx="61" cy="23" rx="3.4" ry="13" fill="#ffc2cf" transform="rotate(8 61 23)" />
          <ellipse cx="50" cy="61" rx="28" ry="26" fill="#fbf8f5" />
          <Face animal="bunny" />
        </g>
      )
    case 'frog':
      return (
        <g>
          <circle cx="36" cy="44" r="11" fill="#5fd068" />
          <circle cx="64" cy="44" r="11" fill="#5fd068" />
          <circle cx="36" cy="44" r="7" fill="#fff" />
          <circle cx="64" cy="44" r="7" fill="#fff" />
          <ellipse cx="50" cy="64" rx="32" ry="24" fill="#5fd068" />
          <circle cx="36" cy="44" r="7" fill="#fff" />
          <circle cx="64" cy="44" r="7" fill="#fff" />
          <ellipse cx="50" cy="74" rx="18" ry="8" fill="#a8ecae" opacity="0.8" />
          <Face animal="frog" />
        </g>
      )
    case 'panda':
      return (
        <g>
          <circle cx="28" cy="36" r="10" fill="#2b2b33" />
          <circle cx="72" cy="36" r="10" fill="#2b2b33" />
          <ellipse cx="50" cy="60" rx="29" ry="27" fill="#fbfbfb" />
          <ellipse cx="38" cy="57" rx="8" ry="10" fill="#2b2b33" transform="rotate(25 38 57)" />
          <ellipse cx="62" cy="57" rx="8" ry="10" fill="#2b2b33" transform="rotate(-25 62 57)" />
          <Face animal="panda" dark="#fff" />
          <circle cx="39" cy="57" r="2.2" fill={INK} />
          <circle cx="61" cy="57" r="2.2" fill={INK} />
        </g>
      )
  }
}

function Accessory({ id, animal }: { id: AccessoryId; animal: AnimalId }) {
  const [[lx, ly], [rx, ry]] = EYES[animal]
  switch (id) {
    case 'none':
      return null
    case 'cap':
      return (
        <g>
          <path d="M25 40 Q27 20 50 19 Q73 20 75 40 Z" fill="#ff5a6e" />
          <path d="M60 38 Q80 36 90 42 Q78 44 60 42 Z" fill="#df3a4f" />
          <circle cx="50" cy="19.5" r="2.4" fill="#df3a4f" />
          <path d="M50 20 L50 40" stroke="#df3a4f" strokeWidth="1.4" />
        </g>
      )
    case 'glasses':
      return (
        <g fill="rgba(255,255,255,0.25)" stroke="#2b2118" strokeWidth="2.4">
          <circle cx={lx} cy={ly} r="7.5" />
          <circle cx={rx} cy={ry} r="7.5" />
          <path d={`M${lx + 7.5} ${ly} Q50 ${ly - 3} ${rx - 7.5} ${ry}`} fill="none" />
        </g>
      )
    case 'sunglasses':
      return (
        <g>
          <rect x={lx - 9} y={ly - 5.5} width="18" height="11" rx="5" fill="#1d1d26" />
          <rect x={rx - 9} y={ry - 5.5} width="18" height="11" rx="5" fill="#1d1d26" />
          <path d={`M${lx + 9} ${ly - 1} L${rx - 9} ${ry - 1}`} stroke="#1d1d26" strokeWidth="2.4" />
          <path d={`M${lx - 5} ${ly - 3} L${lx - 1} ${ly - 3}`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          <path d={`M${rx - 5} ${ry - 3} L${rx - 1} ${ry - 3}`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </g>
      )
    case 'bowtie':
      return (
        <g>
          <path d="M50 90 L38 83 L38 97 Z" fill="#ff5a6e" />
          <path d="M50 90 L62 83 L62 97 Z" fill="#ff5a6e" />
          <circle cx="50" cy="90" r="3.4" fill="#df3a4f" />
        </g>
      )
    case 'beanie':
      return (
        <g>
          <path d="M24 42 Q24 16 50 16 Q76 16 76 42 Z" fill="#9b7bff" />
          <rect x="22" y="36" width="56" height="9" rx="4.5" fill="#7a57eb" />
          <path d="M34 22 L34 36 M42 18 L42 36 M50 17 L50 36 M58 18 L58 36 M66 22 L66 36" stroke="#8a6af5" strokeWidth="2" />
          <circle cx="50" cy="13" r="5.5" fill="#ffc93c" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d="M22 60 Q20 20 50 20 Q80 20 78 60" stroke="#2b3036" strokeWidth="5" fill="none" />
          <rect x="15" y="52" width="12" height="18" rx="5" fill="#4cb8ff" stroke="#2b3036" strokeWidth="2" />
          <rect x="73" y="52" width="12" height="18" rx="5" fill="#4cb8ff" stroke="#2b3036" strokeWidth="2" />
        </g>
      )
    case 'gradcap':
      return (
        <g>
          <path d="M32 30 L32 38 Q50 44 68 38 L68 30 Z" fill="#1d1d26" />
          <path d="M50 16 L84 28 L50 38 L16 28 Z" fill="#2b2b36" />
          <circle cx="50" cy="27" r="2" fill="#ffc93c" />
          <path d="M50 27 L76 31 L76 44" stroke="#ffc93c" strokeWidth="1.8" fill="none" />
          <circle cx="76" cy="46" r="2.6" fill="#ffc93c" />
        </g>
      )
    case 'tophat':
      return (
        <g>
          <rect x="34" y="6" width="32" height="28" rx="3" fill="#1d1d26" />
          <rect x="34" y="26" width="32" height="6" fill="#ff7a45" />
          <ellipse cx="50" cy="35" rx="26" ry="5" fill="#1d1d26" />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M30 36 L30 18 L40 27 L50 13 L60 27 L70 18 L70 36 Z" fill="#ffc93c" stroke="#e3a514" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="50" cy="29" r="3" fill="#ff5a6e" />
          <circle cx="38" cy="31" r="2" fill="#4cb8ff" />
          <circle cx="62" cy="31" r="2" fill="#1ed39a" />
        </g>
      )
    case 'party':
      return (
        <g>
          <path d="M50 4 L64 36 L36 36 Z" fill="#ff8fc7" />
          <path d="M45 16 L57 21 M41 26 L60 30" stroke="#ffc93c" strokeWidth="3" />
          <circle cx="50" cy="5" r="4" fill="#4cb8ff" />
        </g>
      )
    case 'star':
      return (
        <path
          d="M72 26 L75 33 L83 34 L77 39 L79 47 L72 43 L65 47 L67 39 L61 34 L69 33 Z"
          fill="#ffc93c"
          stroke="#e3a514"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )
    case 'halo':
      return <ellipse cx="50" cy="16" rx="18" ry="5" fill="none" stroke="#ffd466" strokeWidth="4" />
  }
}
