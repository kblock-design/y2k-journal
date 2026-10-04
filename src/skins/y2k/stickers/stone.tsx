import { DieCut } from './parts'
import type { Ramp, StoneShape } from './cuts'
import { keys, phase } from './svg'

/**
 * One cut stone as a die-cut sticker: facets with fine bright edges, a glassy table with
 * the pavilion's reflection showing through, a dark girdle line, an optional static spark
 * and a twinkling glint (animated by stickers.css for every `sticker--gem*`).
 */
export function Stone({
  id,
  shape,
  ramp,
  tableColors,
  edge,
  glint,
  spark,
  fire,
}: {
  id: string
  shape: StoneShape
  ramp: Ramp
  /** Table gradient, light top-left to deep bottom-right. */
  tableColors: readonly [string, string, string]
  /** Girdle line colour. */
  edge: string
  /** Path of the twinkling glint. */
  glint: string
  /** Path of a small static spark. */
  spark?: string
  /** Rainbow "fire" tints laid over every fifth facet (diamonds, aurora stones). */
  fire?: readonly string[]
}) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('table')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tableColors[0]} />
          <stop offset="0.55" stopColor={tableColors[1]} />
          <stop offset="1" stopColor={tableColors[2]} />
        </linearGradient>
      </defs>
      <DieCut>
        <polygon points={shape.outline} />
      </DieCut>
      <polygon points={shape.outline} fill={ramp[2]} />
      <g stroke="#fff" strokeOpacity={0.35} strokeWidth={0.6} strokeLinejoin="round">
        {shape.facets.map((f, i) => (
          <polygon key={i} points={f.pts} fill={f.fill} />
        ))}
      </g>
      {fire && (
        <g fillOpacity={0.45}>
          {shape.facets.map((f, i) =>
            i % 5 === 2 ? <polygon key={i} points={f.pts} fill={fire[Math.floor(i / 5) % fire.length]} /> : null,
          )}
        </g>
      )}
      <polygon points={shape.table} fill={k.url('table')} />
      {shape.reflections.map((p, i) => (
        <polygon key={i} points={p} fill={i % 2 ? '#fff' : ramp[3]} fillOpacity={i % 2 ? 0.22 : 0.18} />
      ))}
      <polygon points={shape.table} fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={0.9} strokeLinejoin="round" />
      <polygon points={shape.outline} fill="none" stroke={edge} strokeOpacity={0.55} strokeWidth={1.2} strokeLinejoin="round" />
      {spark && <path d={spark} fill="#fff" fillOpacity={0.9} />}
      <g className="sticker__twinkle" style={{ animationDelay: phase(id, 3.2) }}>
        <path d={glint} fill="#fff" />
      </g>
    </>
  )
}
