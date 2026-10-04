import { DieCut, GlitterPattern } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

/* Zigzag bolt: top edge 50..80 at y 8, shelves at y 40 and y 56, tip at (34,98). */
const BOLT = 'M50 8 L80 8 L62 40 L80 40 L34 98 L46 56 L26 56 Z'
/** The same outline pulled 22% towards (52,46), as a raised bevel. */
const BEVEL = 'M50.44 16.36 L73.84 16.36 L59.8 41.32 L73.84 41.32 L37.96 86.56 L47.32 53.8 L31.72 53.8 Z'
const POP = 'translate(3.5 3)'
const GLINT = sparklePath(61, 22, 6)

/** Electric-yellow glitter lightning bolt with a hot-pink pop shadow. */
export function Bolt({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('fill')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fff59e" />
          <stop offset="0.45" stopColor="#ffe03a" />
          <stop offset="1" stopColor="#ffb21e" />
        </linearGradient>
        <GlitterPattern id={k.id('glitter')} colors={['#fffbe0', '#d98a00', '#ffffff']} />
      </defs>
      <DieCut>
        <path d={BOLT} />
        <path d={BOLT} transform={POP} />
      </DieCut>

      <path d={BOLT} transform={POP} fill="#ff4fa8" stroke="#c2187a" strokeWidth={1.2} strokeLinejoin="round" />
      <path d={BOLT} fill={k.url('fill')} />
      <path d={BOLT} fill={k.url('glitter')} />
      <path d={BEVEL} fill="#fff" fillOpacity={0.3} />
      <path d={BOLT} fill="none" stroke="#d07a00" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M52 11.5 L76 11.5" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M48.5 14 L31 52" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
      <path d={GLINT} fill="#fff" />
    </>
  )
}

Bolt.viewBox = [14, 0, 80, 110] as const
