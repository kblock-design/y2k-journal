// Numbers and patterns for the "cycle stats" page.
//
// This is a self-tracking journal. Everything here DESCRIBES patterns in the
// user's own check-ins ("higher in the week before your period"); nothing here
// assesses, screens for or diagnoses any condition, and no threshold below is a
// clinical cut-off. Phases are the same rough estimates the rest of the app
// shows (see cycle.ts).
//
// Pure: `today` is passed in, no clock, no I/O. Rules shared by every section:
// - Only logs dated on or before `today` count; later-dated logs are ignored
//   (and counted in habits.futureEntriesIgnored).
// - A day without a log is UNKNOWN. It is never treated as a zero rating, a
//   symptom-free day or a missing period.
// - One entry per date: if a date appears twice, the most recently saved
//   (highest loggedAt) wins for ratings/symptoms. Period detection itself is
//   delegated to cycle.ts and sees exactly what the calendar sees.
// - Mood ratings outside 1–6 (or missing) are skipped for that item only. A
//   missing rating means "not recorded" (mood tracking off, or a level that
//   didn't ask), never "not at all": every mood mean uses only the days that
//   mood was rated, and a day with no mood rating at all is not a rated day
//   for any mood section (phases, before/after windows). Body, sleep, energy,
//   cravings, cycles and habits count every logged day as before.
// - Means are unrounded numbers; the UI rounds. Anything that cannot be
//   computed is null. No NaN / Infinity is ever returned.
// - Shares are fractions 0..1. `percentChange` is in percent (25 = +25 %).

import { MOOD_ITEMS, PHYSICAL_SYMPTOMS } from '../types'
import type { Cravings, DayLog, Energy, ISODate, MoodKey, PhysicalKey, Rating, Settings, Sleep } from '../types'
import { MAX_PLAUSIBLE_CYCLE_DAYS, MIN_PLAUSIBLE_CYCLE_DAYS, RECENT_CYCLES_USED, findPeriods, phaseOn } from './cycle'
import type { Period, Phase } from './cycle'
import { addDays, diffDays } from './dates'

// ---------------------------------------------------------------------------
// Thresholds (all exported so the UI and tests can quote them)
// ---------------------------------------------------------------------------

export const PHASE_ORDER: readonly Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']
export const SLEEP_LEVELS: readonly Sleep[] = ['poor', 'ok', 'good']
export const ENERGY_LEVELS: readonly Energy[] = ['low', 'ok', 'high']
export const CRAVINGS_LEVELS: readonly Cravings[] = ['none', 'some', 'strong']

/** Mood ratings run 1–6, so the scale spans 5 points. */
export const RATING_MIN = 1
export const RATING_MAX = 6
export const RATING_SPAN = RATING_MAX - RATING_MIN

/** Completed (plausible) cycles needed before cycle lengths are shown. */
export const MIN_CYCLES_FOR_LENGTHS = 1

/**
 * Regularity is measured as the spread (longest − shortest, in days) of the
 * most recent RECENT_CYCLES_USED plausible cycles, and only once at least
 * MIN_CYCLES_FOR_REGULARITY cycles exist (with 1–2 cycles any spread is luck).
 *   spread ≤ REGULAR_MAX_SPREAD_DAYS                → 'regular'
 *   spread ≤ SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS     → 'somewhat-irregular'
 *   otherwise                                       → 'irregular'
 * 7 days follows the commonly used "shortest-to-longest varies by about a
 * week" convention for describing cycles as regular; 13 is our own cut for a
 * friendlier middle label. These are descriptive labels only.
 */
export const MIN_CYCLES_FOR_REGULARITY = 3
export const REGULAR_MAX_SPREAD_DAYS = 7
export const SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS = 13

/**
 * Before-vs-after windows, as offsets in days from a period's first day
 * (offset 0 = cycle day 1). Both windows hang off the SAME period start:
 *   premenstrual  = offsets −7..−1  (the 7 days before the period started)
 *   postmenstrual = offsets +3..+9  (cycle days 4–10 of the cycle it starts)
 * This mirrors the convention commonly used when comparing daily ratings
 * around the period (the week before vs. days 4–10 after onset). Anchoring
 * both windows to one observed onset means every pair needs only one
 * reliably-logged period start, and the very first logged period can already
 * count if the week before it was logged.
 */
export const PREMENSTRUAL_WINDOW = { firstOffset: -7, lastOffset: -1 } as const
export const POSTMENSTRUAL_WINDOW = { firstOffset: 3, lastOffset: 9 } as const

/** A period start only feeds the comparison when BOTH of its windows have at
 *  least this many logged (rated) days out of 7. */
export const MIN_LOGGED_DAYS_PER_WINDOW = 4

/** Compared cycles needed before the comparison is called a pattern (and
 *  before a mood highlight is produced). One cycle can be shown, flagged. */
export const MIN_CYCLES_FOR_PATTERN = 2

/** Logged days a phase needs before its means/shares are flagged enoughData. */
export const MIN_PHASE_DAYS = 3

