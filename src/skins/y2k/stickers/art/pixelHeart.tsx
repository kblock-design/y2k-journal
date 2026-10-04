import { DieCut } from '../parts'
import { keys, type ArtProps } from '../svg'

/*
 * 11 x 10 pixel heart; each pixel = 8 units, offset (7, 8).
 * k outline, w white, l light pink, p hot pink, d deep pink shade, . empty.
 */
const U = 8
const OX = 7
const OY = 8
const ROWS = [
  '..kkk.kkk..',
  '.kwlpkpppk.',
  'kwwlppppppk',
  'kwlppppppdk',
  'klppppppddk',
  '.kpppppddk.',
  '..kpppddk..',
  '...kppdk...',
  '....kdk....',
  '.....k.....',
] as const

const COLORS: Record<string, string> = {
  k: '#6e1248',
  w: '#ffffff',
  l: '#ffa6d6',
  p: '#ff3d9f',
  d: '#c4006a',
}

type Run = { x: number; y: number; w: number; c: string }

/** Horizontal runs of pixels; `same` decides whether two neighbouring pixels join a run. */
function runs(same: (a: string, b: string) => boolean): Run[] {
  const out: Run[] = []
  ROWS.forEach((row, y) => {
    let start = 0
    for (let x = 1; x <= row.length; x++) {
      if (x === row.length || !same(row[x], row[start])) {
        if (row[start] !== '.') out.push({ x: start, y, w: x - start, c: row[start] })
        start = x
      }
    }
  })
  return out
}

/** Whole-shape runs (any filled pixel joins) for the die-cut and the outline base. */
const SHAPE = runs((a, b) => (a === '.') === (b === '.'))
/** Same-colour runs, painted over the outline base. */
const PAINT = runs((a, b) => a === b).filter((r) => r.c !== 'k')

/** Chunky 8-bit heart with a pixel highlight. */
export function PixelHeart({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <pattern id={k.id('dither')} patternUnits="userSpaceOnUse" x={OX} y={OY} width={U / 2} height={U / 2}>
          <rect width={U / 4} height={U / 4} fill="#fff" />
          <rect x={U / 4} y={U / 4} width={U / 4} height={U / 4} fill="#fff" />
        </pattern>
      </defs>
      <DieCut>
        {SHAPE.map((r, i) => (
          <rect key={i} x={OX + r.x * U} y={OY + r.y * U} width={r.w * U} height={U} />
        ))}
      </DieCut>
      <g fill={COLORS.k}>
        {SHAPE.map((r, i) => (
          <rect key={i} x={OX + r.x * U} y={OY + r.y * U} width={r.w * U} height={U} />
        ))}
      </g>
      {PAINT.map((r, i) => (
        <rect key={i} x={OX + r.x * U} y={OY + r.y * U} width={r.w * U} height={U} fill={COLORS[r.c]} />
      ))}
      {/* faint dither on the pink, like an old screen */}
      <g fill={k.url('dither')} fillOpacity={0.14}>
        {PAINT.filter((r) => r.c === 'p').map((r, i) => (
          <rect key={i} x={OX + r.x * U} y={OY + r.y * U} width={r.w * U} height={U} />
        ))}
      </g>
    </>
  )
}

PixelHeart.viewBox = [0, 0, 104, 98] as const
