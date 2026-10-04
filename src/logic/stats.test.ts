import { describe, expect, it } from 'vitest'
import { BASIC_MOOD_KEYS, MOOD_ITEMS } from '../types'
import type { DayLog, Flow, ISODate, MoodKey, PhysicalKey, Rating, Settings } from '../types'
import { MAX_PLAUSIBLE_CYCLE_DAYS, RECENT_CYCLES_USED } from './cycle'
import { addDays, diffDays } from './dates'
import {
  MIN_COVERAGE_SHARE_FOR_HIGHLIGHT,
  MIN_CYCLES_FOR_PATTERN,
  MIN_CYCLES_FOR_REGULARITY,
  MIN_DAYS_FOR_COVERAGE_HIGHLIGHT,
  MIN_LOGGED_DAYS_PER_WINDOW,
  MIN_PHASE_DAYS,
  MIN_STREAK_FOR_HIGHLIGHT,
  NOTABLE_MOOD_DIFFERENCE,
  PHASE_ORDER,
  POSTMENSTRUAL_WINDOW,
  PREMENSTRUAL_WINDOW,
  REGULAR_MAX_SPREAD_DAYS,
  SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS,
  cycleStats,
} from './stats'
import type { BeforeAfterComparison, CycleStats, Highlight } from './stats'

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const SETTINGS: Settings = {
  reminderTime: '20:00',
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  startedOn: '2025-01-01',
  moodTracking: 'advanced',
}

const MOODS = Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, 2 as Rating])) as Record<MoodKey, Rating>

function day(date: ISODate, flow: Flow = 'none', extra: Partial<DayLog> = {}): DayLog {
  return {
    date,
    flow,
    moods: { ...MOODS },
    physical: [],
    sleep: 'ok',
    energy: 'ok',
    cravings: 'none',
    loggedAt: 0,
    backfilled: false,
    ...extra,
  }
}

function bleed(start: ISODate, n: number, flow: Flow = 'medium'): DayLog[] {
  return Array.from({ length: n }, (_, i) => day(addDays(start, i), flow))
}

function startsFrom(first: ISODate, gaps: number[]): ISODate[] {
  const out = [first]
  for (const g of gaps) out.push(addDays(out[out.length - 1], g))
  return out
}

/** A log every day from `from` to `until` inclusive; `periodLen` medium days from each start. */
function dailyLogs(
  from: ISODate,
  until: ISODate,
  starts: ISODate[],
  periodLen = 5,
  decorate?: (l: DayLog) => void,
): DayLog[] {
  const logs: DayLog[] = []
  for (let d = from; d <= until; d = addDays(d, 1)) {
    const inPeriod = starts.some((s) => d >= s && diffDays(s, d) < periodLen)
    const l = day(d, inPeriod ? 'medium' : 'none')
    decorate?.(l)
    logs.push(l)
  }
  return logs
}

/** Period-only logs (just the bleeding days). */
function periodOnly(starts: ISODate[], len = 5): DayLog[] {
  return starts.flatMap((s) => bleed(s, len))
}

function scramble<T>(xs: T[]): T[] {
  const r = [...xs].reverse()
  return [...r.filter((_, i) => i % 2 === 0), ...r.filter((_, i) => i % 2 === 1)]
}

/** Where a date sits relative to the before/after windows of any period start. */
function relation(d: ISODate, starts: ISODate[]): 'pre' | 'post' | 'other' {
  for (const s of starts) {
    const o = diffDays(s, d)
    if (o >= PREMENSTRUAL_WINDOW.firstOffset && o <= PREMENSTRUAL_WINDOW.lastOffset) return 'pre'
    if (o >= POSTMENSTRUAL_WINDOW.firstOffset && o <= POSTMENSTRUAL_WINDOW.lastOffset) return 'post'
  }
  return 'other'
}

/**
 * Planted pattern. Irritability: 5 before / 2 after / 6 elsewhere (so an
 * off-by-one window would change the means). Sadness: 3 / 1 / 4. Others 2.
 * Cramps on period days 1–2.
 */
const plant = (starts: ISODate[]) => (l: DayLog) => {
  const r = relation(l.date, starts)
  l.moods.irritability = r === 'pre' ? 5 : r === 'post' ? 2 : 6
  l.moods.sadness = r === 'pre' ? 3 : r === 'post' ? 1 : 4
  if (starts.some((s) => diffDays(s, l.date) === 0 || diffDays(s, l.date) === 1)) l.physical = ['cramps']
}

/** Every number in the result is finite; returns offending paths. */
function badNumbers(v: unknown, path = 'stats'): string[] {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [path]
  if (Array.isArray(v)) return v.flatMap((x, i) => badNumbers(x, `${path}[${i}]`))
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => badNumbers(x, `${path}.${k}`))
  return []
}

/** Every object with `available` has reason === null exactly when available. */
function availabilityMismatches(v: unknown, path = 'stats'): string[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => availabilityMismatches(x, `${path}[${i}]`))
  if (!v || typeof v !== 'object') return []
  const o = v as Record<string, unknown>
  const own = 'available' in o && (o.available === true) !== (o.reason === null) ? [path] : []
  return [...own, ...Object.entries(o).flatMap(([k, x]) => availabilityMismatches(x, `${path}.${k}`))]
}

function expectSane(s: CycleStats) {
  expect(badNumbers(s)).toEqual([])
  expect(availabilityMismatches(s)).toEqual([])
  expect(JSON.parse(JSON.stringify(s))).toEqual(s) // plain data, serialisable
}

const item = (s: { beforeAfter: BeforeAfterComparison }, key: MoodKey) => s.beforeAfter.items.find((i) => i.key === key)!
const phaseMood = (s: CycleStats, phase: string) => s.moodByPhase.phases.find((p) => p.phase === phase)!
const hl = <T extends Highlight['type']>(s: CycleStats, type: T) =>
  s.highlights.find((h) => h.type === type) as Extract<Highlight, { type: T }> | undefined

// Planted regular dataset used in several tests.
const P_STARTS = startsFrom('2026-05-04', [28, 28, 28, 28]) // ..., 2026-08-24
const P_TODAY = '2026-09-10'
const P_LOGS = dailyLogs('2026-05-04', P_TODAY, P_STARTS, 5, plant(P_STARTS))

/** Each planted entry rates every current mood: irritability and sadness as planted, the rest 2. */
const N_MOODS = MOOD_ITEMS.length
/** The daily average across all moods in a premenstrual / postmenstrual window of the planted data. */
const P_PRE_MEAN = (5 + 3 + 2 * (N_MOODS - 2)) / N_MOODS
const P_POST_MEAN = (2 + 1 + 2 * (N_MOODS - 2)) / N_MOODS

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('have the documented values', () => {
    expect(PREMENSTRUAL_WINDOW).toEqual({ firstOffset: -7, lastOffset: -1 })
    expect(POSTMENSTRUAL_WINDOW).toEqual({ firstOffset: 3, lastOffset: 9 })
    expect(MIN_LOGGED_DAYS_PER_WINDOW).toBe(4)
    expect(MIN_CYCLES_FOR_PATTERN).toBe(2)
    expect(MIN_CYCLES_FOR_REGULARITY).toBe(3)
    expect(REGULAR_MAX_SPREAD_DAYS).toBe(7)
    expect(SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS).toBe(13)
    expect(MIN_PHASE_DAYS).toBe(3)
    expect(PHASE_ORDER).toEqual(['menstrual', 'follicular', 'ovulation', 'luteal'])
  })
})

