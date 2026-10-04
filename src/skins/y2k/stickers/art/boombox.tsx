import { DieCut, GlitterPattern } from '../parts'
import { keys, type ArtProps } from '../svg'

const HANDLE =
  'M24 36 V24 Q24 17 31 17 H69 Q76 17 76 24 V36 H69 V26.5 Q69 24.5 67 24.5 H33 Q31 24.5 31 26.5 V36 Z'
/* Speakers at (27,63) and (73,63), radius 13; tape deck between them. */
const SPEAKERS = [27, 73] as const
const BUTTONS = [36, 42, 48, 54, 60] as const

/** Pink glitter boombox with chrome-lilac speakers. */
export function Boombox({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc4e3" />
          <stop offset="0.5" stopColor="#ff7ac0" />
          <stop offset="1" stopColor="#e94f9f" />
        </linearGradient>
        <radialGradient id={k.id('cone')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d6c2ff" />
          <stop offset="1" stopColor="#8a6fd8" />
        </radialGradient>
        <linearGradient id={k.id('handle')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9bcd3" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffe0f1', '#b3005e', '#ffffff']} size={6} />
      </defs>
      <DieCut>
        <path d={HANDLE} />
        <rect x="8" y="34" width="84" height="48" rx="9" />
      </DieCut>

      <path d={HANDLE} fill={k.url('handle')} stroke="#6f7396" strokeWidth={1} strokeLinejoin="round" />

      {/* body */}
      <rect x="8" y="34" width="84" height="48" rx="9" fill={k.url('body')} />
      <rect x="8" y="34" width="84" height="48" rx="9" fill={k.url('glitter')} />
      <rect x="8" y="34" width="84" height="48" rx="9" fill="none" stroke="#a3004f" strokeWidth={1.2} />
      <rect x="10.5" y="46" width="1.8" height="28" rx="0.9" fill="#fff" fillOpacity={0.55} />

      {/* top panel + buttons */}
      <rect x="14" y="38" width="72" height="8" rx="2" fill="#e4d4ff" stroke="#8a6fd8" strokeWidth={0.8} />
      <g fill="#fff" stroke="#8a6fd8" strokeWidth={0.5}>
        {BUTTONS.map((x) => (
          <rect key={x} x={x} y="40" width="4.5" height="4" rx="0.8" />
        ))}
      </g>
      <rect x="54" y="40" width="4.5" height="4" rx="0.8" fill="#ff4fa3" />
      <circle cx="20" cy="42" r="1.6" fill="#7ff0d6" stroke="#3fae84" strokeWidth={0.5} />

      {/* speakers */}
      {SPEAKERS.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="63" r="13" fill="#3b1235" />
          <circle cx={cx} cy="63" r="10.5" fill={k.url('cone')} />
          <g fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.8}>
            <circle cx={cx} cy="63" r="8" />
            <circle cx={cx} cy="63" r="5.5" />
          </g>
          <circle cx={cx} cy="63" r="3" fill="#ff4fa3" stroke="#a3004f" strokeWidth={0.6} />
          <circle cx={cx - 1} cy="62" r="0.9" fill="#fff" />
        </g>
      ))}

      {/* tape deck */}
      <rect x="42" y="51" width="16" height="22" rx="2" fill="#3b1235" />
      <rect x="44" y="55" width="12" height="8" rx="1" fill="#ffe6f3" />
      <g fill="#7a3557">
        <circle cx="47" cy="59" r="1.8" />
        <circle cx="53" cy="59" r="1.8" />
      </g>
      <rect x="44" y="67" width="12" height="2" rx="1" fill="#7ff0d6" />
    </>
  )
}

Boombox.viewBox = [0, 10, 100, 82] as const
