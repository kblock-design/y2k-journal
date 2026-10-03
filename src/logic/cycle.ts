// Cycle and phase estimation.
//
// These are rough estimates for a self-tracking journal, NOT medical advice and
// NOT suitable for contraception. All functions are pure: "today" is always
// passed in, never read from the clock.
//
// Data model reminders:
// - Dates are local 'YYYY-MM-DD' strings, so plain string comparison orders them.
// - A day with no DayLog is UNKNOWN, not "no bleeding". The user logs once per
//   night and sometimes misses days.

import type { DayLog, Flow, ISODate, Settings } from '../types'
import { addDays, diffDays } from './dates'

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

/** A run of bleeding days, both ends inclusive. */
export interface Period {
  start: ISODate
  end: ISODate
}

export interface CycleStatus {
  /** 1-based day of the current cycle; null until a first period is logged. */
  cycleDay: number | null
  phase: Phase | null
  /** Cycle length used for the estimate, in days. */
  cycleLength: number
  /** True while cycleLength is still the default rather than learned from logs. */
  usingDefault: boolean
  nextPeriod: ISODate | null
  /** Negative when the period is late. */
  daysUntilNextPeriod: number | null
}

// ---------------------------------------------------------------------------
// Tunable rules (judgment calls, kept in one place)
// ---------------------------------------------------------------------------

/**
 * Up to this many non-bleeding or unlogged days may sit between two bleeding
 * days of the SAME period (e.g. heavy, heavy, -, -, light = one period).
 * A longer break ends the period.
 */
export const MAX_GAP_DAYS_IN_PERIOD = 2

/**
 * A new bleeding run that starts fewer than this many days after the previous
 * period's first day is NOT counted as a new period (it is most likely
 * breakthrough / mid-cycle bleeding). Matches MIN_PLAUSIBLE_CYCLE_DAYS.
 */
export const MIN_DAYS_BETWEEN_PERIOD_STARTS = 15

/** Gaps between period starts outside this range are ignored when learning
 *  cycle length; a very long gap usually means a period was not logged. */
export const MIN_PLAUSIBLE_CYCLE_DAYS = 15
export const MAX_PLAUSIBLE_CYCLE_DAYS = 60

/** Only the most recent N plausible cycles / completed periods are used, so
 *  the estimate follows changes over time. */
export const RECENT_CYCLES_USED = 6

/**
 * Ovulation is estimated at (cycle length − 14). The luteal phase (ovulation →
 * next period) is the more constant part of the cycle; the follicular phase is
 * what stretches or shrinks.
 */
export const LUTEAL_PHASE_DAYS = 14

/** The 'ovulation' phase covers the estimated ovulation day ± this many days. */
export const OVULATION_WINDOW_RADIUS = 1

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FLOW_RANK: Record<Flow, number> = { none: 0, spotting: 1, light: 2, medium: 3, heavy: 4 }

/** Light, medium or heavy flow. Spotting is not bleeding on its own. */
export function isBleeding(flow: Flow): boolean {
  return FLOW_RANK[flow] >= FLOW_RANK.light
}

/** Median, rounded to whole days (x.5 rounds up). Assumes a non-empty list. */
function roundedMedian(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const m = s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  return Math.round(m)
}