// ---------------------------------------------------------------------------
// Empty / tiny data
// ---------------------------------------------------------------------------

describe('empty and tiny data', () => {
  it('zero logs: everything unavailable with reason no-logs, no highlights', () => {
    const s = cycleStats([], '2026-10-03', SETTINGS)
    expectSane(s)
    expect(s.sufficiency).toEqual({
      hasLogs: false,
      hasPeriod: false,
      hasCycleLengths: false,
      cyclesNeededForLengths: 1,
      hasRegularity: false,
      cyclesNeededForRegularity: 3,
      hasCompletedPeriod: false,
      hasPhaseData: false,
      hasMoodRatings: false,
      hasComparison: false,
      hasComparisonPattern: false,
      comparisonCyclesNeeded: 2,
    })
    expect(s.cycles.lengths.reason).toBe('no-logs')
    expect(s.cycles.regularity.reason).toBe('no-logs')
    expect(s.cycles.periodLengths.reason).toBe('no-logs')
    expect(s.moodByPhase.reason).toBe('no-logs')
    expect(s.beforeAfter.reason).toBe('no-logs')
    expect(s.body.byPhase.reason).toBe('no-logs')
    expect(s.cycles.lengths.typical).toBeNull()
    expect(s.habits).toEqual({
      daysLogged: 0,
      firstLogDate: null,
      lastLogDate: null,
      loggedToday: false,
      coverage: { daysLogged: 0, daysPossible: 0, share: null, through: '2026-10-02' },
      currentStreak: 0,
      longestStreak: { days: 0, start: null, end: null, isCurrent: false },
      backfilledEntries: 0,
      futureEntriesIgnored: 0,
    })
    expect(s.moodByPhase.phases.map((p) => p.phase)).toEqual(PHASE_ORDER)
    expect(s.moodByPhase.phases.every((p) => p.overallMean === null && p.items.every((i) => i.mean === null))).toBe(true)
    expect(s.beforeAfter.items.every((i) => i.difference === null && i.percentChange === null)).toBe(true)
    expect(s.beforeAfter.ranked).toEqual([])
    expect(s.body.overall.topSymptoms).toEqual([])
    expect(s.body.overall.symptoms.every((x) => x.share === null)).toBe(true)
    expect(s.highlights).toEqual([])
  })

  it('a single log today (no bleeding)', () => {
    const s = cycleStats([day('2026-10-03')], '2026-10-03', SETTINGS)
    expectSane(s)
    expect(s.habits.daysLogged).toBe(1)
    expect(s.habits.loggedToday).toBe(true)
    expect(s.habits.currentStreak).toBe(1)
    expect(s.habits.coverage).toEqual({ daysLogged: 0, daysPossible: 0, share: null, through: '2026-10-02' })
    expect(s.cycles.periodsLogged).toBe(0)
    expect(s.cycles.lengths.reason).toBe('no-period-logged')
    expect(s.moodByPhase.reason).toBe('no-period-logged')
    expect(s.moodByPhase.unknownPhaseDays).toBe(1)
    expect(s.beforeAfter.reason).toBe('no-period-logged')
    expect(s.body.overall.daysLogged).toBe(1)
    expect(s.body.overall.sleep).toEqual({ poor: 0, ok: 1, good: 0 })
    expect(s.highlights).toEqual([])
  })

  it('a single log yesterday counts as full coverage and a running streak', () => {
    const s = cycleStats([day('2026-10-02')], '2026-10-03', SETTINGS)
    expect(s.habits.coverage).toEqual({ daysLogged: 1, daysPossible: 1, share: 1, through: '2026-10-02' })
    expect(s.habits.currentStreak).toBe(1)
    expect(s.habits.longestStreak).toEqual({ days: 1, start: '2026-10-02', end: '2026-10-02', isCurrent: true })
  })

  it('one period: period length known, cycle length not yet', () => {
    const logs = dailyLogs('2026-09-10', '2026-10-03', ['2026-09-15'])
    const s = cycleStats(logs, '2026-10-03', SETTINGS)
    expectSane(s)
    expect(s.cycles.periodsLogged).toBe(1)
    expect(s.cycles.lastPeriodStart).toBe('2026-09-15')
    expect(s.cycles.lengths).toMatchObject({ available: false, reason: 'no-completed-cycle', count: 0, cyclesNeeded: 1, history: [] })
    expect(s.cycles.regularity).toMatchObject({ available: false, reason: 'no-completed-cycle', cyclesNeeded: 3 })
    expect(s.cycles.periodLengths).toMatchObject({ available: true, completedPeriods: 1, typical: 5, shortest: 5, longest: 5 })
    expect(s.moodByPhase.available).toBe(true)
    expect(s.moodByPhase.unknownPhaseDays).toBe(5) // 09-10..09-14
    // Pre-window 09-08..09-14 has 5 logged days, post 09-18..09-24 has 7.
    expect(s.beforeAfter.pairs).toEqual([
      {
        periodStart: '2026-09-15',
        premenstrual: { from: '2026-09-08', to: '2026-09-14', daysLogged: 5, mean: 2 },
        postmenstrual: { from: '2026-09-18', to: '2026-09-24', daysLogged: 7, mean: 2 },
        contributes: true,
        difference: 0,
      },
    ])
    expect(s.beforeAfter).toMatchObject({ available: true, cyclesCompared: 1, enoughCycles: false, cyclesNeeded: 1 })
    expect(s.sufficiency.hasComparisonPattern).toBe(false)
    // One compared cycle is never enough for a mood highlight.
    expect(hl(s, 'similar-before-and-after')).toBeUndefined()
  })

  it('an ongoing first period is not a completed period', () => {
    const s = cycleStats(bleed('2026-10-01', 3), '2026-10-03', SETTINGS)
    expect(s.cycles.periodLengths).toMatchObject({ available: false, reason: 'no-completed-period', completedPeriods: 0 })
    expect(s.sufficiency.hasCompletedPeriod).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Planted premenstrual pattern
// ---------------------------------------------------------------------------

describe('before vs after the period (planted pattern)', () => {
  const s = cycleStats(P_LOGS, P_TODAY, SETTINGS)

  it('is sane', () => expectSane(s))

  it('lists every period start; the first has no logs before it', () => {
    expect(s.beforeAfter.pairs.map((p) => p.periodStart)).toEqual(P_STARTS)
    expect(s.beforeAfter.pairs[0]).toMatchObject({ contributes: false, difference: null })
    expect(s.beforeAfter.pairs[0].premenstrual.daysLogged).toBe(0)
    expect(s.beforeAfter.pairs[0].postmenstrual.daysLogged).toBe(7)
    expect(s.beforeAfter.pairs.slice(1).every((p) => p.contributes)).toBe(true)
    const [pre, post] = [s.beforeAfter.pairs[1].premenstrual, s.beforeAfter.pairs[1].postmenstrual]
    expect(pre).toMatchObject({ from: '2026-05-25', to: '2026-05-31', daysLogged: 7 })
    expect(pre.mean).toBeCloseTo(P_PRE_MEAN)
    expect(post).toMatchObject({ from: '2026-06-04', to: '2026-06-10', daysLogged: 7 })
    expect(post.mean).toBeCloseTo(P_POST_MEAN)
    expect(s.beforeAfter).toMatchObject({ available: true, reason: null, cyclesCompared: 4, enoughCycles: true, cyclesNeeded: 0 })
  })

  it('finds the planted rise with the right magnitudes', () => {
    const irr = item(s, 'irritability')
    expect(irr.premenstrualMean).toBeCloseTo(5)
    expect(irr.postmenstrualMean).toBeCloseTo(2)
    expect(irr.difference).toBeCloseTo(3)
    expect(irr.percentChange).toBeCloseTo(150)
    expect(irr.shareOfScale).toBeCloseTo(0.6)
    expect(irr.premenstrualDays).toBe(28)
    expect(irr.postmenstrualDays).toBe(28)
    expect(irr).toMatchObject({ cyclesCompared: 4, cyclesHigherBefore: 4, label: 'Irritable / angry' })

    const sad = item(s, 'sadness')
    expect(sad.difference).toBeCloseTo(2)
    expect(sad.percentChange).toBeCloseTo(200)

    const flat = item(s, 'anxiety')
    expect(flat.difference).toBe(0)
    expect(flat.percentChange).toBe(0)
    expect(flat.cyclesHigherBefore).toBe(0)

    // The two planted rises first, then every flat mood (difference 0) in MOOD_ITEMS order.
    expect(s.beforeAfter.ranked).toEqual([
      'irritability',
      'sadness',
      ...MOOD_ITEMS.map((m) => m.key).filter((k) => k !== 'irritability' && k !== 'sadness'),
    ])
    expect(s.beforeAfter.ranked).toHaveLength(N_MOODS)
    expect(s.beforeAfter.overall.premenstrualMean).toBeCloseTo(P_PRE_MEAN)
    expect(s.beforeAfter.overall.postmenstrualMean).toBeCloseTo(P_POST_MEAN)
    // (5 − 2) + (3 − 1) rating points spread over every mood of the day.
    expect(s.beforeAfter.overall.difference).toBeCloseTo(5 / N_MOODS)
    expect(s.beforeAfter.overall.cyclesHigherBefore).toBe(4)
  })

  it('leads the highlights with the rise, in the documented order', () => {
    expect(s.highlights.map((h) => h.type)).toEqual([
      'premenstrual-rise',
      'typical-cycle',
      'cycle-regularity',
      'phase-symptom',
      'longest-streak',
      'typical-period',
      'coverage',
    ])
    const rise = hl(s, 'premenstrual-rise')!
    expect(rise).toMatchObject({ item: 'irritability', cycles: 4, cyclesHigherBefore: 4, itemsRising: 2 })
    expect(rise.difference).toBeCloseTo(3)
    expect(hl(s, 'typical-cycle')).toEqual({ type: 'typical-cycle', days: 28, cycles: 4 })
    expect(hl(s, 'cycle-regularity')).toEqual({ type: 'cycle-regularity', label: 'regular', spreadDays: 0, cycles: 4 })
    expect(hl(s, 'phase-symptom')).toEqual({
      type: 'phase-symptom',
      phase: 'menstrual',
      symptom: 'cramps',
      label: 'Cramps',
      count: 10,
      share: 0.4,
      phaseDays: 25,
    })
    expect(hl(s, 'longest-streak')).toEqual({
      type: 'longest-streak',
      days: 130,
      isCurrent: true,
      start: '2026-05-04',
      end: P_TODAY,
    })
    expect(hl(s, 'typical-period')).toEqual({ type: 'typical-period', days: 5, periods: 5 })
    expect(hl(s, 'coverage')).toEqual({ type: 'coverage', share: 1, daysLogged: 129, daysPossible: 129 })
  })

  it('mood by phase shows the luteal phase higher than the follicular phase', () => {
    const lut = phaseMood(s, 'luteal').items.find((i) => i.key === 'irritability')!.mean!
    const fol = phaseMood(s, 'follicular').items.find((i) => i.key === 'irritability')!.mean!
    expect(lut).toBeGreaterThan(fol)
  })

  it('still finds the pattern with missed days, and never treats a gap as a zero', () => {
    // Miss every third non-bleeding day (period days stay logged so the starts don't move).
    const gappy = P_LOGS.filter((l, i) => l.flow !== 'none' || i % 3 !== 1)
    const g = cycleStats(gappy, P_TODAY, SETTINGS)
    expectSane(g)
    const loggedIn = (rel: 'pre' | 'post') => gappy.filter((l) => relation(l.date, P_STARTS) === rel).length
    const irr = item(g, 'irritability')
    expect(irr.premenstrualMean).toBeCloseTo(5)
    expect(irr.postmenstrualMean).toBeCloseTo(2)
    expect(irr.difference).toBeCloseTo(3)
    // Every contributing pair has >= 4 of 7 days here, so pooled counts equal all logged window days
    // from the second period start on (the first start's pre-window is empty).
    expect(g.beforeAfter.pairs.slice(1).every((p) => p.contributes)).toBe(true)
    expect(irr.premenstrualDays).toBe(g.beforeAfter.pairs.reduce((n, p) => n + (p.contributes ? p.premenstrual.daysLogged : 0), 0))
    expect(irr.premenstrualDays).toBe(loggedIn('pre'))
    expect(irr.premenstrualDays).toBeLessThan(28)
    // The first start's post window is logged but its pair doesn't contribute.
    const firstPost = g.beforeAfter.pairs[0].postmenstrual.daysLogged
    expect(irr.postmenstrualDays).toBe(loggedIn('post') - firstPost)
    expect(g.habits.coverage.share).toBeLessThan(1)
  })

  it('ignores future-dated logs', () => {
    const future = [
      ...bleed('2026-09-15', 6, 'heavy'),
      day('2026-09-12', 'none', { moods: { ...MOODS, irritability: 6, sadness: 6 }, physical: ['nausea'] }),
    ]
    const withFuture = cycleStats([...P_LOGS, ...future], P_TODAY, SETTINGS)
    const without = cycleStats(P_LOGS, P_TODAY, SETTINGS)
    expect(withFuture.habits.futureEntriesIgnored).toBe(7)
    expect({ ...withFuture, habits: { ...withFuture.habits, futureEntriesIgnored: 0 } }).toEqual(without)
  })

  it('does not depend on input order', () => {
    expect(cycleStats(scramble(P_LOGS), P_TODAY, SETTINGS)).toEqual(s)
  })

  it('does not mutate its input', () => {
    const logs = scramble(P_LOGS)
    const copy = JSON.parse(JSON.stringify(logs))
    cycleStats(logs, P_TODAY, SETTINGS)
    expect(logs).toEqual(copy)
  })
})

describe('mood highlights need a consistent pattern over enough cycles', () => {
  const starts = startsFrom('2026-05-04', [28, 28, 28])
  const today = '2026-08-15' // after the last start's post window

  it('flat moods over 2+ cycles: "similar before and after"', () => {
    const s = cycleStats(dailyLogs('2026-04-20', today, starts), today, SETTINGS)
    expect(s.beforeAfter.cyclesCompared).toBe(4)
    expect(hl(s, 'premenstrual-rise')).toBeUndefined()
    expect(hl(s, 'similar-before-and-after')).toEqual({ type: 'similar-before-and-after', cycles: 4, largestDifference: 0 })
  })

  it('a big rise in only one of three cycles is not reported as a rise (nor as similar)', () => {
    const logs = dailyLogs('2026-05-04', today, starts, 5, (l) => {
      if (relation(l.date, [starts[1]]) === 'pre') l.moods.irritability = 6
    })
    const s = cycleStats(logs, today, SETTINGS)
    expect(s.beforeAfter.cyclesCompared).toBe(3)
    const irr = item(s, 'irritability')
    expect(irr.difference).toBeCloseTo(70 / 21 - 2)
    expect(irr.difference!).toBeGreaterThan(NOTABLE_MOOD_DIFFERENCE)
    expect(irr).toMatchObject({ cyclesCompared: 3, cyclesHigherBefore: 1 })
    expect(hl(s, 'premenstrual-rise')).toBeUndefined()
    expect(hl(s, 'similar-before-and-after')).toBeUndefined()
  })

  it('one compared cycle: numbers shown, flagged, no mood highlight; two: highlight', () => {
    const two = startsFrom('2026-06-01', [28])
    const one = cycleStats(dailyLogs('2026-05-25', '2026-06-20', two.slice(0, 1), 5, plant(two)), '2026-06-20', SETTINGS)
    expect(one.beforeAfter).toMatchObject({ available: true, cyclesCompared: 1, enoughCycles: false, cyclesNeeded: 1 })
    expect(item(one, 'irritability').difference).toBeCloseTo(3)
    expect(hl(one, 'premenstrual-rise')).toBeUndefined()

    const both = cycleStats(dailyLogs('2026-05-25', '2026-07-15', two, 5, plant(two)), '2026-07-15', SETTINGS)
    expect(both.beforeAfter).toMatchObject({ cyclesCompared: 2, enoughCycles: true, cyclesNeeded: 0 })
    expect(both.sufficiency.hasComparisonPattern).toBe(true)
    expect(hl(both, 'premenstrual-rise')).toMatchObject({ item: 'irritability', cycles: 2, cyclesHigherBefore: 2 })
  })
})

describe('window day threshold (exact edges)', () => {
  const S = '2026-06-15'
  const build = (pre: number, post: number) => [
    ...Array.from({ length: pre }, (_, i) => day(addDays(S, PREMENSTRUAL_WINDOW.firstOffset + i))),
    ...bleed(S, 3),
    ...Array.from({ length: post }, (_, i) => day(addDays(S, POSTMENSTRUAL_WINDOW.firstOffset + i))),
  ]
  const run = (pre: number, post: number) => cycleStats(build(pre, post), '2026-07-01', SETTINGS).beforeAfter

  it(`${MIN_LOGGED_DAYS_PER_WINDOW} days on both sides is enough`, () => {
    const ba = run(4, 4)
    expect(ba.pairs[0]).toMatchObject({ contributes: true, difference: 0 })
    expect(ba).toMatchObject({ available: true, reason: null, cyclesCompared: 1 })
    expect(item({ beforeAfter: ba }, 'anxiety')).toMatchObject({ premenstrualDays: 4, postmenstrualDays: 4, difference: 0 })
  })

  it('one day fewer on either side is not', () => {
    for (const [pre, post] of [
      [3, 4],
      [4, 3],
      [3, 3],
    ]) {
      const ba = run(pre, post)
      expect(ba.pairs[0].contributes).toBe(false)
      expect(ba.pairs[0].difference).toBeNull()
      expect(ba).toMatchObject({ available: false, reason: 'not-enough-window-days', cyclesCompared: 0, cyclesNeeded: 2 })
      expect(ba.items.every((i) => i.difference === null && i.premenstrualDays === 0)).toBe(true)
      expect(ba.overall.difference).toBeNull()
    }
  })

  it('days just outside the windows are not counted', () => {
    const logs = [
      day(addDays(S, -8), 'none', { moods: { ...MOODS, anxiety: 6 } }), // before the pre window
      ...build(4, 4),
      day(addDays(S, 10), 'none', { moods: { ...MOODS, anxiety: 6 } }), // after the post window
    ]
    const ba = cycleStats(logs, '2026-07-01', SETTINGS).beforeAfter
    expect(item({ beforeAfter: ba }, 'anxiety')).toMatchObject({ premenstrualMean: 2, postmenstrualMean: 2 })
  })
})

// ---------------------------------------------------------------------------
// Mood by phase
// ---------------------------------------------------------------------------

describe('mood by phase', () => {
  it('groups by the estimated phase (28-day cycles, 5-day periods)', () => {
    // Anxiety by cycle day: 1–5 → 1, 6–12 → 2, 13–15 → 3, 16+ → 4 (matches the phase rules).
    const byCycleDay = (l: DayLog) => {
      const start = [...P_STARTS].reverse().find((s) => s <= l.date)
      if (!start) return
      const cd = diffDays(start, l.date) + 1
      l.moods.anxiety = (cd <= 5 ? 1 : cd <= 12 ? 2 : cd <= 15 ? 3 : 4) as Rating
    }
    const logs = dailyLogs('2026-05-01', P_TODAY, P_STARTS, 5, byCycleDay)
    const s = cycleStats(logs, P_TODAY, SETTINGS)
    expectSane(s)
    expect(s.moodByPhase.unknownPhaseDays).toBe(3)
    expect(s.moodByPhase.phases.map((p) => p.daysLogged)).toEqual([25, 35, 15, 55])
    expect(s.moodByPhase.phases.map((p) => p.items.find((i) => i.key === 'anxiety')!.mean)).toEqual([1, 2, 3, 4])
    expect(phaseMood(s, 'luteal').items.find((i) => i.key === 'anxiety')!.days).toBe(55)
    // Anxiety 1, every other mood 2.
    expect(phaseMood(s, 'menstrual').overallMean).toBeCloseTo((1 + (N_MOODS - 1) * 2) / N_MOODS)
    expect(s.body.byPhase.unknownPhaseDays).toBe(3)
    expect(s.body.byPhase.phases.map((p) => p.daysLogged)).toEqual([25, 35, 15, 55])
  })

  it('only days before the first period: no phase data', () => {
    const logs = [day('2026-09-01'), day('2026-09-02'), ...bleed('2026-10-10', 3)] // bleed is in the future
    const s = cycleStats(logs, '2026-10-03', SETTINGS)
    expect(s.moodByPhase.reason).toBe('no-period-logged')
    const s2 = cycleStats([day('2026-09-01'), ...bleed('2026-10-01', 3)], '2026-10-03', SETTINGS)
    expect(s2.moodByPhase.unknownPhaseDays).toBe(1)
    expect(s2.moodByPhase.available).toBe(true)
  })

  it(`enoughData flips at ${MIN_PHASE_DAYS} logged days`, () => {
    const three = cycleStats([...bleed('2026-09-01', 3), day('2026-09-04')], '2026-10-03', SETTINGS)
    expect(phaseMood(three, 'menstrual')).toMatchObject({ daysLogged: 3, enoughData: true })
    expect(phaseMood(three, 'follicular')).toMatchObject({ daysLogged: 1, enoughData: false })
    const two = cycleStats([...bleed('2026-09-01', 2), day('2026-09-03')], '2026-10-03', SETTINGS)
    expect(phaseMood(two, 'menstrual')).toMatchObject({ daysLogged: 2, enoughData: false })
    expect(two.body.byPhase.phases[0]).toMatchObject({ phase: 'menstrual', daysLogged: 2, enoughData: false })
  })

  it('skips invalid ratings per item, without dropping the day', () => {
    const bad = day('2026-09-06', 'none', {
      moods: { ...MOODS, anxiety: 0 as Rating, sadness: 7 as Rating, irritability: 2.5 as Rating, moodSwings: 6 },
    })
    delete (bad.moods as Partial<Record<MoodKey, Rating>>).concentration
    const s = cycleStats([...bleed('2026-09-01', 5), bad], '2026-10-03', SETTINGS)
    expectSane(s)
    const fol = phaseMood(s, 'follicular')
    expect(fol.daysLogged).toBe(1)
    const m = Object.fromEntries(fol.items.map((i) => [i.key, i]))
    expect(m.anxiety).toMatchObject({ mean: null, days: 0 })
    expect(m.sadness).toMatchObject({ mean: null, days: 0 })
    expect(m.irritability).toMatchObject({ mean: null, days: 0 })
    expect(m.concentration).toMatchObject({ mean: null, days: 0 })
    expect(m.moodSwings).toMatchObject({ mean: 6, days: 1 })
    // Four moods dropped (three invalid, one missing); moodSwings 6 and every other valid mood 2.
    const valid = N_MOODS - 4
    expect(valid).toBeGreaterThan(1)
    expect(fol.overallMean).toBeCloseTo((6 + 2 * (valid - 1)) / valid)
  })

  it('uses the latest save when a date appears twice', () => {
    const a = day('2026-09-06', 'none', { loggedAt: 100, moods: { ...MOODS, anxiety: 6 } })
    const b = day('2026-09-06', 'none', { loggedAt: 50, moods: { ...MOODS, anxiety: 1 } })
    for (const logs of [
      [...bleed('2026-09-01', 5), a, b],
      [...bleed('2026-09-01', 5), b, a],
    ]) {
      const s = cycleStats(logs, '2026-10-03', SETTINGS)
      expect(s.habits.daysLogged).toBe(6)
      expect(phaseMood(s, 'follicular').items.find((i) => i.key === 'anxiety')!.mean).toBe(6)
    }
  })
})

// ---------------------------------------------------------------------------
// Cycle numbers
// ---------------------------------------------------------------------------

describe('cycle numbers', () => {
  it('irregular cycles: history, median, shortest/longest, spread', () => {
    const starts = startsFrom('2026-01-03', [26, 32, 29, 35, 27])
    const s = cycleStats(dailyLogs('2026-01-01', '2026-07-20', starts), '2026-07-20', SETTINGS)
    expectSane(s)
    expect(s.cycles.periodsLogged).toBe(6)
    expect(s.cycles.lengths.history.map((c) => c.length)).toEqual([26, 32, 29, 35, 27])
    expect(s.cycles.lengths.history[0]).toEqual({ start: '2026-01-03', nextStart: '2026-01-29', length: 26, periodLength: 5 })
    expect(s.cycles.lengths).toMatchObject({ available: true, count: 5, typical: 29, shortest: 26, longest: 35, skippedGaps: 0, cyclesNeeded: 0 })
    expect(s.cycles.regularity).toMatchObject({ available: true, label: 'somewhat-irregular', spreadDays: 9, shortest: 26, longest: 35, cyclesUsed: 5 })
  })

  it('an even number of cycles gives an unrounded median', () => {
    const s = cycleStats(periodOnly(startsFrom('2026-01-01', [28, 29])), '2026-04-01', SETTINGS)
    expect(s.cycles.lengths.typical).toBe(28.5)
  })

  it('ignores an implausible gap (an unlogged period)', () => {
    const starts = startsFrom('2026-01-01', [30, 70, 30])
    expect(70).toBeGreaterThan(MAX_PLAUSIBLE_CYCLE_DAYS)
    const s = cycleStats(dailyLogs('2026-01-01', '2026-06-30', starts), '2026-06-30', SETTINGS)
    expect(s.cycles.periodsLogged).toBe(4)
    expect(s.cycles.lengths).toMatchObject({ count: 2, skippedGaps: 1, typical: 30, shortest: 30, longest: 30 })
    expect(s.cycles.lengths.history.map((c) => c.start)).toEqual([starts[0], starts[2]])
    expect(s.cycles.regularity).toMatchObject({ available: false, reason: 'not-enough-cycles', cyclesNeeded: 1 })
  })

  it('only an implausible gap: no completed cycle', () => {
    const s = cycleStats(periodOnly(startsFrom('2026-01-01', [75])), '2026-04-01', SETTINGS)
    expect(s.cycles.lengths).toMatchObject({ available: false, reason: 'no-completed-cycle', skippedGaps: 1, cyclesNeeded: 1 })
  })

  it(`regularity needs ${MIN_CYCLES_FOR_REGULARITY} cycles`, () => {
    const two = cycleStats(periodOnly(startsFrom('2026-01-01', [28, 28])), '2026-04-01', SETTINGS)
    expect(two.cycles.regularity).toMatchObject({ available: false, reason: 'not-enough-cycles', label: null, spreadDays: null, cyclesNeeded: 1, cyclesUsed: 0 })
    expect(hl(two, 'cycle-regularity')).toBeUndefined()
    const three = cycleStats(periodOnly(startsFrom('2026-01-01', [28, 28, 28])), '2026-05-01', SETTINGS)
    expect(three.cycles.regularity).toMatchObject({ available: true, label: 'regular', spreadDays: 0, cyclesNeeded: 0, cyclesUsed: 3 })
    expect(three.sufficiency).toMatchObject({ hasRegularity: true, cyclesNeededForRegularity: 0 })
  })

  it('regularity labels at their exact edges', () => {
    const label = (mid: number) =>
      cycleStats(periodOnly(startsFrom('2026-01-01', [28, mid, 28])), '2026-06-30', SETTINGS).cycles.regularity
    expect(label(28 + REGULAR_MAX_SPREAD_DAYS)).toMatchObject({ label: 'regular', spreadDays: 7 })
    expect(label(28 + REGULAR_MAX_SPREAD_DAYS + 1)).toMatchObject({ label: 'somewhat-irregular', spreadDays: 8 })
    expect(label(28 + SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS)).toMatchObject({ label: 'somewhat-irregular', spreadDays: 13 })
    expect(label(28 + SOMEWHAT_IRREGULAR_MAX_SPREAD_DAYS + 1)).toMatchObject({ label: 'irregular', spreadDays: 14 })
  })

  it(`regularity uses the most recent ${RECENT_CYCLES_USED} cycles; all-time numbers use all`, () => {
    const s = cycleStats(periodOnly(startsFrom('2025-06-01', [45, 28, 28, 28, 28, 28, 28])), '2026-03-01', SETTINGS)
    expect(s.cycles.lengths).toMatchObject({ count: 7, longest: 45, shortest: 28, typical: 28 })
    expect(s.cycles.regularity).toMatchObject({ label: 'regular', spreadDays: 0, cyclesUsed: 6 })
  })

  it('period lengths from completed periods only', () => {
    const logs = [
      ...dailyLogs('2026-01-01', '2026-01-31', ['2026-01-01'], 3),
      ...dailyLogs('2026-02-01', '2026-02-28', ['2026-02-01'], 4),
      ...dailyLogs('2026-03-01', '2026-03-31', ['2026-03-01'], 7),
      ...bleed('2026-04-01', 2), // ongoing
    ]
    const s = cycleStats(logs, '2026-04-02', SETTINGS)
    expect(s.cycles.periodLengths).toMatchObject({ completedPeriods: 3, typical: 4, shortest: 3, longest: 7 })
    expect(s.cycles.periodsLogged).toBe(4)
    expect(s.cycles.lengths.history.map((c) => c.periodLength)).toEqual([3, 4, 7])
  })
})

// ---------------------------------------------------------------------------
// Logging habits
// ---------------------------------------------------------------------------

describe('logging habits', () => {
  const range = (from: ISODate, to: ISODate) => {
    const out: DayLog[] = []
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(day(d))
    return out
  }

  it('streaks and coverage across a month boundary, today not yet logged', () => {
    const logs = [...range('2026-01-29', '2026-02-02'), ...range('2026-02-04', '2026-02-05')]
    const h = cycleStats(logs, '2026-02-06', SETTINGS).habits
    expect(h.currentStreak).toBe(2)
    expect(h.longestStreak).toEqual({ days: 5, start: '2026-01-29', end: '2026-02-02', isCurrent: false })
    expect(h.coverage).toEqual({ daysLogged: 7, daysPossible: 8, share: 7 / 8, through: '2026-02-05' })
    expect(h.firstLogDate).toBe('2026-01-29')
    expect(h.lastLogDate).toBe('2026-02-05')
    expect(h.loggedToday).toBe(false)
  })

  it('a streak over the new year, including today', () => {
    const h = cycleStats(range('2025-12-30', '2026-01-03'), '2026-01-03', SETTINGS).habits
    expect(h.currentStreak).toBe(5)
    expect(h.longestStreak).toEqual({ days: 5, start: '2025-12-30', end: '2026-01-03', isCurrent: true })
    // Today is logged but coverage stops at yesterday.
    expect(h.coverage).toEqual({ daysLogged: 4, daysPossible: 4, share: 1, through: '2026-01-02' })
  })

  it('leap day', () => {
    const h = cycleStats(range('2028-02-27', '2028-03-01'), '2028-03-02', SETTINGS).habits
    expect(h.currentStreak).toBe(4)
    expect(h.coverage).toMatchObject({ daysLogged: 4, daysPossible: 4 })
    const h2 = cycleStats(range('2026-02-27', '2026-03-01'), '2026-03-02', SETTINGS).habits
    expect(h2.currentStreak).toBe(3)
  })

  it('the streak is broken when neither today nor yesterday is logged', () => {
    const h = cycleStats(range('2026-09-20', '2026-10-01'), '2026-10-03', SETTINGS).habits
    expect(h.currentStreak).toBe(0)
    expect(h.longestStreak.days).toBe(12)
    expect(h.longestStreak.isCurrent).toBe(false)
  })

  it('a current streak tying the record is reported as current', () => {
    const logs = [...range('2026-09-01', '2026-09-03'), ...range('2026-10-01', '2026-10-03')]
    const h = cycleStats(logs, '2026-10-03', SETTINGS).habits
    expect(h.longestStreak).toEqual({ days: 3, start: '2026-10-01', end: '2026-10-03', isCurrent: true })
  })

  it('counts backfilled entries', () => {
    const logs = [day('2026-10-01', 'none', { backfilled: true }), day('2026-10-02'), day('2026-10-03', 'none', { backfilled: true })]
    expect(cycleStats(logs, '2026-10-03', SETTINGS).habits.backfilledEntries).toBe(2)
  })

  it(`longest-streak highlight needs ${MIN_STREAK_FOR_HIGHLIGHT} days`, () => {
    expect(hl(cycleStats(range('2026-10-02', '2026-10-03'), '2026-10-03', SETTINGS), 'longest-streak')).toBeUndefined()
    expect(hl(cycleStats(range('2026-10-01', '2026-10-03'), '2026-10-03', SETTINGS), 'longest-streak')).toMatchObject({
      days: 3,
      isCurrent: true,
    })
  })

  it('coverage highlight edges', () => {
    expect(MIN_DAYS_FOR_COVERAGE_HIGHLIGHT).toBe(14)
    expect(MIN_COVERAGE_SHARE_FOR_HIGHLIGHT).toBe(0.8)
    const today = '2026-10-03'
    // 15 possible days (09-18..10-02); drop `missing` of them (never the first, which anchors coverage).
    const withMissing = (missing: number) =>
      range('2026-09-18', '2026-10-02').filter((_, i) => i === 0 || i > missing)
    expect(hl(cycleStats(withMissing(3), today, SETTINGS), 'coverage')).toEqual({
      type: 'coverage',
      share: 0.8,
      daysLogged: 12,
      daysPossible: 15,
    })
    expect(hl(cycleStats(withMissing(4), today, SETTINGS), 'coverage')).toBeUndefined()
    // 13 possible days, all logged: too short a history for the highlight.
    expect(hl(cycleStats(range('2026-09-20', '2026-10-02'), today, SETTINGS), 'coverage')).toBeUndefined()
    expect(hl(cycleStats(range('2026-09-19', '2026-10-02'), today, SETTINGS), 'coverage')).toMatchObject({ daysPossible: 14 })
  })
})

// ---------------------------------------------------------------------------
// Body and lifestyle
// ---------------------------------------------------------------------------

describe('body and lifestyle', () => {
  it('counts symptoms and levels per phase and overall', () => {
    const sym = (date: ISODate, flow: Flow, physical: PhysicalKey[], extra: Partial<DayLog> = {}) =>
      day(date, flow, { physical, ...extra })
    const logs = [
      sym('2026-09-01', 'heavy', ['cramps', 'backache'], { sleep: 'poor', energy: 'low', cravings: 'strong' }),
      sym('2026-09-02', 'medium', ['cramps', 'cramps', 'notASymptom' as PhysicalKey], { sleep: 'poor' }),
      sym('2026-09-03', 'light', [], { sleep: 'good', cravings: 'some' }),
      sym('2026-09-06', 'none', ['headache']),
    ]
    const s = cycleStats(logs, '2026-10-03', SETTINGS)
    expectSane(s)
    const men = s.body.byPhase.phases[0]
    expect(men.phase).toBe('menstrual')
    expect(men.daysLogged).toBe(3)
    expect(men.symptoms.find((x) => x.key === 'cramps')).toEqual({ key: 'cramps', label: 'Cramps', count: 2, share: 2 / 3 })
    expect(men.topSymptoms.map((x) => x.key)).toEqual(['cramps', 'backache'])
    expect(men.sleep).toEqual({ poor: 2, ok: 0, good: 1 })
    expect(men.energy).toEqual({ low: 1, ok: 2, high: 0 })
    expect(men.cravings).toEqual({ none: 1, some: 1, strong: 1 })
    expect(s.body.overall.daysLogged).toBe(4)
    // Most frequent first; ties keep PHYSICAL_SYMPTOMS order (headache is listed before backache).
    expect(s.body.overall.topSymptoms.map((x) => [x.key, x.count])).toEqual([
      ['cramps', 2],
      ['headache', 1],
      ['backache', 1],
    ])
    expect(s.body.overall.symptoms).toHaveLength(8)
    // Empty phases have zero counts and null shares, never NaN.
    expect(s.body.byPhase.phases.find((p) => p.phase === 'ovulation')!.symptoms.every((x) => x.count === 0 && x.share === null)).toBe(true)
    // Too few days for a symptom highlight.
    expect(hl(s, 'phase-symptom')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Many months, no NaN anywhere
// ---------------------------------------------------------------------------

describe('robustness', () => {
  it('two years of irregular, gappy data with an unlogged period', () => {
    const gaps = [27, 31, 26, 33, 29, 28, 30, 64, 27, 29, 35, 24, 28, 30, 31, 27, 29, 26, 32, 28, 30]
    // The 64-day gap stands in for a period that was never logged.
    const starts = startsFrom('2024-10-05', gaps)
    const today = '2026-10-03'
    const logs = dailyLogs('2024-10-01', today, starts, 5, plant(starts)).filter((_, i) => i % 11 !== 4)
    const s = cycleStats(logs, today, SETTINGS)
    expectSane(s)
    expect(s.cycles.lengths.skippedGaps).toBeGreaterThanOrEqual(1)
    expect(s.cycles.lengths.history.every((c) => c.length <= MAX_PLAUSIBLE_CYCLE_DAYS)).toBe(true)
    expect(s.beforeAfter.enoughCycles).toBe(true)
    expect(s.beforeAfter.ranked[0]).toBe('irritability')
    expect(hl(s, 'premenstrual-rise')?.item).toBe('irritability')
    const totalPhaseDays = s.moodByPhase.phases.reduce((n, p) => n + p.daysLogged, 0)
    expect(totalPhaseDays + s.moodByPhase.unknownPhaseDays).toBe(s.habits.daysLogged)
  })

  it('every scenario is free of NaN/Infinity', () => {
    const scenarios: [DayLog[], ISODate][] = [
      [[], '2026-10-03'],
      [[day('2026-10-03')], '2026-10-03'],
      [[day('2026-10-04')], '2026-10-03'], // only a future log
      [bleed('2026-10-01', 3), '2026-10-03'],
      [periodOnly(startsFrom('2026-01-01', [75])), '2026-10-03'],
      [P_LOGS, P_TODAY],
      [P_LOGS, '2026-05-04'],
      [[day('not-a-date'), day('2026-10-01', 'heavy', { loggedAt: Number.NaN })], '2026-10-03'],
    ]
    for (const [logs, today] of scenarios) expectSane(cycleStats(logs, today, SETTINGS))
  })

  it('a log for a future date only', () => {
    const s = cycleStats([day('2026-10-04', 'heavy')], '2026-10-03', SETTINGS)
    expect(s.sufficiency.hasLogs).toBe(false)
    expect(s.habits.futureEntriesIgnored).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Mood tracking levels: a missing rating is "not recorded", never "not at all"
// ---------------------------------------------------------------------------

describe('mood tracking levels (mixed histories)', () => {
  // Periods every 28 days. Advanced (every mood) Jan–Mar, Basic (four moods, 1/3/5)
  // Apr–Jun, Off (no moods at all) Jul–Sep.
  const STARTS = startsFrom('2026-01-05', [28, 28, 28, 28, 28, 28, 28, 28, 28])
  const TODAY = '2026-09-30'
  const BASIC = BASIC_MOOD_KEYS
  const level = (d: ISODate) => (d < '2026-04-01' ? 'advanced' : d < '2026-07-01' ? 'basic' : 'off')

  const LOGS = dailyLogs('2026-01-01', TODAY, STARTS, 5, (l) => {
    const r = relation(l.date, STARTS)
    const lv = level(l.date)
    if (lv === 'off') {
      l.moods = {}
      return
    }
    // Irritability higher in the week before at both levels; overwhelmed a flat 4 (Advanced only).
    const moods: Partial<Record<MoodKey, Rating>> =
      lv === 'advanced'
        ? { ...MOODS, irritability: r === 'pre' ? 5 : r === 'post' ? 2 : 6, overwhelmed: 4 }
        : { moodSwings: 1, irritability: r === 'pre' ? 5 : r === 'post' ? 1 : 3, sadness: 3, anxiety: 1 }
    l.moods = moods
  })
  const advancedDays = LOGS.filter((l) => level(l.date) === 'advanced').length
  const basicDays = LOGS.filter((l) => level(l.date) === 'basic').length
  const s = cycleStats(LOGS, TODAY, SETTINGS)
  const total = (key: MoodKey) => s.moodTotals.items.find((i) => i.key === key)!

  it('stays sane (no NaN / Infinity, null for unavailable)', () => {
    expectSane(s)
    expect(advancedDays).toBe(90)
    expect(basicDays).toBe(91)
  })

  it('counts rated days per mood and overall, never the unrated ones', () => {
    expect(s.habits.daysLogged).toBe(LOGS.length)
    expect(s.sufficiency.hasMoodRatings).toBe(true)
    expect(s.moodTotals.daysRated).toBe(advancedDays + basicDays)
    for (const key of BASIC) expect(total(key).days).toBe(advancedDays + basicDays)
    for (const m of MOOD_ITEMS.filter((x) => !BASIC.includes(x.key))) expect(total(m.key).days).toBe(advancedDays)
  })

  it('means use only the days a mood was rated (a missing rating is never a 1)', () => {
    expect(total('overwhelmed').mean).toBe(4)
    expect(total('sensitivity').mean).toBe(2)
    expect(total('moodSwings').mean).toBeCloseTo((2 * advancedDays + 1 * basicDays) / (advancedDays + basicDays))
    for (const p of s.moodByPhase.phases) {
      const ow = p.items.find((i) => i.key === 'overwhelmed')!
      if (ow.days > 0) expect(ow.mean).toBe(4)
      // Phase day counts are rated days only.
      for (const it of p.items) expect(it.days).toBeLessThanOrEqual(p.daysLogged)
    }
    const rated = s.moodByPhase.phases.reduce((n, p) => n + p.daysLogged, 0) + s.moodByPhase.unknownPhaseDays
    expect(rated).toBe(advancedDays + basicDays)
  })

  it('before/after: off-level periods do not count, per-item days are rated days', () => {
    const ba = s.beforeAfter
    expect(ba.available).toBe(true)
    for (const p of ba.pairs.filter((x) => x.periodStart > '2026-07-08')) {
      expect(p.premenstrual.daysLogged).toBe(0)
      expect(p.contributes).toBe(false)
      expect(p.premenstrual.mean).toBeNull()
    }
    const ow = item(s, 'overwhelmed')
    const ms = item(s, 'moodSwings')
    expect(ow.premenstrualMean).toBe(4)
    expect(ow.postmenstrualMean).toBe(4)
    expect(ow.difference).toBe(0)
    expect(ms.premenstrualDays).toBeGreaterThan(ow.premenstrualDays)
    expect(ow.premenstrualDays + ow.postmenstrualDays).toBeGreaterThan(0)
    const irr = item(s, 'irritability')
    expect(irr.premenstrualMean).toBe(5)
    expect(irr.postmenstrualMean).toBeGreaterThanOrEqual(1)
    expect(irr.postmenstrualMean).toBeLessThanOrEqual(2)
    expect(ba.ranked[0]).toBe('irritability')
    expect(hl(s, 'premenstrual-rise')?.item).toBe('irritability')
  })

  it('the 4-rated-days rule counts days with at least one mood rating', () => {
    // A period whose week before was logged with moods off, and whose days 4–10 were rated.
    const start = '2026-03-02'
    const logs = dailyLogs('2026-01-26', '2026-03-20', ['2026-02-02', start], 5, (l) => {
      if (l.date >= '2026-02-23' && l.date < start) l.moods = {}
    })
    const r = cycleStats(logs, '2026-03-20', SETTINGS)
    expectSane(r)
    const pair = r.beforeAfter.pairs.find((p) => p.periodStart === start)!
    expect(pair.premenstrual.daysLogged).toBe(0)
    expect(pair.postmenstrual.daysLogged).toBe(7)
    expect(pair.contributes).toBe(false)
  })

  it('a history with no mood ratings at all: moods "not tracked", everything else works', () => {
    const offLogs = dailyLogs('2026-01-01', TODAY, STARTS, 5, (l) => {
      l.moods = {}
    })
    // A stored row may even lack the moods object (treated as nothing rated).
    const { moods: _m, ...noMoods } = day('2026-01-02')
    void _m
    offLogs[1] = noMoods as DayLog
    const r = cycleStats(offLogs, TODAY, { ...SETTINGS, moodTracking: 'off' })
    expectSane(r)
    expect(r.sufficiency.hasMoodRatings).toBe(false)
    expect(r.moodTotals.daysRated).toBe(0)
    for (const it of r.moodTotals.items) {
      expect(it.days).toBe(0)
      expect(it.mean).toBeNull()
    }
    expect(r.moodByPhase.reason).toBe('no-mood-ratings')
    expect(r.beforeAfter.reason).toBe('no-mood-ratings')
    expect(r.beforeAfter.overall.premenstrualMean).toBeNull()
    expect(hl(r, 'premenstrual-rise')).toBeUndefined()
    expect(hl(r, 'similar-before-and-after')).toBeUndefined()
    // Cycles, body and habits are unaffected.
    expect(r.cycles.lengths.available).toBe(true)
    expect(r.body.byPhase.available).toBe(true)
    expect(r.habits.daysLogged).toBe(offLogs.length)
  })

  it('no periods yet and no ratings: the period reason comes first', () => {
    const r = cycleStats([{ ...day('2026-09-01'), moods: {} }], TODAY, SETTINGS)
    expectSane(r)
    expect(r.moodByPhase.reason).toBe('no-period-logged')
    expect(r.sufficiency.hasMoodRatings).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// A mood added later (selfCriticism): entries saved before it existed lack the key
// ---------------------------------------------------------------------------

describe('a mood added after the history began (selfCriticism)', () => {
  const NEW: MoodKey = 'selfCriticism'
  const ORIGINAL = MOOD_ITEMS.map((m) => m.key).filter((k) => k !== NEW)
  /** As an entry saved before the ninth mood existed: the original eight only. */
  const withoutNew = (l: DayLog) => {
    delete l.moods[NEW]
  }

  it('the fixtures are what they claim', () => {
    expect(ORIGINAL).toHaveLength(8)
    expect(MOOD_ITEMS.map((m) => m.key)).toContain(NEW)
  })

  describe('a history recorded entirely before it existed', () => {
    const logs = dailyLogs('2026-05-04', P_TODAY, P_STARTS, 5, (l) => {
      plant(P_STARTS)(l)
      withoutNew(l)
    })
    const s = cycleStats(logs, P_TODAY, SETTINGS)

    it('reports it as never rated everywhere (days 0, mean null), never as a 1', () => {
      expectSane(s)
      expect(logs.every((l) => !(NEW in l.moods) && Object.keys(l.moods).length === 8)).toBe(true)
      expect(s.moodTotals.daysRated).toBe(logs.length)
      const total = s.moodTotals.items.find((i) => i.key === NEW)!
      expect(total).toMatchObject({ label: 'Negative self-talk', days: 0, mean: null })
      for (const k of ORIGINAL) expect(s.moodTotals.items.find((i) => i.key === k)!.days).toBe(logs.length)
      for (const p of s.moodByPhase.phases) expect(p.items.find((i) => i.key === NEW)).toMatchObject({ days: 0, mean: null })
      expect(item(s, NEW)).toMatchObject({
        premenstrualMean: null,
        postmenstrualMean: null,
        premenstrualDays: 0,
        postmenstrualDays: 0,
        difference: null,
        percentChange: null,
        shareOfScale: null,
        cyclesCompared: 0,
        cyclesHigherBefore: 0,
      })
      expect(s.beforeAfter.ranked).not.toContain(NEW)
      expect(s.beforeAfter.ranked).toHaveLength(8)
    })

    it('the other moods and the daily averages are exactly as with eight moods', () => {
      // Averages over the eight recorded moods: (5 + 3 + 6 × 2) / 8 and (2 + 1 + 6 × 2) / 8.
      expect(s.beforeAfter.overall.premenstrualMean).toBeCloseTo(2.5)
      expect(s.beforeAfter.overall.postmenstrualMean).toBeCloseTo(1.875)
      expect(s.beforeAfter.pairs[1].premenstrual.mean).toBeCloseTo(2.5)
      expect(item(s, 'irritability')).toMatchObject({ premenstrualDays: 28, postmenstrualDays: 28, cyclesHigherBefore: 4 })
      expect(item(s, 'irritability').difference).toBeCloseTo(3)
      expect(s.beforeAfter.ranked.slice(0, 2)).toEqual(['irritability', 'sadness'])
      expect(hl(s, 'premenstrual-rise')).toMatchObject({ item: 'irritability', itemsRising: 2 })
    })
  })

  describe('rated from a later date on', () => {
    const FROM = '2026-07-01'
    // From FROM on the new mood is rated too: 6 in the week before a period, 1 on days 4–10, 3 otherwise.
    const logs = dailyLogs('2026-05-04', P_TODAY, P_STARTS, 5, (l) => {
      plant(P_STARTS)(l)
      if (l.date < FROM) withoutNew(l)
      else {
        const r = relation(l.date, P_STARTS)
        l.moods[NEW] = r === 'pre' ? 6 : r === 'post' ? 1 : 3
      }
    })
    const ratedDays = logs.filter((l) => l.date >= FROM)
    const s = cycleStats(logs, P_TODAY, SETTINGS)

    it('counts only the days it was rated', () => {
      expectSane(s)
      expect(ratedDays).toHaveLength(72) // 1 July – 10 September
      const total = s.moodTotals.items.find((i) => i.key === NEW)!
      expect(total.days).toBe(ratedDays.length)
      const expectedMean = ratedDays.reduce((n, l) => n + l.moods[NEW]!, 0) / ratedDays.length
      expect(total.mean).toBeCloseTo(expectedMean)
      // The original moods still count every day.
      for (const k of ORIGINAL) expect(s.moodTotals.items.find((i) => i.key === k)!.days).toBe(logs.length)
      // By phase: every rated day lands in some phase, and only those.
      const phaseDays = s.moodByPhase.phases.map((p) => p.items.find((i) => i.key === NEW)!.days)
      expect(phaseDays.reduce((a, b) => a + b, 0)).toBe(ratedDays.length)
      for (const p of s.moodByPhase.phases) {
        expect(p.items.find((i) => i.key === NEW)!.days).toBeLessThan(p.daysLogged)
      }
    })

    it('joins the before/after comparison once both windows of a cycle are rated', () => {
      const n = item(s, NEW)
      // Cycles starting 27 Jul and 24 Aug have both windows rated; 29 Jun only its days 4–10.
      expect(n).toMatchObject({ cyclesCompared: 2, cyclesHigherBefore: 2, premenstrualDays: 14, postmenstrualDays: 21 })
      expect(n.premenstrualMean).toBeCloseTo(6)
      expect(n.postmenstrualMean).toBeCloseTo(1)
      expect(n.difference).toBeCloseTo(5)
      expect(s.beforeAfter.ranked).toHaveLength(N_MOODS)
      expect(s.beforeAfter.ranked.slice(0, 3)).toEqual([NEW, 'irritability', 'sadness'])
      expect(hl(s, 'premenstrual-rise')).toMatchObject({ item: NEW, label: 'Negative self-talk', cycles: 4, cyclesHigherBefore: 2, itemsRising: 3 })
      // The planted moods are unaffected by the newer one.
      expect(item(s, 'irritability')).toMatchObject({ premenstrualDays: 28, postmenstrualDays: 28, cyclesHigherBefore: 4 })
      expect(item(s, 'irritability').difference).toBeCloseTo(3)
    })
  })
})