/** Highlights. Display thresholds for "worth a sticker", not clinical cut-offs. */
/** Pre − post difference (rating points) for a mood item to count as rising. */
export const NOTABLE_MOOD_DIFFERENCE = 0.5
/** ...and it must be higher before the period in at least this share of the
 *  compared cycles, so one rough week can't make a "pattern" on its own. */
export const MIN_SHARE_OF_CYCLES_HIGHER = 0.5
export const MIN_STREAK_FOR_HIGHLIGHT = 3
/** Cycles / completed periods needed for the "typical length" highlights. */
export const MIN_SAMPLES_FOR_TYPICAL_HIGHLIGHT = 2
export const MIN_PHASE_DAYS_FOR_SYMPTOM_HIGHLIGHT = 5
export const MIN_SYMPTOM_COUNT_FOR_HIGHLIGHT = 3
export const MIN_DAYS_FOR_COVERAGE_HIGHLIGHT = 14
export const MIN_COVERAGE_SHARE_FOR_HIGHLIGHT = 0.8

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Why a section (or sub-section) has nothing to show yet. */
export type UnavailableReason =
  | 'no-logs' // nothing logged up to today
  | 'no-period-logged' // logs exist but no period (light/medium/heavy flow) yet
  | 'no-completed-cycle' // need two period starts a plausible distance apart
  | 'not-enough-cycles' // some cycles, fewer than the section's minimum
  | 'no-completed-period' // the only period(s) may still be going on
  | 'no-phase-data' // every logged day falls before the first logged period
  | 'not-enough-window-days' // no period start has enough logged days on both sides
  | 'no-mood-ratings' // logs exist but no mood was ever rated (mood tracking off)

export type RegularityLabel = 'regular' | 'somewhat-irregular' | 'irregular'

export interface CompletedCycle {
  /** Day 1 of the period that started this cycle. */
  start: ISODate
  /** Day 1 of the next period (= start + length). */
  nextStart: ISODate
  /** Days from this period start to the next one. */
  length: number
  /** Length of the period that opened this cycle, in days. */
  periodLength: number
}

export interface CycleNumbers {
  /** Periods detected up to today (including one that may still be going on). */
  periodsLogged: number
  lastPeriodStart: ISODate | null
  lengths: {
    available: boolean
    reason: UnavailableReason | null
    /** Plausible completed cycles, oldest first (for a history list / chart). */
    history: CompletedCycle[]
    count: number
    /** Gaps between period starts longer than MAX_PLAUSIBLE_CYCLE_DAYS (most
     *  likely an unlogged period); left out of every number. */
    skippedGaps: number
    /** Median of all plausible cycles (may be x.5). */
    typical: number | null
    shortest: number | null
    longest: number | null
    /** More completed cycles needed before lengths are available (0 when available). */
    cyclesNeeded: number
  }
  regularity: {
    available: boolean
    reason: UnavailableReason | null
    label: RegularityLabel | null
    /** Longest − shortest of the cycles used. */
    spreadDays: number | null
    shortest: number | null
    longest: number | null
    /** The most recent min(count, RECENT_CYCLES_USED) cycles. */
    cyclesUsed: number
    cyclesNeeded: number
  }
  periodLengths: {
    available: boolean
    reason: UnavailableReason | null
    /** Periods with something logged after their last day. */
    completedPeriods: number
    typical: number | null
    shortest: number | null
    longest: number | null
  }
}

export interface LoggingHabits {
  /** Distinct dates logged up to and including today. */
  daysLogged: number
  firstLogDate: ISODate | null
  lastLogDate: ISODate | null
  loggedToday: boolean
  /** Days logged out of days since the first log, through YESTERDAY (tonight's
   *  check-in may simply not have happened yet). */
  coverage: {
    daysLogged: number
    daysPossible: number
    /** null while daysPossible is 0 (e.g. the first log is today). */
    share: number | null
    through: ISODate
  }
  /** Consecutive logged days ending today, or ending yesterday if today is not
   *  logged yet (same rule as the pet). 0 if neither is logged. */
  currentStreak: number
  longestStreak: {
    days: number
    start: ISODate | null
    end: ISODate | null
    /** True when the longest streak is the one still running. */
    isCurrent: boolean
  }
  backfilledEntries: number
  futureEntriesIgnored: number
}

export interface MoodMean {
  key: MoodKey
  label: string
  /** null when the item has no rated day here. */
  mean: number | null
  /** Days with a valid rating for this item (0 = not rated here). */
  days: number
}

/** Every mood rating up to today, whatever the phase. */
export interface MoodTotals {
  /** Days with at least one valid mood rating. 0 = moods were never tracked. */
  daysRated: number
  /** In MOOD_ITEMS order. `days === 0` (mean null) = that mood was never rated: "not tracked". */
  items: MoodMean[]
}

export interface PhaseMood {
  phase: Phase
  /** Days in this phase with at least one valid mood rating (days logged with no mood
   *  rating, e.g. while mood tracking was off, are not counted). */
  daysLogged: number
  /** daysLogged >= MIN_PHASE_DAYS. */
  enoughData: boolean
  /** Mean of each day's average across all mood items. */
  overallMean: number | null
  /** In MOOD_ITEMS order. */
  items: MoodMean[]
}

