// Geometry for the Home "disc": the cycle drawn as phase arcs around a CD-like plate, with a
// bead on today. Pure (no React, no DOM) so it can be unit-tested.
//
// Angles are degrees clockwise from 12 o'clock. Day d (1-based) owns the slice
// [(d − 1)·k, d·k) where k = 360 / totalDays, so day 1 starts at the top.

import { phaseForCycleDay, phaseOn } from '../../logic/cycle'
import type { Phase } from '../../logic/cycle'
import { addDays } from '../../logic/dates'
import type { DayLog, ISODate, Settings } from '../../types'

/**
 * Layout of the Home disc in its 320×320 SVG box. The LCD in the hub is 38% × 27% of the
 * disc (see home.css), so its corners must stay inside the hub radius (tested).
 */
export const DISC = {
  size: 320,
  c: 160,
  /** Silver plate radius (CSS inset 1.25%). */
  plate: 156,
  /** Phase band radius and width. */
  r: 124,
  stroke: 20,
  gapDeg: 3,
  /** Chrome hub radius. */
  hub: 84,
  /** Today's bead radius (plus a 4.5 white halo). */
  bead: 12,
  /** LCD box as fractions of the disc width / height. */
  lcdW: 0.38,
  lcdH: 0.27,
} as const

const pct2 = (n: number) => `${Math.round(n * 10000) / 100}%`

/** CSS box offsets (percent of the disc) for the silver plate and the hub's LCD, from DISC. */
export function discBoxes(): {
  plate: { inset: string }
  hub: { left: string; right: string; top: string; bottom: string }
} {
  const plateInset = (DISC.c - DISC.plate) / DISC.size
  const side = (1 - DISC.lcdW) / 2
  const top = (1 - DISC.lcdH) / 2
  return {
    plate: { inset: pct2(plateInset) },
    hub: { left: pct2(side), right: pct2(side), top: pct2(top), bottom: pct2(top) },
  }
}

/** A run of consecutive cycle days in the same phase (null = unknown). */
export interface PhaseRun {
  phase: Phase | null
  /** 1-based cycle day the run starts on. */
  startDay: number
  days: number
}

export interface DiscSegment extends PhaseRun {
  /** Degrees clockwise from 12 o'clock. */
  startAngle: number
  /** Degrees; all sweeps add up to exactly 360. */
  sweep: number
}

export interface DiscGeometry {
  /** Days the disc stands for: the cycle length, or more when the period is late. */
  totalDays: number
  segments: DiscSegment[]
  /** Centre of today's slice, degrees clockwise from 12 o'clock. */
  markerAngle: number
  /** Today is past the estimated cycle length (the disc was stretched to fit today). */
  overdue: boolean
}

/** Groups per-day phases into runs, in order. */
export function phaseRuns(dayPhases: readonly (Phase | null)[]): PhaseRun[] {
  const runs: PhaseRun[] = []
  dayPhases.forEach((phase, i) => {
    const last = runs[runs.length - 1]
    if (last && last.phase === phase) last.days++
    else runs.push({ phase, startDay: i + 1, days: 1 })
  })
  return runs
}

/**
 * Disc for a cycle whose days have the given phases. `cycleDay` is today's 1-based day,
 * `cycleLength` the estimated length (only used to flag a late period). Null when the cycle
 * is unknown (`cycleDay` null or invalid) or there are no days to draw.
 */
export function discGeometry(
  dayPhases: readonly (Phase | null)[],
  cycleDay: number | null,
  cycleLength: number,
): DiscGeometry | null {
  if (cycleDay === null || !Number.isFinite(cycleDay) || cycleDay < 1 || dayPhases.length === 0) return null
  const totalDays = dayPhases.length
  const perDay = 360 / totalDays
  const runs = phaseRuns(dayPhases)
  const segments = runs.map((r, i): DiscSegment => {
    const startAngle = (r.startDay - 1) * perDay
    // The last segment closes the circle exactly (no floating-point sliver).
    const end = i === runs.length - 1 ? 360 : (r.startDay - 1 + r.days) * perDay
    return { ...r, startAngle, sweep: end - startAngle }
  })
  const markerDay = Math.min(cycleDay, totalDays)
  return { totalDays, segments, markerAngle: (markerDay - 0.5) * perDay, overdue: cycleDay > cycleLength }
}

