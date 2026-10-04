// The skin's chunky organic shapes (spiky star, four-lobed clover, heart, plus), drawn as
// original paths in a 100×100 box. They hold labels and numbers (text is laid over them in
// HTML) or sit in corners as playful accents. Always decorative: aria-hidden.

export type ShapeKind = 'star' | 'clover' | 'heart' | 'plus'
export type Tone = 'pink' | 'blue' | 'yellow' | 'green'

const f1 = (n: number) => Math.round(n * 10) / 10

/** Spiky burst with slightly uneven points so it reads hand-made rather than mechanical. */
function starPath(): string {
  const spikes = 11
  const outer = [46, 42, 45.5, 41, 46, 43, 44.5, 41.5, 46, 42.5, 44]
  const inner = 30
  const pts: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer[i / 2] : inner
    const a = (i * Math.PI) / spikes - Math.PI / 2
    pts.push(`${f1(50 + r * Math.cos(a))} ${f1(50 + r * Math.sin(a))}`)
  }
  return `M${pts.join('L')}Z`
}

/** Four soft lobes: r(θ) = 37 + 9·cos 4θ, rotated 45° so the lobes point to the corners. */
function cloverPath(): string {
  const n = 96
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const r = 37 + 9 * Math.cos(4 * t)
    const a = t + Math.PI / 4
    pts.push(`${f1(50 + r * Math.cos(a))} ${f1(50 + r * Math.sin(a))}`)
  }
  return `M${pts.join('L')}Z`
}

const PATHS: Record<ShapeKind, string> = {
  star: starPath(),
  clover: cloverPath(),
  heart:
    'M50 88C46 85.5 9 64 7.5 36.5 6.8 21 17.5 10.5 31 10.5c8.6 0 15 4.6 19 11.3 4-6.7 10.4-11.3 19-11.3 13.5 0 24.2 10.5 23.5 26C91 64 54 85.5 50 88Z',
  plus: 'M36 9h28v27h27v28H64v27H36V64H9V36h27Z',
}

/** Shapes whose outline gets a same-colour round-joined stroke to soften sharp corners. */
const SOFTENED: Record<ShapeKind, number> = { star: 5, clover: 0, heart: 0, plus: 14 }

export function Shape({
  kind,
  tone,
  rotate = 0,
  className,
}: {
  kind: ShapeKind
  tone: Tone
  rotate?: number
  className?: string
}) {
  const soft = SOFTENED[kind]
  return (
    <svg
      className={`ph-shape-svg ph-tone--${tone}${className ? ` ${className}` : ''}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[kind]}
        transform={rotate ? `rotate(${rotate} 50 50)` : undefined}
        fill="currentColor"
        stroke={soft ? 'currentColor' : undefined}
        strokeWidth={soft || undefined}
        strokeLinejoin={soft ? 'round' : undefined}
      />
    </svg>
  )
}
