import { useMemo } from 'react'
import type { Phase } from '../logic/cycle'
import { cycleStatus } from '../logic/cycle'
import type { CycleStatus } from '../logic/cycle'
import { fromISODate } from '../logic/dates'
import { cycleStats, MIN_LOGGED_DAYS_PER_WINDOW, RATING_MAX, RATING_MIN, RATING_SPAN } from '../logic/stats'
import type { CycleStats, LoggingHabits, RegularityLabel, UnavailableReason } from '../logic/stats'
import type { DayLog, ISODate, MoodKey, Settings } from '../types'
import { plural } from './format'

// Hooks and plain-text formatting for cycle numbers and the Stats screen. All maths lives in
// src/logic; this only memoizes, rounds and phrases. Copy describes patterns, never conditions.
// Call these hooks INSIDE an error boundary (the section that shows them), not in the app
// shell, so a bad record breaks one card instead of the whole app.

/** Today's cycle day, phase, prediction and cycle length (`cycleDay === null` before any period). */
export function useCycleStatus(logs: DayLog[], today: ISODate, settings: Settings): CycleStatus {
  return useMemo(() => cycleStatus(logs, today, settings), [logs, today, settings])
}

/** Everything the Stats screen shows (src/logic/stats.ts `CycleStats`). */
export function useCycleStats(logs: DayLog[], today: ISODate, settings: Settings): CycleStats {
  return useMemo(() => cycleStats(logs, today, settings), [logs, today, settings])
}

/** Check-in streaks, independent of the pet. */
export interface Streaks {
  /** Consecutive logged days ending today, or ending yesterday if today isn't logged yet; 0 if neither. */
  current: number
  /** Longest run ever; `isCurrent` when it is the one still running. `days` is 0 with no logs. */
  longest: LoggingHabits['longestStreak']
  loggedToday: boolean
  /** Total days with a check-in. */
  daysLogged: number
}

/**
 * Current and longest check-in streak (the motivation element for skins without the pet).
 * Same rule as the pet's streak. Derived from `cycleStats(...).habits`; if you already call
 * `useCycleStats`, read `stats.habits` instead of calling both.
 */
export function useStreaks(logs: DayLog[], today: ISODate, settings: Settings): Streaks {
  return useMemo(() => {
    const h = cycleStats(logs, today, settings).habits
    return { current: h.currentStreak, longest: h.longestStreak, loggedToday: h.loggedToday, daysLogged: h.daysLogged }
  }, [logs, today, settings])
}

// ---------------------------------------------------------------------------
// Number formatting (rounding only, never maths)
// ---------------------------------------------------------------------------

export const DASH = '–'
const MINUS = '−'

export const isNum = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n)