export interface MoodByPhase {
  available: boolean
  reason: UnavailableReason | null
  /** Always all four phases, in PHASE_ORDER. */
  phases: PhaseMood[]
  /** Mood-rated days with no estimated phase (before the first logged period,
   *  or deep inside an implausibly long gap); excluded from `phases`. */
  unknownPhaseDays: number
}

export interface WindowSummary {
  from: ISODate
  to: ISODate
  /** Logged days in the window with at least one valid mood rating. */
  daysLogged: number
  /** Mean of the daily average across all mood items. */
  mean: number | null
}

export interface ComparisonPair {
  periodStart: ISODate
  premenstrual: WindowSummary
  postmenstrual: WindowSummary
  /** Both windows have >= MIN_LOGGED_DAYS_PER_WINDOW logged days. */
  contributes: boolean
  /** premenstrual.mean − postmenstrual.mean; null unless `contributes`. */
  difference: number | null
}

export interface MoodComparisonItem {
  key: MoodKey
  label: string
  /** Pooled over every contributing period start. */
  premenstrualMean: number | null
  postmenstrualMean: number | null
  premenstrualDays: number
  postmenstrualDays: number
  /** premenstrual − postmenstrual, in rating points (positive = higher before
   *  the period). null unless both pooled windows have
   *  >= MIN_LOGGED_DAYS_PER_WINDOW rated days. */
  difference: number | null
  /** difference / postmenstrualMean × 100. Note: inflates when the
   *  post-menstrual mean is low (1 → 2 is +100 %); prefer shareOfScale. */
  percentChange: number | null
  /** difference / RATING_SPAN, in −1..1 (0.2 = one full step on the 1–6 scale). */
  shareOfScale: number | null
  /** Contributing cycles where both windows rated this item. */
  cyclesCompared: number
  /** ...of which the premenstrual mean was strictly higher. */
  cyclesHigherBefore: number
}

export interface BeforeAfterComparison {
  available: boolean
  reason: UnavailableReason | null
  /** Contributing period starts. */
  cyclesCompared: number
  /** cyclesCompared >= MIN_CYCLES_FOR_PATTERN. */
  enoughCycles: boolean
  cyclesNeeded: number
  /** One entry per logged period start, oldest first, contributing or not. */
  pairs: ComparisonPair[]
  /** In MOOD_ITEMS order. */
  items: MoodComparisonItem[]
  /** Items with a difference, largest premenstrual increase first (ties in
   *  MOOD_ITEMS order). May end with negative differences. */
  ranked: MoodKey[]
  /** Same comparison on each day's average across all mood items. */
  overall: {
    premenstrualMean: number | null
    postmenstrualMean: number | null
    premenstrualDays: number
    postmenstrualDays: number
    difference: number | null
    percentChange: number | null
    shareOfScale: number | null
    cyclesHigherBefore: number
  }
}

export interface SymptomCount {
  key: PhysicalKey
  label: string
  count: number
  /** count / logged days of the group; null when the group has no days. */
  share: number | null
}

export interface BodyGroup {
  daysLogged: number
  /** Every symptom, in PHYSICAL_SYMPTOMS order. */
  symptoms: SymptomCount[]
  /** Symptoms logged at least once, most frequent first (ties in list order). */
  topSymptoms: SymptomCount[]
  sleep: Record<Sleep, number>
  energy: Record<Energy, number>
  cravings: Record<Cravings, number>
}

export interface PhaseBody extends BodyGroup {
  phase: Phase
  enoughData: boolean
}

export interface BodyStats {
  /** All logged days up to today, phase known or not. */
  overall: BodyGroup
  byPhase: {
    available: boolean
    reason: UnavailableReason | null
    phases: PhaseBody[]
    unknownPhaseDays: number
  }
}

export interface DataSufficiency {
  hasLogs: boolean
  hasPeriod: boolean
  hasCycleLengths: boolean
  cyclesNeededForLengths: number
  hasRegularity: boolean
  cyclesNeededForRegularity: number
  hasCompletedPeriod: boolean
  hasPhaseData: boolean
  /** At least one mood rating up to today (false = moods never tracked). */
  hasMoodRatings: boolean
  /** At least one contributing before/after pair. */
  hasComparison: boolean
  /** At least MIN_CYCLES_FOR_PATTERN contributing pairs. */
  hasComparisonPattern: boolean
  comparisonCyclesNeeded: number
}

