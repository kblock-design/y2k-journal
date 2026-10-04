import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { arcPath, capDegrees, DISC, discBoxes, polar, segmentShape, wedgePath } from './ring'
import type { DiscGeometry, DiscSegment } from './ring'

// The Home hero: the cycle as a CD. A silver plate with an iridescent light-catch (CSS, under
// the SVG), fine grooves, phase arcs on the "data" band (solid for days so far, tint for days
// ahead), a chrome hub holding an LCD readout (children) and a hot-pink gel bead on today.
// Drawn in a 320×320 box. Decorative: the words around it carry the meaning.

const C = DISC.c
const CAP_DEG = capDegrees(DISC.stroke, DISC.r)
const BOXES = discBoxes()

/** A gradient stop coloured by a colourway token (gloss.css), so the disc re-tints with it. */
const stop = (token: string): CSSProperties => ({ stopColor: `var(${token})` })

function Segment({ seg, only, variant }: { seg: DiscSegment; only: boolean; variant: 'solid' | 'tint' }) {
  const shape = segmentShape(seg, { capDeg: CAP_DEG, gapDeg: DISC.gapDeg, ringRadius: DISC.r, strokeWidth: DISC.stroke, only })
  const cls = `gl-arc gl-arc--${variant} gl-arc--${seg.phase ?? 'unknown'}`
  if (shape.kind === 'dot') {
    const [x, y] = polar(C, C, DISC.r, shape.angle)
    return <circle className={`${cls} gl-arc--dot`} cx={x} cy={y} r={shape.radius} />
  }
  const d = shape.kind === 'full' ? arcPath(C, C, DISC.r, 0, 360) : arcPath(C, C, DISC.r, shape.start, shape.end)
  return <path className={cls} d={d} fill="none" strokeWidth={DISC.stroke} strokeLinecap="round" />
}

export function CycleDisc({
  geo,
  showToday = true,
  children,
}: {
  geo: DiscGeometry
  showToday?: boolean
  /** Centred in the hub (the LCD readout). */
  children?: ReactNode
}) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clipId = `gl-disc-clip-${raw}`
  const hubId = `gl-disc-hub-${raw}`
  const rimId = `gl-disc-rim-${raw}`
  const beadId = `gl-disc-bead-${raw}`
  const only = geo.segments.length === 1
  const [mx, my] = polar(C, C, DISC.r, geo.markerAngle)

  return (
    <div className={`gl-disc${showToday ? '' : ' gl-disc--preview'}`}>
      <div className="gl-disc__plate" style={BOXES.plate} aria-hidden="true" />
      <svg className="gl-disc__svg" viewBox={`0 0 ${DISC.size} ${DISC.size}`} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={hubId} cx="0.42" cy="0.32" r="0.75">
            <stop offset="0" style={stop('--hub-1')} />
            <stop offset="0.7" style={stop('--hub-2')} />
            <stop offset="1" style={stop('--hub-3')} />
          </radialGradient>
          <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('--rim-1')} />
            <stop offset="0.45" style={stop('--rim-2')} />
            <stop offset="0.52" style={stop('--rim-3')} />
            <stop offset="0.75" style={stop('--rim-4')} />
            <stop offset="1" style={stop('--rim-1')} />
          </linearGradient>
          <radialGradient id={beadId} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" style={stop('--hot-light')} />
            <stop offset="0.55" style={stop('--hot')} />
            <stop offset="1" style={stop('--hot-dark')} />
          </radialGradient>
          {showToday && (
            <clipPath id={clipId}>
              <path d={wedgePath(C, C, C, 0, geo.markerAngle)} />
            </clipPath>
          )}
        </defs>

        {/* Grooves: fine light rings, like the data side of a disc. */}
        <g className="gl-disc__grooves" fill="none">
          <circle cx={C} cy={C} r={150} />
          <circle cx={C} cy={C} r={143} />
          <circle cx={C} cy={C} r={104} />
          <circle cx={C} cy={C} r={98} />
        </g>

        {/* Recessed band the arcs sit in. */}
        <circle className="gl-disc__band" cx={C} cy={C} r={DISC.r} fill="none" strokeWidth={DISC.stroke + 6} />

        <g>
          {geo.segments.map((s) => (
            <Segment key={s.startDay} seg={s} only={only} variant="tint" />
          ))}
        </g>
        {showToday && (
          <g clipPath={`url(#${clipId})`}>
            {geo.segments.map((s) => (
              <Segment key={s.startDay} seg={s} only={only} variant="solid" />
            ))}
          </g>
        )}

        {/* Chrome hub. */}
        <circle cx={C} cy={C} r={DISC.hub + 3} fill="none" stroke={`url(#${rimId})`} strokeWidth={3} />
        <circle cx={C} cy={C} r={DISC.hub} fill={`url(#${hubId})`} />
        <circle cx={C} cy={C} r={DISC.hub - 1} fill="none" style={{ stroke: 'var(--hub-ring)' }} strokeWidth={1.2} opacity={0.9} />

        {showToday && (
          <g className="gl-disc__bead">
            <circle cx={mx} cy={my + 1.5} r={DISC.bead + 5} style={{ fill: 'rgba(var(--shade-rgb), 0.14)' }} />
            <circle cx={mx} cy={my} r={DISC.bead + 4.5} style={{ fill: 'var(--bead-halo)' }} />
            <circle cx={mx} cy={my} r={DISC.bead} fill={`url(#${beadId})`} />
            <ellipse cx={mx} cy={my - 5} rx={6.5} ry={3.6} fill="#ffffff" opacity={0.75} />
          </g>
        )}
      </svg>
      {children && (
        <div className="gl-disc__hub" style={BOXES.hub}>
          {children}
        </div>
      )}
    </div>
  )
}
