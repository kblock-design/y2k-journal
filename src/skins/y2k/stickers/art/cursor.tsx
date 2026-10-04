import { DieCut } from '../parts'
import { keys, pixelPath, type ArtProps } from '../svg'

/* Old-school arrow pointer on an 11 x 17 pixel grid; each pixel = 5 units. */
const U = 5
const OX = 8
const OY = 6.5

type Pt = readonly [number, number]

/** Union of every pixel (dark border + fill). */
const BORDER: readonly Pt[] = [
  [0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [5, 5], [6, 5],
  [6, 6], [7, 6], [7, 7], [8, 7], [8, 8], [9, 8], [9, 9], [10, 9], [10, 10], [11, 10], [11, 11],
  [7, 11], [7, 12], [8, 12], [8, 14], [9, 14], [9, 16], [8, 16], [8, 17], [6, 17], [6, 16],
  [5, 16], [5, 14], [4, 14], [4, 12], [3, 12], [3, 13], [2, 13], [2, 14], [1, 14], [1, 15], [0, 15],
]

/** The light interior pixels. */
const FILL: readonly Pt[] = [
  [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [5, 5], [5, 6], [6, 6], [6, 7], [7, 7],
  [7, 8], [8, 8], [8, 9], [9, 9], [9, 10], [6, 10], [6, 12], [7, 12], [7, 14], [8, 14], [8, 16],
  [6, 16], [6, 14], [5, 14], [5, 12], [4, 12], [4, 11], [3, 11], [3, 12], [2, 12], [2, 13], [1, 13],
]

const BORDER_D = pixelPath(BORDER, OX, OY, U)
const FILL_D = pixelPath(FILL, OX, OY, U)

/** Pixel-stepped pink mouse pointer with a dithered fill. */
export function Cursor({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('fill')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffe6f3" />
          <stop offset="0.5" stopColor="#ffa6d4" />
          <stop offset="1" stopColor="#ff6fb7" />
        </linearGradient>
        <pattern id={k.id('dither')} patternUnits="userSpaceOnUse" x={OX} y={OY} width={U} height={U}>
          <rect width={U / 2} height={U / 2} fill="#fff" />
          <rect x={U / 2} y={U / 2} width={U / 2} height={U / 2} fill="#fff" />
        </pattern>
      </defs>
      <DieCut>
        <path d={BORDER_D} />
      </DieCut>
      <path d={BORDER_D} fill="#6e1248" />
      <path d={FILL_D} fill={k.url('fill')} />
      <path d={FILL_D} fill={k.url('dither')} fillOpacity={0.3} />
      {/* pixel highlights */}
      <g fill="#fff">
        <rect x={OX + U} y={OY + 2 * U} width={U} height={6 * U} fillOpacity={0.6} />
        <rect x={OX + 2 * U} y={OY + 3 * U} width={U} height={U} fillOpacity={0.45} />
      </g>
    </>
  )
}

Cursor.viewBox = [0, 0, 72, 100] as const