/** Ready-to-phrase insights. Numbers only; the UI writes the sentence. */
export type Highlight =
  | {
      type: 'premenstrual-rise'
      item: MoodKey
      label: string
      premenstrualMean: number
      postmenstrualMean: number
      difference: number
      percentChange: number | null
      cycles: number
      cyclesHigherBefore: number
      /** How many items met the rising criteria (this one ranks first). */
      itemsRising: number
    }
  | {
      /** Enough cycles compared and no item rose by NOTABLE_MOOD_DIFFERENCE. */
      type: 'similar-before-and-after'
      cycles: number
      /** Largest premenstrual difference of any item (may be negative). */
      largestDifference: number
    }
  | { type: 'typical-cycle'; days: number; cycles: number }
  | { type: 'cycle-regularity'; label: RegularityLabel; spreadDays: number; cycles: number }
  | {
      type: 'phase-symptom'
      phase: Phase
      symptom: PhysicalKey
      label: string
      count: number
      share: number
      phaseDays: number
    }
  | { type: 'longest-streak'; days: number; isCurrent: boolean; start: ISODate; end: ISODate }
  | { type: 'typical-period'; days: number; periods: number }
  | { type: 'coverage'; share: number; daysLogged: number; daysPossible: number }

export interface CycleStats {
  today: ISODate
  sufficiency: DataSufficiency
  cycles: CycleNumbers
  habits: LoggingHabits
  moodTotals: MoodTotals
  moodByPhase: MoodByPhase
  beforeAfter: BeforeAfterComparison
  body: BodyStats
  /** Ordered: mood pattern, typical cycle, regularity, phase symptom,
   *  longest streak, typical period, coverage. Each only when its threshold is met. */
  highlights: Highlight[]
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

interface CleanDay {
  date: ISODate
  ratings: Partial<Record<MoodKey, Rating>>
  /** Average of the valid ratings that day; null if none were valid. */
  score: number | null
  symptoms: PhysicalKey[]
  sleep: Sleep | null
  energy: Energy | null
  cravings: Cravings | null
  backfilled: boolean
}

interface Acc {
  sum: number
  n: number
}

const newAcc = (): Acc => ({ sum: 0, n: 0 })
const meanOf = (a: Acc): number | null => (a.n > 0 ? a.sum / a.n : null)
const shareOf = (count: number, total: number): number | null => (total > 0 ? count / total : null)

type MoodAccs = Record<MoodKey, Acc>
const newMoodAccs = (): MoodAccs => Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, newAcc()])) as MoodAccs

function addMoods(accs: MoodAccs, overall: Acc, d: CleanDay): void {
  for (const m of MOOD_ITEMS) {
    const r = d.ratings[m.key]
    if (r !== undefined) {
      accs[m.key].sum += r
      accs[m.key].n++
    }
  }
  if (d.score !== null) {
    overall.sum += d.score
    overall.n++
  }
}