/** Phases of a whole estimated cycle (for the preview disc before any period is logged). */
export function estimatedCyclePhases(cycleLength: number, periodDays: number): Phase[] {
  const out: Phase[] = []
  for (let d = 1; d <= cycleLength; d++) out.push(phaseForCycleDay(d, cycleLength, periodDays))
  return out
}

/**
 * Phases of the current cycle, day by day, exactly as the calendar shows them (past days
 * estimated, later days predicted). Covers max(cycleLength, cycleDay) days so a late period
 * still has today on the disc.
 */
export function currentCyclePhases(
  logs: DayLog[],
  settings: Settings,
  today: ISODate,
  cycleDay: number,
  cycleLength: number,
): (Phase | null)[] {
  const start = addDays(today, -(cycleDay - 1))
  const total = Math.max(cycleLength, cycleDay)
  const out: (Phase | null)[] = []
  for (let d = 1; d <= total; d++) out.push(phaseOn(logs, addDays(start, d - 1), settings, today))
  return out
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

const rad = (deg: number) => (deg * Math.PI) / 180
const r2 = (n: number) => Math.round(n * 100) / 100

/** Point on a circle, `angle` in degrees clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  const a = rad(angle - 90)
  return [r2(cx + r * Math.cos(a)), r2(cy + r * Math.sin(a))]
}

/** Open arc path from `start` to `end` degrees, clockwise. A full turn is drawn as two halves. */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = end - start
  if (sweep >= 359.99) {
    const [x1, y1] = polar(cx, cy, r, start)
    const [x2, y2] = polar(cx, cy, r, start + 180)
    return `M${x1} ${y1}A${r} ${r} 0 1 1 ${x2} ${y2}A${r} ${r} 0 1 1 ${x1} ${y1}`
  }
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  return `M${x1} ${y1}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

/** Pie slice from the centre, `start` to `end` degrees (clips the "so far" part of the disc). */
export function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  if (end - start >= 359.99) return arcPath(cx, cy, r, 0, 360) + 'Z'
  const [x1, y1] = polar(cx, cy, r, start)
  const [x2, y2] = polar(cx, cy, r, end)
  return `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}Z`
}

/** How one segment is drawn: a round-capped arc, a dot when too short for one, or a full ring. */
export type SegmentShape =
  | { kind: 'arc'; start: number; end: number }
  | { kind: 'dot'; angle: number; radius: number }
  | { kind: 'full' }

/**
 * Fits a segment between its neighbours: the arc is shortened so its round caps (half the
 * stroke, `capDeg` degrees at the ring radius) stop `gapDeg / 2` short of each end. Segments
 * too short for that become a dot, shrunk if needed so it never touches a neighbour.
 */
export function segmentShape(
  seg: Pick<DiscSegment, 'startAngle' | 'sweep'>,
  opts: { capDeg: number; gapDeg: number; ringRadius: number; strokeWidth: number; only: boolean },
): SegmentShape {
  if (opts.only) return { kind: 'full' }
  const inset = opts.capDeg + opts.gapDeg / 2
  const start = seg.startAngle + inset
  const end = seg.startAngle + seg.sweep - inset
  if (end - start >= 0.5) return { kind: 'arc', start: r2(start), end: r2(end) }
  const room = rad(Math.max(0, seg.sweep - opts.gapDeg)) * opts.ringRadius
  return {
    kind: 'dot',
    angle: r2(seg.startAngle + seg.sweep / 2),
    radius: r2(Math.max(2, Math.min(opts.strokeWidth / 2, room / 2))),
  }
}

/** Cap angle (degrees) of a round-capped stroke of `strokeWidth` on a circle of radius `r`. */
export function capDegrees(strokeWidth: number, r: number): number {
  return ((strokeWidth / 2 / r) * 180) / Math.PI
}

/** Digits shown on an LCD readout: at least two ("06"), never junk. */
export function lcdDigits(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '--'
  const v = Math.max(0, Math.round(n))
  return v < 10 ? `0${v}` : String(v)
}