/** One flow per date (heaviest wins if a date appears twice), sorted oldest first. */
function flowsByDate(logs: DayLog[]): [ISODate, Flow][] {
  const byDate = new Map<ISODate, Flow>()
  for (const l of logs) {
    const prev = byDate.get(l.date)
    if (prev === undefined || FLOW_RANK[l.flow] > FLOW_RANK[prev]) byDate.set(l.date, l.flow)
  }
  return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

function latestLogDate(logs: DayLog[]): ISODate | null {
  let latest: ISODate | null = null
  for (const l of logs) if (latest === null || l.date > latest) latest = l.date
  return latest
}

function periodDays(p: Period): number {
  return diffDays(p.start, p.end) + 1
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

/**
 * Groups logged days into periods, oldest first.
 *
 * - A period starts on a light/medium/heavy day. Spotting never starts one.
 * - Bleeding days with at most MAX_GAP_DAYS_IN_PERIOD non-bleeding or unlogged
 *   days between them belong to the same period.
 * - Spotting logged on the days directly after bleeding (no unlogged day in
 *   between) is the tail of the period and extends its end. Spotting BEFORE
 *   the first bleeding day does not move the start (day 1 = first real flow).
 * - A run starting < MIN_DAYS_BETWEEN_PERIOD_STARTS days after the previous
 *   period's start is ignored (not a new cycle).
 */
export function findPeriods(logs: DayLog[]): Period[] {
  const runs: Period[] = []
  let cur: Period | null = null

  for (const [date, flow] of flowsByDate(logs)) {
    if (isBleeding(flow)) {
      if (cur && diffDays(cur.end, date) <= MAX_GAP_DAYS_IN_PERIOD + 1) {
        cur.end = date
      } else {
        if (cur) runs.push(cur)
        cur = { start: date, end: date }
      }
    } else if (flow === 'spotting' && cur && diffDays(cur.end, date) === 1) {
      cur.end = date
    }
  }
  if (cur) runs.push(cur)

  const periods: Period[] = []
  for (const run of runs) {
    const prev = periods[periods.length - 1]
    if (prev && diffDays(prev.start, run.start) < MIN_DAYS_BETWEEN_PERIOD_STARTS) continue
    periods.push(run)
  }
  return periods
}

// ---------------------------------------------------------------------------
// Length estimates
// ---------------------------------------------------------------------------

/**
 * Cycle length learned from the gaps between consecutive period starts:
 * the rounded MEDIAN of the most recent RECENT_CYCLES_USED plausible gaps
 * (median so one odd cycle does not drag the estimate). Falls back to
 * `defaultCycleLength` until at least one plausible complete cycle exists.
 */
export function cycleLengthFromPeriods(
  periods: Period[],
  defaultCycleLength: number,
): { cycleLength: number; usingDefault: boolean } {
  const gaps: number[] = []
  for (let i = 1; i < periods.length; i++) {
    const g = diffDays(periods[i - 1].start, periods[i].start)
    if (g >= MIN_PLAUSIBLE_CYCLE_DAYS && g <= MAX_PLAUSIBLE_CYCLE_DAYS) gaps.push(g)
  }
  if (gaps.length === 0) return { cycleLength: defaultCycleLength, usingDefault: true }
  return { cycleLength: roundedMedian(gaps.slice(-RECENT_CYCLES_USED)), usingDefault: false }
}

/**
 * A period is "completed" once something is logged after its last day (so it
 * can no longer grow). Returns the rounded median length of the most recent
 * RECENT_CYCLES_USED completed periods, or null if there are none.
 */
function learnedPeriodLength(periods: Period[], latestLog: ISODate | null): number | null {
  const done = periods.filter((p) => latestLog !== null && latestLog > p.end).map(periodDays)
  return done.length ? roundedMedian(done.slice(-RECENT_CYCLES_USED)) : null
}

/** Typical period length in days: learned from completed periods, else the default. */
export function averagePeriodLength(logs: DayLog[], settings: Settings): number {
  return learnedPeriodLength(findPeriods(logs), latestLogDate(logs)) ?? settings.defaultPeriodLength
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

/**
 * Phase for a 1-based cycle day in a cycle of `cycleLength` days whose first
 * `menstrualDays` days are the period.
 *
 * Ovulation window = (cycleLength − 14) ± 1, but always pushed after the
 * period so short cycles never overlap (it shrinks to one day if squeezed, and
 * is dropped entirely if the period fills the cycle). Any day after the window
 * is luteal, including days past cycleLength (a late period stays luteal).
 */
export function phaseForCycleDay(cycleDay: number, cycleLength: number, menstrualDays: number): Phase {
  if (cycleDay <= menstrualDays) return 'menstrual'
  const ovDay = cycleLength - LUTEAL_PHASE_DAYS
  const windowStart = Math.max(ovDay - OVULATION_WINDOW_RADIUS, menstrualDays + 1)
  const windowEnd = Math.max(ovDay + OVULATION_WINDOW_RADIUS, windowStart)
  if (windowStart >= cycleLength) return 'luteal' // no room for an ovulation window
  if (cycleDay < windowStart) return 'follicular'
  if (cycleDay <= windowEnd) return 'ovulation'
  return 'luteal'
}

/**
 * Core phase lookup. `knownUntil` is the last day we treat as "now or past";
 * days after it are predictions.
 */
function phaseAt(logs: DayLog[], date: ISODate, settings: Settings, knownUntil: ISODate): Phase | null {
  const periods = findPeriods(logs)
  if (periods.length === 0 || date < periods[0].start) return null

  let idx = 0
  while (idx + 1 < periods.length && periods[idx + 1].start <= date) idx++
  const p = periods[idx]
  const next = periods[idx + 1]
  const cycleDay = diffDays(p.start, date) + 1
  const { cycleLength } = cycleLengthFromPeriods(periods, settings.defaultCycleLength)
  const latestLog = latestLogDate(logs)
  const typicalPeriod = learnedPeriodLength(periods, latestLog) ?? settings.defaultPeriodLength

  // A past cycle whose next period is known: use the real bleeding days and
  // scale the phases to that cycle's real length.
  if (next) {
    const realLength = diffDays(p.start, next.start)
    if (realLength <= MAX_PLAUSIBLE_CYCLE_DAYS) return phaseForCycleDay(cycleDay, realLength, periodDays(p))
    // Implausibly long gap (probably an unlogged period): estimate the first
    // cycle's worth of days, then admit we don't know.
    return cycleDay <= cycleLength ? phaseForCycleDay(cycleDay, cycleLength, periodDays(p)) : null
  }

  // The latest period. If nothing has been logged after its last day it may
  // still be going on, so assume it lasts at least the typical length.
  const completed = latestLog !== null && latestLog > p.end
  const menstrualDays = completed ? periodDays(p) : Math.max(periodDays(p), typicalPeriod)
  const anchor = latestLog !== null && latestLog > knownUntil ? latestLog : knownUntil

  // Up to "now": stays in this cycle (luteal if the period is late).
  if (date <= anchor) return phaseForCycleDay(cycleDay, cycleLength, menstrualDays)

  // Future: predict periods every cycleLength days. If the period is already
  // late, the next one is predicted for the day after "now".
  let predicted = addDays(p.start, cycleLength)
  if (predicted <= anchor) predicted = addDays(anchor, 1)
  if (date < predicted) return phaseForCycleDay(cycleDay, cycleLength, menstrualDays)
  const k = Math.floor(diffDays(predicted, date) / cycleLength)
  const start = addDays(predicted, k * cycleLength)
  return phaseForCycleDay(diffDays(start, date) + 1, cycleLength, typicalPeriod)
}

/**
 * Estimated phase for any past or future day (for the calendar); null if unknown.
 *
 * `today` is optional: when given, days up to today are treated as the
 * present (a late period stays luteal through today) and later days are
 * predictions, matching cycleStatus(). Without it, the latest logged day is
 * used as "today".
 */
export function phaseOn(logs: DayLog[], date: ISODate, settings: Settings, today?: ISODate): Phase | null {
  if (today !== undefined) {
    return phaseAt(
      logs.filter((l) => l.date <= today),
      date,
      settings,
      today,
    )
  }
  const latest = latestLogDate(logs)
  return latest === null ? null : phaseAt(logs, date, settings, latest)
}

export function cycleStatus(logs: DayLog[], today: ISODate, settings: Settings): CycleStatus {
  // Ignore anything logged for a future date.
  const known = logs.filter((l) => l.date <= today)
  const periods = findPeriods(known)
  const { cycleLength, usingDefault } = cycleLengthFromPeriods(periods, settings.defaultCycleLength)

  const last = periods[periods.length - 1]
  if (!last) {
    return { cycleDay: null, phase: null, cycleLength, usingDefault, nextPeriod: null, daysUntilNextPeriod: null }
  }

  const nextPeriod = addDays(last.start, cycleLength)
  return {
    cycleDay: diffDays(last.start, today) + 1,
    phase: phaseAt(known, today, settings, today),
    cycleLength,
    usingDefault,
    nextPeriod,
    daysUntilNextPeriod: diffDays(today, nextPeriod),
  }
}