function isISODate(s: unknown): s is ISODate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function isRating(v: unknown): v is Rating {
  return typeof v === 'number' && Number.isInteger(v) && v >= RATING_MIN && v <= RATING_MAX
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const periodDays = (p: Period) => diffDays(p.start, p.end) + 1

const SYMPTOM_KEYS = new Set<string>(PHYSICAL_SYMPTOMS.map((s) => s.key))
const pick = <T extends string>(levels: readonly T[], v: unknown): T | null =>
  (levels as readonly unknown[]).includes(v) ? (v as T) : null

/** One validated entry per date (latest save wins), sorted oldest first. */
function cleanDays(known: DayLog[]): CleanDay[] {
  const savedAt = (l: DayLog) => (Number.isFinite(l.loggedAt) ? l.loggedAt : Number.NEGATIVE_INFINITY)
  const chosen = new Map<ISODate, DayLog>()
  for (const l of known) {
    const prev = chosen.get(l.date)
    if (!prev || savedAt(l) >= savedAt(prev)) chosen.set(l.date, l)
  }

  const out: CleanDay[] = []
  for (const l of chosen.values()) {
    const ratings: Partial<Record<MoodKey, Rating>> = {}
    const total = newAcc()
    for (const m of MOOD_ITEMS) {
      const r: unknown = l.moods?.[m.key]
      if (isRating(r)) {
        ratings[m.key] = r
        total.sum += r
        total.n++
      }
    }
    const symptoms = Array.isArray(l.physical)
      ? [...new Set(l.physical.filter((k): k is PhysicalKey => SYMPTOM_KEYS.has(k)))]
      : []
    out.push({
      date: l.date,
      ratings,
      score: meanOf(total),
      symptoms,
      sleep: pick(SLEEP_LEVELS, l.sleep),
      energy: pick(ENERGY_LEVELS, l.energy),
      cravings: pick(CRAVINGS_LEVELS, l.cravings),
      backfilled: l.backfilled === true,
    })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// ---------------------------------------------------------------------------
// 1. Cycle numbers
// ---------------------------------------------------------------------------

function regularityLabel(spread: number): RegularityLabel {
  if (spread <= REGULAR_MAX_SPREAD_DAYS) return 'regular'
  if (spread <= SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS) return 'somewhat-irregular'
  return 'irregular'
}

function cycleNumbers(periods: Period[], latestLog: ISODate | null): CycleNumbers {
  const history: CompletedCycle[] = []
  let skippedGaps = 0
  for (let i = 1; i < periods.length; i++) {
    const prev = periods[i - 1]
    const length = diffDays(prev.start, periods[i].start)
    if (length >= MIN_PLAUSIBLE_CYCLE_DAYS && length <= MAX_PLAUSIBLE_CYCLE_DAYS) {
      history.push({ start: prev.start, nextStart: periods[i].start, length, periodLength: periodDays(prev) })
    } else {
      skippedGaps++
    }
  }
  const lengths = history.map((c) => c.length)

  const base: UnavailableReason | null =
    latestLog === null ? 'no-logs' : periods.length === 0 ? 'no-period-logged' : null

  const lengthsReason: UnavailableReason | null =
    base ?? (history.length < MIN_CYCLES_FOR_LENGTHS ? 'no-completed-cycle' : null)
  const hasLengths = lengthsReason === null

  const recent = lengths.slice(-RECENT_CYCLES_USED)
  const regReason: UnavailableReason | null =
    base ??
    (history.length === 0 ? 'no-completed-cycle' : history.length < MIN_CYCLES_FOR_REGULARITY ? 'not-enough-cycles' : null)
  const hasReg = regReason === null
  const regShortest = hasReg ? Math.min(...recent) : null
  const regLongest = hasReg ? Math.max(...recent) : null
  const spread = regShortest !== null && regLongest !== null ? regLongest - regShortest : null

  const completed = periods.filter((p) => latestLog !== null && latestLog > p.end).map(periodDays)
  const periodReason: UnavailableReason | null = base ?? (completed.length === 0 ? 'no-completed-period' : null)
  const hasPeriodLengths = periodReason === null

  return {
    periodsLogged: periods.length,
    lastPeriodStart: periods.length ? periods[periods.length - 1].start : null,
    lengths: {
      available: hasLengths,
      reason: lengthsReason,
      history,
      count: history.length,
      skippedGaps,
      typical: hasLengths ? median(lengths) : null,
      shortest: hasLengths ? Math.min(...lengths) : null,
      longest: hasLengths ? Math.max(...lengths) : null,
      cyclesNeeded: Math.max(0, MIN_CYCLES_FOR_LENGTHS - history.length),
    },
    regularity: {
      available: hasReg,
      reason: regReason,
      label: spread !== null ? regularityLabel(spread) : null,
      spreadDays: spread,
      shortest: regShortest,
      longest: regLongest,
      cyclesUsed: hasReg ? recent.length : 0,
      cyclesNeeded: Math.max(0, MIN_CYCLES_FOR_REGULARITY - history.length),
    },
    periodLengths: {
      available: hasPeriodLengths,
      reason: periodReason,
      completedPeriods: completed.length,
      typical: hasPeriodLengths ? median(completed) : null,
      shortest: hasPeriodLengths ? Math.min(...completed) : null,
      longest: hasPeriodLengths ? Math.max(...completed) : null,
    },
  }
}

// ---------------------------------------------------------------------------
// 2. Logging habits
// ---------------------------------------------------------------------------

function loggingHabits(days: CleanDay[], today: ISODate, futureEntriesIgnored: number): LoggingHabits {
  const dates = days.map((d) => d.date)
  const logged = new Set(dates)
  const yesterday = addDays(today, -1)
  const first = dates.length ? dates[0] : null

  const daysPossible = first !== null && first <= yesterday ? diffDays(first, yesterday) + 1 : 0
  const coveredLogged = dates.filter((d) => d <= yesterday).length

  const loggedToday = logged.has(today)
  let currentStreak = 0
  for (let d = loggedToday ? today : yesterday; logged.has(d); d = addDays(d, -1)) currentStreak++

  // Longest run; on a tie the later run wins (so a record-equalling current
  // streak is reported as current).
  let best = { days: 0, start: null as ISODate | null, end: null as ISODate | null }
  let runStart: ISODate | null = null
  let runLen = 0
  for (let i = 0; i < dates.length; i++) {
    if (i > 0 && diffDays(dates[i - 1], dates[i]) === 1) {
      runLen++
    } else {
      runStart = dates[i]
      runLen = 1
    }
    if (runLen >= best.days) best = { days: runLen, start: runStart, end: dates[i] }
  }
  const currentEnd = loggedToday ? today : yesterday
  const isCurrent = currentStreak > 0 && best.end === currentEnd && best.days === currentStreak

  return {
    daysLogged: dates.length,
    firstLogDate: first,
    lastLogDate: dates.length ? dates[dates.length - 1] : null,
    loggedToday,
    coverage: {
      daysLogged: coveredLogged,
      daysPossible,
      share: shareOf(coveredLogged, daysPossible),
      through: yesterday,
    },
    currentStreak,
    longestStreak: { ...best, isCurrent },
    backfilledEntries: days.filter((d) => d.backfilled).length,
    futureEntriesIgnored,
  }
}

// ---------------------------------------------------------------------------
// 3. Mood by phase
// ---------------------------------------------------------------------------

function moodItems(accs: MoodAccs): MoodMean[] {
  return MOOD_ITEMS.map((m) => ({ key: m.key, label: m.label, mean: meanOf(accs[m.key]), days: accs[m.key].n }))
}

const isRated = (d: CleanDay) => d.score !== null

function moodTotals(days: CleanDay[]): MoodTotals {
  const accs = newMoodAccs()
  const overall = newAcc()
  const rated = days.filter(isRated)
  for (const d of rated) addMoods(accs, overall, d)
  return { daysRated: rated.length, items: moodItems(accs) }
}

function moodByPhase(
  byPhase: Map<Phase, CleanDay[]>,
  unknownPhaseDays: CleanDay[],
  base: UnavailableReason | null,
  totals: MoodTotals,
): MoodByPhase {
  const phases = PHASE_ORDER.map((phase): PhaseMood => {
    // Only days with at least one mood rating count here (not-recorded is not a rating).
    const days = (byPhase.get(phase) ?? []).filter(isRated)
    const accs = newMoodAccs()
    const overall = newAcc()
    for (const d of days) addMoods(accs, overall, d)
    return {
      phase,
      daysLogged: days.length,
      enoughData: days.length >= MIN_PHASE_DAYS,
      overallMean: meanOf(overall),
      items: moodItems(accs),
    }
  })
  const reason =
    base ??
    (totals.daysRated === 0 ? 'no-mood-ratings' : phases.every((p) => p.daysLogged === 0) ? 'no-phase-data' : null)
  return { available: reason === null, reason, phases, unknownPhaseDays: unknownPhaseDays.filter(isRated).length }
}

// ---------------------------------------------------------------------------
// 4. Before vs after the period
// ---------------------------------------------------------------------------

function windowDays(
  byDate: Map<ISODate, CleanDay>,
  start: ISODate,
  w: { firstOffset: number; lastOffset: number },
): { from: ISODate; to: ISODate; days: CleanDay[] } {
  const days: CleanDay[] = []
  for (let o = w.firstOffset; o <= w.lastOffset; o++) {
    const d = byDate.get(addDays(start, o))
    if (d && d.score !== null) days.push(d)
  }
  return { from: addDays(start, w.firstOffset), to: addDays(start, w.lastOffset), days }
}

function scoreMean(days: CleanDay[]): number | null {
  return meanOfValues(days.map((d) => d.score))
}

function itemMean(days: CleanDay[], key: MoodKey): number | null {
  return meanOfValues(days.map((d) => d.ratings[key]))
}

function meanOfValues(values: (number | null | undefined)[]): number | null {
  const a = newAcc()
  for (const v of values) {
    if (typeof v === 'number') {
      a.sum += v
      a.n++
    }
  }
  return meanOf(a)
}

function compare(pre: Acc, post: Acc) {
  const preMean = meanOf(pre)
  const postMean = meanOf(post)
  const ok =
    preMean !== null && postMean !== null && pre.n >= MIN_LOGGED_DAYS_PER_WINDOW && post.n >= MIN_LOGGED_DAYS_PER_WINDOW
  const difference = ok ? preMean - postMean : null
  return {
    preMean,
    postMean,
    difference,
    percentChange: difference !== null && postMean !== null && postMean > 0 ? (difference / postMean) * 100 : null,
    shareOfScale: difference !== null ? difference / RATING_SPAN : null,
  }
}

function beforeAfter(
  periods: Period[],
  byDate: Map<ISODate, CleanDay>,
  base: UnavailableReason | null,
  totals: MoodTotals,
): BeforeAfterComparison {
  const pairs: ComparisonPair[] = []
  const preAccs = newMoodAccs()
  const postAccs = newMoodAccs()
  const preOverall = newAcc()
  const postOverall = newAcc()
  const perItem = Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, { compared: 0, higher: 0 }])) as Record<
    MoodKey,
    { compared: number; higher: number }
  >
  let overallHigher = 0

  for (const p of periods) {
    const pre = windowDays(byDate, p.start, PREMENSTRUAL_WINDOW)
    const post = windowDays(byDate, p.start, POSTMENSTRUAL_WINDOW)
    const contributes = pre.days.length >= MIN_LOGGED_DAYS_PER_WINDOW && post.days.length >= MIN_LOGGED_DAYS_PER_WINDOW
    const preMean = scoreMean(pre.days)
    const postMean = scoreMean(post.days)
    const difference = contributes && preMean !== null && postMean !== null ? preMean - postMean : null

    if (contributes) {
      for (const d of pre.days) addMoods(preAccs, preOverall, d)
      for (const d of post.days) addMoods(postAccs, postOverall, d)
      if (difference !== null && difference > 0) overallHigher++
      for (const m of MOOD_ITEMS) {
        const a = itemMean(pre.days, m.key)
        const b = itemMean(post.days, m.key)
        if (a !== null && b !== null) {
          perItem[m.key].compared++
          if (a > b) perItem[m.key].higher++
        }
      }
    }

    pairs.push({
      periodStart: p.start,
      premenstrual: { from: pre.from, to: pre.to, daysLogged: pre.days.length, mean: preMean },
      postmenstrual: { from: post.from, to: post.to, daysLogged: post.days.length, mean: postMean },
      contributes,
      difference,
    })
  }

  const cyclesCompared = pairs.filter((p) => p.contributes).length

  const items = MOOD_ITEMS.map((m): MoodComparisonItem => {
    const c = compare(preAccs[m.key], postAccs[m.key])
    return {
      key: m.key,
      label: m.label,
      premenstrualMean: c.preMean,
      postmenstrualMean: c.postMean,
      premenstrualDays: preAccs[m.key].n,
      postmenstrualDays: postAccs[m.key].n,
      difference: c.difference,
      percentChange: c.percentChange,
      shareOfScale: c.shareOfScale,
      cyclesCompared: perItem[m.key].compared,
      cyclesHigherBefore: perItem[m.key].higher,
    }
  })

  const order = new Map(MOOD_ITEMS.map((m, i) => [m.key as MoodKey, i]))
  const ranked = items
    .filter((i) => i.difference !== null)
    .sort((a, b) => (b.difference as number) - (a.difference as number) || order.get(a.key)! - order.get(b.key)!)
    .map((i) => i.key)

  const o = compare(preOverall, postOverall)
  const reason =
    base ?? (totals.daysRated === 0 ? 'no-mood-ratings' : cyclesCompared === 0 ? 'not-enough-window-days' : null)

  return {
    available: reason === null,
    reason,
    cyclesCompared,
    enoughCycles: cyclesCompared >= MIN_CYCLES_FOR_PATTERN,
    cyclesNeeded: Math.max(0, MIN_CYCLES_FOR_PATTERN - cyclesCompared),
    pairs,
    items,
    ranked,
    overall: {
      premenstrualMean: o.preMean,
      postmenstrualMean: o.postMean,
      premenstrualDays: preOverall.n,
      postmenstrualDays: postOverall.n,
      difference: o.difference,
      percentChange: o.percentChange,
      shareOfScale: o.shareOfScale,
      cyclesHigherBefore: overallHigher,
    },
  }
}

