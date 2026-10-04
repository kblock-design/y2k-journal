import { DieCut, HoloStops } from '../parts'
import { keys, phase, sparklePath, type ArtProps } from '../svg'

const MAIN = sparklePath(50, 50, 40)
const MINI = sparklePath(78, 22, 10)
const CORE = sparklePath(50, 50, 13)

/** Holographic four-point twinkle with a little pink twinkle that pulses. */
export function Sparkle({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('holo')} x1="0" y1="0" x2="1" y2="1">
          <HoloStops />
        </linearGradient>
        <radialGradient id={k.id('core')}>
          <stop offset="0" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#fff" stopOpacity={0.5} />
          <stop offset="0.7" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={k.id('mini')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd6ee" />
          <stop offset="1" stopColor="#ff3d9f" />
        </linearGradient>
      </defs>
      <DieCut>
        <path d={MAIN} />
        <path d={MINI} />
      </DieCut>
      <path d={MAIN} fill={k.url('holo')} />
      <path d={MAIN} fill={k.url('core')} />
      <path d={MAIN} fill="none" stroke="#b46fe0" strokeOpacity={0.5} strokeWidth={1.2} />
      <path d={CORE} fill="#fff" />
      <g className="sticker__twinkle" style={{ animationDelay: phase(id, 2.6) }}>
        <path d={MINI} fill={k.url('mini')} />
        <path d={MINI} fill="none" stroke="#c81f78" strokeOpacity={0.5} strokeWidth={0.8} />
        <circle cx="78" cy="22" r="1.6" fill="#fff" />
      </g>
    </>
  )
}

Sparkle.viewBox = [0, 0, 100, 100] as const
