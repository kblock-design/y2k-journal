import { useId } from 'react'
import { arcPath, polar, segmentShape, wedgePath } from './ring'
import type { RingGeometry, RingSegment } from './ring'

// The Home hero ring, drawn in a 320×320 box. Every phase is a rounded pastel arc; the part
// of the cycle still ahead is the lighter tint, the part so far is solid, and a black knob
// marks today. Purely decorative: the numbers and words around it carry the meaning.

const C = 160
const R = 126
const STROKE = 32
const GAP_DEG = 4
const CAP_DEG = ((STROKE / 2 / R) * 180) / Math.PI

function Segment({ seg, only, variant }: { seg: RingSegment; only: boolean; variant: 'solid' | 'tint' }) {
  const shape = segmentShape(seg, { capDeg: CAP_DEG, gapDeg: GAP_DEG, ringRadius: R, strokeWidth: STROKE, only })
  const cls = `ph-arc ph-arc--${variant} ph-arc--${seg.phase ?? 'unknown'}`
  if (shape.kind === 'dot') {
    const [x, y] = polar(C, C, R, shape.angle)
    return <circle className={`${cls} ph-arc--dot`} cx={x} cy={y} r={shape.radius} />
  }
  const d = shape.kind === 'full' ? arcPath(C, C, R, 0, 360) : arcPath(C, C, R, shape.start, shape.end)
  return <path className={cls} d={d} fill="none" strokeWidth={STROKE} strokeLinecap="round" />
}

export function CycleRing({ geo, showToday = true }: { geo: RingGeometry; showToday?: boolean }) {
  const clipId = `ph-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const only = geo.segments.length === 1
  const [mx, my] = polar(C, C, R, geo.markerAngle)
  return (
    <svg className="ph-ring__svg" viewBox="0 0 320 320" aria-hidden="true" focusable="false">
      {showToday && (
        <defs>
          <clipPath id={clipId}>
            <path d={wedgePath(C, C, C, 0, geo.markerAngle)} />
          </clipPath>
        </defs>
      )}
      <g>
        {geo.segments.map((s) => (
          <Segment key={s.startDay} seg={s} only={only} variant="tint" />
        ))}
      </g>
      {showToday && (
        <>
          <g clipPath={`url(#${clipId})`}>
            {geo.segments.map((s) => (
              <Segment key={s.startDay} seg={s} only={only} variant="solid" />
            ))}
          </g>
          <g className="ph-ring__marker">
            <circle cx={mx} cy={my} r={STROKE / 2 + 5} className="ph-ring__knob-halo" />
            <circle cx={mx} cy={my} r={STROKE / 2 - 3} className="ph-ring__knob" />
            <circle cx={mx} cy={my} r={4.5} className="ph-ring__knob-dot" />
          </g>
        </>
      )}
    </svg>
  )
}