// ---------------------------------------------------------------------------
// 5. Body and lifestyle
// ---------------------------------------------------------------------------

const zeroCounts = <T extends string>(levels: readonly T[]) =>
  Object.fromEntries(levels.map((l) => [l, 0])) as Record<T, number>

function bodyGroup(days: CleanDay[]): BodyGroup {
  const counts = new Map<PhysicalKey, number>()
  const sleep = zeroCounts(SLEEP_LEVELS)
  const energy = zeroCounts(ENERGY_LEVELS)
  const cravings = zeroCounts(CRAVINGS_LEVELS)
  for (const d of days) {
    for (const s of d.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1)
    if (d.sleep) sleep[d.sleep]++
    if (d.energy) energy[d.energy]++
    if (d.cravings) cravings[d.cravings]++
  }
  const symptoms = PHYSICAL_SYMPTOMS.map((s): SymptomCount => {
    const count = counts.get(s.key) ?? 0
    return { key: s.key, label: s.label, count, share: shareOf(count, days.length) }
  })
  // Array.prototype.sort is stable, so ties stay in list order.
  const topSymptoms = symptoms.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
  return { daysLogged: days.length, symptoms, topSymptoms, sleep, energy, cravings }
}

function bodyStats(
  days: CleanDay[],
  byPhase: Map<Phase, CleanDay[]>,
  unknownPhaseDays: number,
  base: UnavailableReason | null,
): BodyStats {
  const phases = PHASE_ORDER.map((phase): PhaseBody => {
    const g = bodyGroup(byPhase.get(phase) ?? [])
    return { phase, enoughData: g.daysLogged >= MIN_PHASE_DAYS, ...g }
  })
  const reason = base ?? (phases.every((p) => p.daysLogged === 0) ? 'no-phase-data' : null)
  return {
    overall: bodyGroup(days),
    byPhase: { available: reason === null, reason, phases, unknownPhaseDays },
  }
}