/** 28 → "28", 28.5 → "28.5", null → "–". */
export function num(n: number | null | undefined): string {
  if (!isNum(n)) return DASH
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** One decimal: 2.25 → "2.3". */
export function one(n: number | null | undefined): string {
  return isNum(n) ? n.toFixed(1) : DASH
}

/** Signed rating points: "+3.0", "−0.4", "0.0". */
export function signed(n: number | null | undefined): string {
  if (!isNum(n)) return DASH
  const r = Math.round(n * 10) / 10
  if (r === 0) return '0.0'
  return r > 0 ? `+${r.toFixed(1)}` : `${MINUS}${Math.abs(r).toFixed(1)}`
}

/** 0.456 → "46%". */
export function pct(share: number | null | undefined): string {
  return isNum(share) ? `${Math.round(share * 100)}%` : DASH
}

/** "1 day", "28 days", "28.5 days". */
export function daysText(n: number): string {
  return n === 1 ? '1 day' : `${num(n)} days`
}

/** "26–35 days", or "all 28 days" when they match. */
export function dayRange(lo: number | null, hi: number | null): string {
  if (!isNum(lo) || !isNum(hi)) return DASH
  return lo === hi ? `all ${daysText(lo)}` : `${num(lo)}–${num(hi)} days`
}

/** "4 May" */
export function shortDate(date: ISODate): string {
  return fromISODate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** "May 2026" */
export function monthYear(date: ISODate): string {
  return fromISODate(date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

/** Position of a 1–6 rating along a track, as a percentage (0–100). */
export function scalePos(v: number): number {
  const clamped = Math.min(RATING_MAX, Math.max(RATING_MIN, v))
  return ((clamped - RATING_MIN) / RATING_SPAN) * 100
}

export const PHASE_ABBR: Record<Phase, string> = { menstrual: 'Men', follicular: 'Fol', ovulation: 'Ovu', luteal: 'Lut' }

export const REGULARITY_WORDS: Record<RegularityLabel, string> = {
  regular: 'Regular',
  'somewhat-irregular': 'A bit variable',
  irregular: 'Varies a lot',
}

/** Display words for sleep / energy / cravings levels. */
export const LEVEL_LABELS: Record<string, string> = {
  poor: 'Poor',
  ok: 'OK',
  good: 'Good',
  low: 'Low',
  high: 'High',
  none: 'None',
  some: 'Some',
  strong: 'Strong',
}

/** Why a stats section is unavailable and what unlocks it, as one or two sentences. */
export function reasonCopy(reason: UnavailableReason, s: CycleStats): string {
  switch (reason) {
    case 'no-logs':
      return 'Nothing logged yet. Your first check-in gets things going.'
    case 'no-period-logged':
      return 'No period logged yet. When it starts, pick light, medium or heavy flow in your check-in and this wakes up.'
    case 'no-completed-cycle':
      if (s.cycles.lengths.skippedGaps > 0) {
        return 'A cycle runs from one period start to the next. The gap between your logged starts is too long to count (probably a period that went unlogged), so the next period you log closes your first cycle.'
      }
      return `A cycle runs from one period start to the next. You've logged ${plural(s.cycles.periodsLogged, 'period')} so far, so your next one completes your first full cycle.`
    case 'not-enough-cycles':
      return 'Needs a few more completed cycles.'
    case 'no-completed-period':
      return "Your period looks like it's still going. Its length shows up once it's over."
    case 'no-phase-data':
      return 'Your check-ins so far are all from before your first logged period, so none of them can be placed in a phase yet.'
    case 'not-enough-window-days':
      return `Needs a period with at least ${MIN_LOGGED_DAYS_PER_WINDOW} check-ins in the week before it and ${MIN_LOGGED_DAYS_PER_WINDOW} in days 4–10 after it starts.`
    case 'no-mood-ratings':
      return 'No moods rated yet. Your check-in asks about moods once mood tracking is on in Settings.'
  }
}

// ---------------------------------------------------------------------------
// Mood tracking (Settings.moodTracking) on the Stats screen
// ---------------------------------------------------------------------------

/** Short label for a mood row/cell that has never been rated. */
export const NOT_TRACKED = 'not tracked'

/** One friendly line for the mood parts of Stats when mood tracking is off and nothing was ever rated. */
export const MOODS_OFF_COPY = 'Mood tracking is off, so there are no mood patterns to show.'
/** Button / link text pointing to the setting. */
export const MOODS_OFF_ACTION = 'Turn it on in Settings'

/**
 * True when mood tracking is off AND no mood was ever rated: show MOODS_OFF_COPY instead of
 * the mood sections and "needs more check-ins" copy. With any mood history the mood stats keep
 * working whatever the current setting.
 */
export function moodsOff(settings: Settings, s: CycleStats): boolean {
  return settings.moodTracking === 'off' && !s.sufficiency.hasMoodRatings
}

/** Whether `key` has ever been rated (false → show NOT_TRACKED instead of a number). */
export function moodTracked(s: CycleStats, key: MoodKey): boolean {
  return (s.moodTotals.items.find((i) => i.key === key)?.days ?? 0) > 0
}
