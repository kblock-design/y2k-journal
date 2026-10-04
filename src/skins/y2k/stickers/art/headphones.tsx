import { DieCut, GlitterPattern } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* Headband: an 8-unit-thick arch from (17..25, 62) over the top to (75..83, 62). */
const BAND =
  'M17 62 C 17 27, 31 10, 50 10 C 69 10, 83 27, 83 62 L75 62 C 75 33, 64 19, 50 19 C 36 19, 25 33, 25 62 Z'
const CUP_L = { x: 11, y: 52, w: 21, h: 33 }
const CUP_R = { x: 68, y: 52, w: 21, h: 33 }
const STAR_L = sparklePath(21.5, 68.5, 6.5)
const STAR_R = sparklePath(78.5, 68.5, 6.5)

/** Chrome-lilac over-ear headphones with glittery pink cups. */
export function Headphones({ id }: ArtProps) {
  const k = keys(id)
  const cup = (c: typeof CUP_L, star: string) => (
    <>
      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="9.5" fill={k.url('cup')} />
      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="9.5" fill={k.url('glitter')} />
      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="9.5" fill="none" stroke="#a3004f" strokeWidth={1.2} />
      <path d={star} fill="#fff" />
      <rect x={c.x + 3} y={c.y + 7} width="2" height="18" rx="1" fill="#fff" fillOpacity={0.5} />
    </>
  )
  return (
    <>
      <defs>
        <linearGradient id={k.id('band')} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="62">
          <stop offset="0" stopColor="#f6f2ff" />
          <stop offset="0.45" stopColor="#c7b5f5" />
          <stop offset="1" stopColor="#8a6fd8" />
        </linearGradient>
        <linearGradient id={k.id('cup')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb3da" />
          <stop offset="0.5" stopColor="#ff4aa3" />
          <stop offset="1" stopColor="#d92f86" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#ffe0f1', '#b3005e', '#ffffff']} size={5} />
      </defs>
      <DieCut>
        <path d={BAND} />
        <rect x={CUP_L.x} y={CUP_L.y} width={CUP_L.w} height={CUP_L.h} rx="9.5" />
        <rect x={CUP_R.x} y={CUP_R.y} width={CUP_R.w} height={CUP_R.h} rx="9.5" />
        <rect x="28" y="56" width="8" height="25" rx="4" />
        <rect x="64" y="56" width="8" height="25" rx="4" />
      </DieCut>

      {/* band */}
      <path d={BAND} fill={k.url('band')} stroke="#6b4fc0" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M23 46 C 24 30, 34 16.5, 48 14.5" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeLinecap="round" />

      {/* ear pads peek out on the inside */}
      <g fill="#e4d4ff" stroke="#8a6fd8" strokeWidth={0.9}>
        <rect x="28" y="56" width="8" height="25" rx="4" />
        <rect x="64" y="56" width="8" height="25" rx="4" />
      </g>

      {cup(CUP_L, STAR_L)}
      {cup(CUP_R, STAR_R)}
    </>
  )
}

Headphones.viewBox = [0, 0, 100, 96] as const