// ---------------------------------------------------------------------------
// 7. Highlights
// ---------------------------------------------------------------------------

function highlights(
  cycles: CycleNumbers,
  habits: LoggingHabits,
  ba: BeforeAfterComparison,
  body: BodyStats,
): Highlight[] {
  const out: Highlight[] = []

  if (ba.available && ba.enoughCycles && ba.ranked.length > 0) {
    const byKey = new Map(ba.items.map((i) => [i.key, i]))
    const rankedItems = ba.ranked.map((k) => byKey.get(k)!)
    const rising = rankedItems.filter(
      (i) =>
        i.difference !== null &&
        i.difference >= NOTABLE_MOOD_DIFFERENCE &&
        i.cyclesCompared > 0 &&
        i.cyclesHigherBefore / i.cyclesCompared >= MIN_SHARE_OF_CYCLES_HIGHER,
    )
    const top = rising[0]
    if (top && top.premenstrualMean !== null && top.postmenstrualMean !== null && top.difference !== null) {
      out.push({
        type: 'premenstrual-rise',
        item: top.key,
        label: top.label,
        premenstrualMean: top.premenstrualMean,
        postmenstrualMean: top.postmenstrualMean,
        difference: top.difference,
        percentChange: top.percentChange,
        cycles: ba.cyclesCompared,
        cyclesHigherBefore: top.cyclesHigherBefore,
        itemsRising: rising.length,
      })
    } else {
      const largest = rankedItems[0].difference as number
      // Only call it "similar" when nothing reached the threshold at all; a
      // big but inconsistent rise gets no mood highlight either way.
      if (largest < NOTABLE_MOOD_DIFFERENCE) {
        out.push({ type: 'similar-before-and-after', cycles: ba.cyclesCompared, largestDifference: largest })
      }
    }
  }

  const L = cycles.lengths
  if (L.available && L.typical !== null && L.count >= MIN_SAMPLES_FOR_TYPICAL_HIGHLIGHT) {
    out.push({ type: 'typical-cycle', days: L.typical, cycles: L.count })
  }

  const R = cycles.regularity
  if (R.available && R.label !== null && R.spreadDays !== null) {
    out.push({ type: 'cycle-regularity', label: R.label, spreadDays: R.spreadDays, cycles: R.cyclesUsed })
  }

  if (body.byPhase.available) {
    let best: Extract<Highlight, { type: 'phase-symptom' }> | null = null
    for (const p of body.byPhase.phases) {
      const s = p.topSymptoms[0]
      if (!s || s.share === null) continue
      if (p.daysLogged < MIN_PHASE_DAYS_FOR_SYMPTOM_HIGHLIGHT || s.count < MIN_SYMPTOM_COUNT_FOR_HIGHLIGHT) continue
      if (best === null || s.share > best.share) {
        best = { type: 'phase-symptom', phase: p.phase, symptom: s.key, label: s.label, count: s.count, share: s.share, phaseDays: p.daysLogged }
      }
    }
    if (best) out.push(best)
  }

  const S = habits.longestStreak
  if (S.days >= MIN_STREAK_FOR_HIGHLIGHT && S.start !== null && S.end !== null) {
    out.push({ type: 'longest-streak', days: S.days, isCurrent: S.isCurrent, start: S.start, end: S.end })
  }

  const P = cycles.periodLengths
  if (P.available && P.typical !== null && P.completedPeriods >= MIN_SAMPLES_FOR_TYPICAL_HIGHLIGHT) {
    out.push({ type: 'typical-period', days: P.typical, periods: P.completedPeriods })
  }

  const C = habits.coverage
  if (C.share !== null && C.daysPossible >= MIN_DAYS_FOR_COVERAGE_HIGHLIGHT && C.share >= MIN_COVERAGE_SHARE_FOR_HIGHLIGHT) {
    out.push({ type: 'coverage', share: C.share, daysLogged: C.daysLogged, daysPossible: C.daysPossible })
  }

  return out
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function cycleStats(logs: DayLog[], today: ISODate, settings: Settings): CycleStats {
  const dated = logs.filter((l) => isISODate(l.date))
  const known = dated.filter((l) => l.date <= today)
  const futureEntriesIgnored = new Set(dated.filter((l) => l.date > today).map((l) => l.date)).size

  const days = cleanDays(known)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const latestLog = days.length ? days[days.length - 1].date : null
  const periods = findPeriods(known)

  const base: UnavailableReason | null = days.length === 0 ? 'no-logs' : periods.length === 0 ? 'no-period-logged' : null

  // Phase of every logged day (same estimate the calendar shows).
  const byPhase = new Map<Phase, CleanDay[]>(PHASE_ORDER.map((p) => [p, []]))
  const unknownPhase: CleanDay[] = []
  for (const d of days) {
    const phase = periods.length ? phaseOn(known, d.date, settings, today) : null
    if (phase) byPhase.get(phase)!.push(d)
    else unknownPhase.push(d)
  }

  const cycles = cycleNumbers(periods, latestLog)
  const habits = loggingHabits(days, today, futureEntriesIgnored)
  const totals = moodTotals(days)
  const mood = moodByPhase(byPhase, unknownPhase, base, totals)
  const ba = beforeAfter(periods, byDate, base, totals)
  const body = bodyStats(days, byPhase, unknownPhase.length, base)

  return {
    today,
    sufficiency: {
      hasLogs: days.length > 0,
      hasPeriod: periods.length > 0,
      hasCycleLengths: cycles.lengths.available,
      cyclesNeededForLengths: cycles.lengths.cyclesNeeded,
      hasRegularity: cycles.regularity.available,
      cyclesNeededForRegularity: cycles.regularity.cyclesNeeded,
      hasCompletedPeriod: cycles.periodLengths.available,
      hasPhaseData: mood.available,
      hasMoodRatings: totals.daysRated > 0,
      hasComparison: ba.available,
      hasComparisonPattern: ba.available && ba.enoughCycles,
      comparisonCyclesNeeded: ba.cyclesNeeded,
    },
    cycles,
    habits,
    moodTotals: totals,
    moodByPhase: mood,
    beforeAfter: ba,
    body,
    highlights: highlights(cycles, habits, ba, body),
  }
}
