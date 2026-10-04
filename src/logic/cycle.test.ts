import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MOOD_ITEMS } from '../types'
import type { DayLog, Flow, ISODate, MoodKey, Rating, Settings } from '../types'
import {
  LUTEAL_PHASE_DAYS,
  MAX_GAP_DAYS_IN_PERIOD,
  MAX_PLAUSIBLE_CYCLE_DAYS,
  MIN_DAYS_BETWEEN_PERIOD_STARTS,
  MIN_PLAUSIBLE_CYCLE_DAYS,
  OVULATION_WINDOW_RADIUS,
  RECENT_CYCLES_USED,
  averagePeriodLength,
  cycleLengthFromPeriods,
  cycleStatus,
  findPeriods,
  isBleeding,
  phaseForCycleDay,
  phaseOn,
} from './cycle'
import type { Phase } from './cycle'
import { addDays, diffDays } from './dates'

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

const MOODS = Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, 1 as Rating])) as Record<MoodKey, Rating>

function day(date: ISODate, flow: Flow = 'none'): DayLog {
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
  }
}

/** Consecutive days starting at `start`, one per flow. */
function days(start: ISODate, flows: Flow[]): DayLog[] {
  return flows.map((f, i) => day(addDays(start, i), f))
}

function bleed(start: ISODate, n: number, flow: Flow = 'medium'): DayLog[] {
  return days(start, Array<Flow>(n).fill(flow))
}

/** Period start dates from a first start and a list of cycle lengths. */
function startsFrom(first: ISODate, gaps: number[]): ISODate[] {
  const out = [first]
  for (const g of gaps) out.push(addDays(out[out.length - 1], g))
  return out
}

/**
 * A log every day from `from` to `until` (inclusive): `periodLen` medium days
 * from each period start, 'none' otherwise.
 */
function dailyLogs(from: ISODate, until: ISODate, starts: ISODate[], periodLen = 5): DayLog[] {
  const logs: DayLog[] = []
  for (let d = from; d <= until; d = addDays(d, 1)) {
    const inPeriod = starts.some((s) => d >= s && diffDays(s, d) < periodLen)
    logs.push(day(d, inPeriod ? 'medium' : 'none'))
  }
  return logs
}

/** Deterministic shuffle (reverse + interleave) so tests don't depend on Math.random. */
function scramble<T>(xs: T[]): T[] {
  const r = [...xs].reverse()
  return [...r.filter((_, i) => i % 2 === 0), ...r.filter((_, i) => i % 2 === 1)]
}

const ORDER: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

// ---------------------------------------------------------------------------
// Constants sanity
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('have the documented values', () => {
    expect(MAX_GAP_DAYS_IN_PERIOD).toBe(2)
    expect(MIN_DAYS_BETWEEN_PERIOD_STARTS).toBe(15)
    expect(MIN_PLAUSIBLE_CYCLE_DAYS).toBe(15)
    expect(MAX_PLAUSIBLE_CYCLE_DAYS).toBe(60)
    expect(RECENT_CYCLES_USED).toBe(6)
    expect(LUTEAL_PHASE_DAYS).toBe(14)
    expect(OVULATION_WINDOW_RADIUS).toBe(1)
  })

  it('isBleeding treats only light/medium/heavy as bleeding', () => {
    expect(isBleeding('none')).toBe(false)
    expect(isBleeding('spotting')).toBe(false)
    expect(isBleeding('light')).toBe(true)
    expect(isBleeding('medium')).toBe(true)
    expect(isBleeding('heavy')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// findPeriods
// ---------------------------------------------------------------------------

describe('findPeriods', () => {
  it('returns nothing for no data', () => {
    expect(findPeriods([])).toEqual([])
  })

  it('returns nothing when no bleeding was logged', () => {
    expect(findPeriods(days('2026-03-01', ['none', 'none', 'spotting', 'spotting', 'none']))).toEqual([])
  })

  it('finds a single period', () => {
    expect(findPeriods(bleed('2026-03-02', 5))).toEqual([{ start: '2026-03-02', end: '2026-03-06' }])
  })

  it('treats any of light/medium/heavy as bleeding', () => {
    const logs = days('2026-03-02', ['light', 'heavy', 'medium', 'light'])
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-02', end: '2026-03-05' }])
  })

  it('bridges gaps of 1–2 "none" days inside a period', () => {
    const logs = days('2026-03-01', ['heavy', 'medium', 'none', 'none', 'light'])
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-05' }])
    const one = days('2026-03-01', ['heavy', 'none', 'light'])
    expect(findPeriods(one)).toEqual([{ start: '2026-03-01', end: '2026-03-03' }])
  })

  it('bridges gaps of 1–2 unlogged days inside a period', () => {
    const logs = [day('2026-03-01', 'heavy'), day('2026-03-02', 'medium'), day('2026-03-05', 'light')]
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-05' }])
  })

  it('ends the period after a gap of 3 days (and ignores the stray bleed that follows)', () => {
    const logs = [day('2026-03-01', 'heavy'), day('2026-03-02', 'medium'), day('2026-03-06', 'light')]
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-02' }])
  })

  it('never starts a period on spotting alone', () => {
    expect(findPeriods(bleed('2026-03-01', 4, 'spotting'))).toEqual([])
  })

  it('does not move the start earlier for spotting before the period', () => {
    const logs = days('2026-03-01', ['spotting', 'spotting', 'medium', 'medium', 'light'])
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-03', end: '2026-03-05' }])
  })

  it('includes spotting directly after bleeding as the tail of the period', () => {
    const logs = days('2026-03-01', ['medium', 'medium', 'light', 'spotting', 'spotting', 'none'])
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-05' }])
  })

  it('does not attach spotting that follows an unlogged day', () => {
    const logs = [...bleed('2026-03-01', 3), day('2026-03-05', 'spotting')]
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-03' }])
  })

  it('does not attach spotting that follows a "none" day', () => {
    const logs = days('2026-03-01', ['medium', 'medium', 'none', 'spotting'])
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-02' }])
  })

  it('lets spotting bridge two bleeding stretches of the same period', () => {
    // medium, medium, spotting ×3, (unlogged), light
    const logs = [
      ...days('2026-03-01', ['medium', 'medium', 'spotting', 'spotting', 'spotting']),
      day('2026-03-07', 'light'),
    ]
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-07' }])
  })

  it('ignores a bleed starting less than 15 days after the period start', () => {
    const logs = [...bleed('2026-01-05', 5), ...bleed(addDays('2026-01-05', 14), 2, 'light')]
    expect(findPeriods(logs)).toEqual([{ start: '2026-01-05', end: '2026-01-09' }])
  })

  it('accepts a new period starting exactly 15 days after the previous start', () => {
    const logs = [...bleed('2026-01-05', 5), ...bleed(addDays('2026-01-05', 15), 3)]
    expect(findPeriods(logs)).toEqual([
      { start: '2026-01-05', end: '2026-01-09' },
      { start: '2026-01-20', end: '2026-01-22' },
    ])
  })

  it('measures the minimum distance from the last accepted period, not an ignored bleed', () => {
    const logs = [
      ...bleed('2026-01-01', 4),
      ...bleed('2026-01-10', 2, 'light'), // ignored (9 days after start)
      ...bleed('2026-01-20', 4), // 19 days after the real start -> new period
    ]
    expect(findPeriods(logs).map((p) => p.start)).toEqual(['2026-01-01', '2026-01-20'])
  })

  it('handles unsorted input and returns periods oldest first', () => {
    const starts = startsFrom('2026-01-05', [28, 30, 27])
    const logs = dailyLogs('2026-01-01', '2026-04-30', starts)
    const expected = starts.map((s) => ({ start: s, end: addDays(s, 4) }))
    expect(findPeriods(scramble(logs))).toEqual(expected)
    expect(findPeriods(logs)).toEqual(expected)
  })

  it('uses the heaviest flow if a date is logged twice', () => {
    const logs = [day('2026-03-01', 'none'), day('2026-03-01', 'heavy'), day('2026-03-02', 'medium')]
    expect(findPeriods(logs)).toEqual([{ start: '2026-03-01', end: '2026-03-02' }])
  })

  it('does not mutate its input', () => {
    const logs = scramble(bleed('2026-03-01', 4))
    const copy = JSON.parse(JSON.stringify(logs))
    findPeriods(logs)
    expect(logs).toEqual(copy)
  })
})

// ---------------------------------------------------------------------------
// Length estimates
// ---------------------------------------------------------------------------

describe('cycleLengthFromPeriods', () => {
  const periodsAt = (starts: ISODate[]) => starts.map((s) => ({ start: s, end: addDays(s, 4) }))

  it('uses the default with zero or one period', () => {
    expect(cycleLengthFromPeriods([], 28)).toEqual({ cycleLength: 28, usingDefault: true })
    expect(cycleLengthFromPeriods(periodsAt(['2026-01-01']), 30)).toEqual({ cycleLength: 30, usingDefault: true })
  })

  it('learns from a single complete cycle', () => {
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [31])), 28)).toEqual({
      cycleLength: 31,
      usingDefault: false,
    })
  })

  it('takes the median of irregular cycles', () => {
    const starts = startsFrom('2026-01-01', [26, 32, 29, 35, 27])
    expect(cycleLengthFromPeriods(periodsAt(starts), 28).cycleLength).toBe(29)
  })

  it('rounds an even-count median to whole days', () => {
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [26, 30])), 28).cycleLength).toBe(28)
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [27, 28])), 28).cycleLength).toBe(28)
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [29, 32])), 28).cycleLength).toBe(31)
  })

  it('ignores implausibly long gaps (missed logging)', () => {
    const starts = startsFrom('2026-01-01', [30, 70, 30])
    expect(cycleLengthFromPeriods(periodsAt(starts), 28)).toEqual({ cycleLength: 30, usingDefault: false })
  })

  it('stays on the default when the only gap is implausible', () => {
    const starts = startsFrom('2026-01-01', [75])
    expect(cycleLengthFromPeriods(periodsAt(starts), 28)).toEqual({ cycleLength: 28, usingDefault: true })
  })

  it('accepts the plausible range boundaries', () => {
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [60])), 28).cycleLength).toBe(60)
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [61])), 28).usingDefault).toBe(true)
    expect(cycleLengthFromPeriods(periodsAt(startsFrom('2026-01-01', [15])), 28).cycleLength).toBe(15)
  })

  it('only uses the most recent 6 plausible cycles', () => {
    const gaps = [40, 40, 40, 40, 40, 40, 40, 25, 25, 25, 25, 25, 25]
    const starts = startsFrom('2024-01-01', gaps)
    expect(cycleLengthFromPeriods(periodsAt(starts), 28).cycleLength).toBe(25)
  })
})

describe('averagePeriodLength', () => {
  it('uses the default with no data', () => {
    expect(averagePeriodLength([], SETTINGS)).toBe(5)
  })

  it('uses the default while the only period may still be ongoing', () => {
    expect(averagePeriodLength(bleed('2026-03-01', 3), SETTINGS)).toBe(5)
  })

  it('learns from completed periods (median)', () => {
    const logs = [
      ...dailyLogs('2026-01-01', '2026-01-31', ['2026-01-01'], 3),
      ...dailyLogs('2026-02-01', '2026-02-28', ['2026-02-01'], 4),
      ...dailyLogs('2026-03-01', '2026-03-31', ['2026-03-01'], 7),
    ]
    expect(averagePeriodLength(logs, SETTINGS)).toBe(4)
  })

  it('counts a period as completed once anything is logged after it', () => {
    const logs = [...bleed('2026-03-01', 3), day('2026-03-04', 'none')]
    expect(averagePeriodLength(logs, SETTINGS)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// phaseForCycleDay
// ---------------------------------------------------------------------------

describe('phaseForCycleDay', () => {
  const phases = (len: number, mens: number) =>
    Array.from({ length: len }, (_, i) => phaseForCycleDay(i + 1, len, mens))

  it('28-day cycle, 5-day period: ovulation days 13–15', () => {
    const p = phases(28, 5)
    expect(p.slice(0, 5).every((x) => x === 'menstrual')).toBe(true)
    expect(p.slice(5, 12).every((x) => x === 'follicular')).toBe(true)
    expect(p.slice(12, 15)).toEqual(['ovulation', 'ovulation', 'ovulation'])
    expect(p.slice(15).every((x) => x === 'luteal')).toBe(true)
  })

  it('stays luteal past the end of the cycle (late period)', () => {
    expect(phaseForCycleDay(29, 28, 5)).toBe('luteal')
    expect(phaseForCycleDay(60, 28, 5)).toBe('luteal')
  })

  it('short 21-day cycle: no follicular days, ovulation right after the period', () => {
    const p = phases(21, 5)
    expect(p.slice(0, 5).every((x) => x === 'menstrual')).toBe(true)
    expect(p.slice(5, 8)).toEqual(['ovulation', 'ovulation', 'ovulation'])
    expect(p.slice(8).every((x) => x === 'luteal')).toBe(true)
  })

  it('very short cycle: ovulation window is pushed after the period, not overlapping it', () => {
    // 18 days, 6-day period: naive ovulation day 4 is inside the period.
    const p = phases(18, 6)
    expect(p.slice(0, 6).every((x) => x === 'menstrual')).toBe(true)
    expect(p[6]).toBe('ovulation')
    expect(p.slice(7).every((x) => x === 'luteal')).toBe(true)
  })

  it('drops the ovulation window when the period fills the cycle', () => {
    expect(phaseForCycleDay(15, 15, 14)).toBe('luteal')
    expect(phaseForCycleDay(16, 15, 15)).toBe('luteal')
  })

  it('always yields phases in order for every plausible cycle and period length', () => {
    for (let len = MIN_PLAUSIBLE_CYCLE_DAYS; len <= MAX_PLAUSIBLE_CYCLE_DAYS; len++) {
      for (let mens = 1; mens <= 10; mens++) {
        const idx = phases(len + 5, mens).map((x) => ORDER.indexOf(x))
        for (let i = 1; i < idx.length; i++) expect(idx[i]).toBeGreaterThanOrEqual(idx[i - 1])
        expect(idx.filter((x) => x === 0).length).toBe(mens)
        expect(idx.filter((x) => x === 2).length).toBeLessThanOrEqual(2 * OVULATION_WINDOW_RADIUS + 1)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// cycleStatus
// ---------------------------------------------------------------------------

describe('cycleStatus', () => {
  const TODAY = '2026-10-03'

  it('no data: everything unknown, default cycle length', () => {
    expect(cycleStatus([], TODAY, SETTINGS)).toEqual({
      cycleDay: null,
      phase: null,
      cycleLength: 28,
      usingDefault: true,
      nextPeriod: null,
      daysUntilNextPeriod: null,
    })
  })

  it('logs without any bleeding: still unknown', () => {
    const logs = days('2026-09-25', ['none', 'spotting', 'none', 'none'])
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBeNull()
    expect(s.phase).toBeNull()
    expect(s.nextPeriod).toBeNull()
  })

  it('single period: uses the default length', () => {
    const logs = dailyLogs('2026-09-20', TODAY, ['2026-09-20'])
    expect(cycleStatus(logs, TODAY, SETTINGS)).toEqual({
      cycleDay: 14,
      phase: 'ovulation',
      cycleLength: 28,
      usingDefault: true,
      nextPeriod: '2026-10-18',
      daysUntilNextPeriod: 15,
    })
  })

  it('respects a custom default cycle length', () => {
    const logs = dailyLogs('2026-09-20', TODAY, ['2026-09-20'])
    const s = cycleStatus(logs, TODAY, { ...SETTINGS, defaultCycleLength: 32 })
    expect(s.cycleLength).toBe(32)
    expect(s.nextPeriod).toBe('2026-10-22')
    expect(s.phase).toBe('follicular') // ovulation window 17–19
  })

  it('multiple regular cycles', () => {
    const starts = startsFrom('2026-06-01', [28, 28, 28, 28])
    expect(starts[4]).toBe('2026-09-21')
    const logs = dailyLogs('2026-06-01', TODAY, starts)
    expect(cycleStatus(logs, TODAY, SETTINGS)).toEqual({
      cycleDay: 13,
      phase: 'ovulation',
      cycleLength: 28,
      usingDefault: false,
      nextPeriod: '2026-10-19',
      daysUntilNextPeriod: 16,
    })
  })

  it('irregular cycles use the median', () => {
    const starts = startsFrom('2026-03-01', [26, 32, 29, 35, 27])
    const logs = dailyLogs('2026-03-01', TODAY, starts)
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleLength).toBe(29)
    expect(s.usingDefault).toBe(false)
    expect(s.nextPeriod).toBe(addDays(starts[5], 29))
  })

  it('an outlier gap from a missed period is ignored', () => {
    // The period around 2026-08-02 was never logged, leaving a 62-day gap.
    const starts = ['2026-05-04', '2026-06-03', '2026-07-03', '2026-09-03']
    expect(diffDays(starts[2], starts[3])).toBeGreaterThan(MAX_PLAUSIBLE_CYCLE_DAYS)
    const logs = dailyLogs('2026-05-01', TODAY, starts)
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleLength).toBe(30)
    expect(s.nextPeriod).toBe('2026-10-03')
    expect(s.daysUntilNextPeriod).toBe(0)
  })

  it('late period: negative days, stays luteal', () => {
    const starts = startsFrom('2026-06-09', [28, 28, 28])
    expect(starts[3]).toBe('2026-09-01')
    const logs = dailyLogs('2026-06-09', TODAY, starts)
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(33)
    expect(s.nextPeriod).toBe('2026-09-29')
    expect(s.daysUntilNextPeriod).toBe(-4)
    expect(s.phase).toBe('luteal')
  })

  it('late period with today unlogged: still luteal', () => {
    const starts = startsFrom('2026-06-09', [28, 28, 28])
    const logs = dailyLogs('2026-06-09', '2026-10-01', starts)
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.phase).toBe('luteal')
    expect(s.daysUntilNextPeriod).toBe(-4)
  })

  it('today mid-period (logged)', () => {
    const logs = [...dailyLogs('2026-08-01', '2026-09-30', ['2026-08-04', '2026-09-01']), ...bleed('2026-10-01', 3)]
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(3)
    expect(s.phase).toBe('menstrual')
    expect(s.nextPeriod).toBe(addDays('2026-10-01', s.cycleLength))
  })

  it('today mid-period but unlogged: estimated as menstrual', () => {
    const logs = bleed('2026-10-01', 2)
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(3)
    expect(s.phase).toBe('menstrual')
  })

  it('today logged as no bleeding right after a short period: not menstrual', () => {
    const logs = [...bleed('2026-10-01', 2), day(TODAY, 'none')]
    expect(cycleStatus(logs, TODAY, SETTINGS).phase).toBe('follicular')
  })

  it('unlogged days beyond the typical period length are not menstrual', () => {
    const logs = bleed('2026-09-25', 2) // then nothing logged
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(9)
    expect(s.phase).toBe('follicular')
  })

  it('uses the learned period length for unlogged days', () => {
    // Past periods were 3 days; current one has 2 logged days, today (day 4) unlogged.
    const starts = ['2026-08-03', '2026-08-31', '2026-09-30']
    const logs = [...dailyLogs('2026-08-01', '2026-09-29', starts, 3), ...bleed('2026-09-30', 2)]
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(4)
    expect(s.phase).toBe('follicular')
    // With the default 5-day assumption it would have been menstrual.
    expect(cycleStatus(bleed('2026-09-30', 2), TODAY, SETTINGS).phase).toBe('menstrual')
  })

  it('short cycles', () => {
    const starts = startsFrom('2026-07-01', [21, 21, 21, 21])
    const logs = dailyLogs('2026-07-01', TODAY, starts)
    expect(starts[4]).toBe('2026-09-23')
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleLength).toBe(21)
    expect(s.cycleDay).toBe(11)
    expect(s.phase).toBe('luteal') // ovulation days 6–8 (clamped after the period)
    expect(cycleStatus(logs, '2026-09-27', SETTINGS).phase).toBe('menstrual') // day 5
    expect(cycleStatus(logs, '2026-09-28', SETTINGS).phase).toBe('ovulation') // day 6
    expect(cycleStatus(logs, '2026-09-30', SETTINGS).phase).toBe('ovulation') // day 8
    expect(cycleStatus(logs, '2026-10-01', SETTINGS).phase).toBe('luteal') // day 9
  })

  it('handles unsorted input', () => {
    const starts = startsFrom('2026-06-01', [28, 28, 28, 28])
    const logs = dailyLogs('2026-06-01', TODAY, starts)
    expect(cycleStatus(scramble(logs), TODAY, SETTINGS)).toEqual(cycleStatus(logs, TODAY, SETTINGS))
  })

  it('ignores logs dated after today', () => {
    const logs = [...dailyLogs('2026-09-01', TODAY, ['2026-09-01']), ...bleed('2026-10-10', 4)]
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(33)
    expect(s.usingDefault).toBe(true)
  })

  it('a mid-cycle bleed does not restart the cycle', () => {
    const logs = [...dailyLogs('2026-09-21', '2026-09-29', ['2026-09-21']), ...days('2026-09-30', ['light', 'light', 'none', 'none'])]
    const s = cycleStatus(logs, TODAY, SETTINGS)
    expect(s.cycleDay).toBe(13)
    expect(s.phase).toBe('ovulation')
  })
})

// ---------------------------------------------------------------------------
// phaseOn
// ---------------------------------------------------------------------------

describe('phaseOn', () => {
  it('returns null with no data', () => {
    expect(phaseOn([], '2026-10-03', SETTINGS)).toBeNull()
    expect(phaseOn([], '2026-10-03', SETTINGS, '2026-10-03')).toBeNull()
  })

  it('returns null before the first logged period', () => {
    const logs = dailyLogs('2026-09-01', '2026-10-03', ['2026-09-10'])
    expect(phaseOn(logs, '2026-09-09', SETTINGS)).toBeNull()
    expect(phaseOn(logs, '2025-01-01', SETTINGS)).toBeNull()
    expect(phaseOn(logs, '2026-09-10', SETTINGS)).toBe('menstrual')
  })

  it('past cycle: phases scaled to the real cycle length', () => {
    // 35-day cycle: ovulation day 21 ± 1 = days 20–22.
    const starts = ['2026-01-05', '2026-02-09']
    expect(diffDays(starts[0], starts[1])).toBe(35)
    const logs = dailyLogs('2026-01-05', '2026-02-20', starts)
    const on = (cd: number) => phaseOn(logs, addDays(starts[0], cd - 1), SETTINGS)
    expect(on(1)).toBe('menstrual')
    expect(on(5)).toBe('menstrual')
    expect(on(6)).toBe('follicular')
    expect(on(19)).toBe('follicular')
    expect(on(20)).toBe('ovulation')
    expect(on(22)).toBe('ovulation')
    expect(on(23)).toBe('luteal')
    expect(on(35)).toBe('luteal')
    expect(on(36)).toBe('menstrual') // next period day 1
  })

  it('past cycle: only actual bleeding days are menstrual', () => {
    const starts = ['2026-01-05', '2026-02-02']
    const logs = dailyLogs('2026-01-05', '2026-02-20', starts, 3)
    expect(phaseOn(logs, '2026-01-07', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-01-08', SETTINGS)).toBe('follicular')
  })

  it('gap days inside a past period count as menstrual', () => {
    const logs = [
      ...days('2026-01-05', ['heavy', 'medium', 'none', 'none', 'light', 'none']),
      ...dailyLogs('2026-01-11', '2026-02-10', ['2026-02-02']),
    ]
    expect(phaseOn(logs, '2026-01-07', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-01-09', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-01-10', SETTINGS)).toBe('follicular')
  })

  it('implausibly long past gap: estimate the first cycle, then unknown', () => {
    const starts = startsFrom('2026-01-01', [28, 28, 75])
    const logs = dailyLogs('2026-01-01', addDays(starts[3], 3), starts)
    const gapStart = starts[2]
    expect(phaseOn(logs, addDays(gapStart, 13), SETTINGS)).toBe('ovulation') // day 14 of an estimated 28
    expect(phaseOn(logs, addDays(gapStart, 27), SETTINGS)).toBe('luteal')
    expect(phaseOn(logs, addDays(gapStart, 40), SETTINGS)).toBeNull()
    expect(phaseOn(logs, starts[3], SETTINGS)).toBe('menstrual')
  })

  it('future dates: projects periods using the estimated cycle length', () => {
    const starts = startsFrom('2026-06-01', [28, 28, 28, 28]) // last 2026-09-21
    const logs = dailyLogs('2026-06-01', '2026-10-03', starts)
    expect(phaseOn(logs, '2026-10-18', SETTINGS)).toBe('luteal')
    expect(phaseOn(logs, '2026-10-19', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-10-23', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-10-24', SETTINGS)).toBe('follicular')
    expect(phaseOn(logs, '2026-10-31', SETTINGS)).toBe('ovulation') // predicted day 13
    expect(phaseOn(logs, '2026-11-16', SETTINGS)).toBe('menstrual') // two cycles ahead
    expect(phaseOn(logs, '2027-03-01', SETTINGS)).toBe(phaseForCycleDay(diffDays('2026-10-19', '2027-03-01') % 28 + 1, 28, 5))
  })

  it('future dates use the learned period length for predicted periods', () => {
    const starts = startsFrom('2026-06-01', [28, 28, 28, 28])
    const logs = dailyLogs('2026-06-01', '2026-10-03', starts, 3)
    expect(phaseOn(logs, '2026-10-21', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-10-22', SETTINGS)).toBe('follicular')
  })

  it('late period: stays luteal through today, predicts the period from tomorrow', () => {
    const starts = startsFrom('2026-06-09', [28, 28, 28]) // last 2026-09-01, due 09-29
    const logs = dailyLogs('2026-06-09', '2026-10-03', starts)
    expect(phaseOn(logs, '2026-09-29', SETTINGS)).toBe('luteal')
    expect(phaseOn(logs, '2026-10-03', SETTINGS)).toBe('luteal')
    expect(phaseOn(logs, '2026-10-04', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-10-09', SETTINGS)).toBe('follicular')
    expect(phaseOn(logs, '2026-11-01', SETTINGS)).toBe('menstrual') // 10-04 + 28
  })

  it('with `today` passed, unlogged days up to today are the present, not predictions', () => {
    const starts = startsFrom('2026-06-09', [28, 28, 28])
    const logs = dailyLogs('2026-06-09', '2026-09-30', starts) // last 3 days unlogged
    // Without today, the latest log (09-30) is treated as "now".
    expect(phaseOn(logs, '2026-10-02', SETTINGS)).toBe('menstrual')
    // With today, the period is simply late.
    expect(phaseOn(logs, '2026-10-02', SETTINGS, '2026-10-03')).toBe('luteal')
    expect(phaseOn(logs, '2026-10-04', SETTINGS, '2026-10-03')).toBe('menstrual')
  })

  it('current period unlogged days are estimated with the typical length', () => {
    const logs = bleed('2026-10-01', 2)
    expect(phaseOn(logs, '2026-10-05', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-10-06', SETTINGS)).toBe('follicular')
  })

  it('agrees with cycleStatus for every day when today is passed', () => {
    const starts = startsFrom('2026-01-03', [27, 31, 26, 33, 29, 28, 30])
    const logs = dailyLogs('2026-01-01', '2026-09-15', starts).filter((_, i) => i % 7 !== 3) // some missed days
    for (let today = '2026-01-01'; today <= '2026-10-31'; today = addDays(today, 1)) {
      expect(phaseOn(logs, today, SETTINGS, today)).toBe(cycleStatus(logs, today, SETTINGS).phase)
    }
  })

  it('handles unsorted input', () => {
    const starts = startsFrom('2026-06-01', [28, 30, 27])
    const logs = dailyLogs('2026-06-01', '2026-09-10', starts)
    for (let d = '2026-05-25'; d <= '2026-11-30'; d = addDays(d, 3)) {
      expect(phaseOn(scramble(logs), d, SETTINGS)).toBe(phaseOn(logs, d, SETTINGS))
    }
  })
})

// ---------------------------------------------------------------------------
// Calendar boundaries
// ---------------------------------------------------------------------------

function boundaryTests() {
  it('period spanning a year boundary is one period', () => {
    const logs = bleed('2025-12-30', 5)
    expect(findPeriods(logs)).toEqual([{ start: '2025-12-30', end: '2026-01-03' }])
  })

  it('gap bridging across a month boundary', () => {
    const logs = [day('2026-01-30', 'heavy'), day('2026-01-31', 'medium'), day('2026-02-03', 'light')]
    expect(findPeriods(logs)).toEqual([{ start: '2026-01-30', end: '2026-02-03' }])
  })

  it('cycle across the new year', () => {
    const logs = dailyLogs('2025-11-01', '2026-01-10', ['2025-11-10', '2025-12-08', '2026-01-05'])
    const s = cycleStatus(logs, '2026-01-10', SETTINGS)
    expect(s.cycleLength).toBe(28)
    expect(s.cycleDay).toBe(6)
    expect(s.nextPeriod).toBe('2026-02-02')
  })

  it('February in leap and non-leap years', () => {
    const leap = dailyLogs('2028-02-01', '2028-03-20', ['2028-02-15', '2028-03-14'])
    expect(cycleStatus(leap, '2028-03-20', SETTINGS).cycleLength).toBe(28)
    const plain = dailyLogs('2026-02-01', '2026-03-20', ['2026-02-15', '2026-03-15'])
    expect(cycleStatus(plain, '2026-03-20', SETTINGS).cycleLength).toBe(28)
    expect(cycleStatus(plain, '2026-03-20', SETTINGS).nextPeriod).toBe('2026-04-12')
  })

  it('cycles across spring and autumn DST changes (US and EU dates)', () => {
    // US: 2026-03-08 / 2026-11-01. EU: 2026-03-29 / 2026-10-25.
    const starts = startsFrom('2026-02-08', [28, 28, 28, 28, 28, 28, 28, 28, 28, 28])
    expect(starts[1]).toBe('2026-03-08')
    expect(starts[9]).toBe('2026-10-18')
    const logs = dailyLogs('2026-02-01', '2026-12-31', starts)
    const periods = findPeriods(logs)
    expect(periods.map((p) => p.start)).toEqual(starts)
    expect(periods.every((p) => diffDays(p.start, p.end) === 4)).toBe(true)
    expect(cycleStatus(logs, '2026-03-29', SETTINGS).cycleDay).toBe(22)
    expect(cycleStatus(logs, '2026-10-25', SETTINGS).cycleDay).toBe(8)
    expect(cycleStatus(logs, '2026-11-01', SETTINGS).cycleDay).toBe(15)
    expect(cycleStatus(logs, '2026-11-01', SETTINGS).cycleLength).toBe(28)
    expect(phaseOn(logs, '2026-03-08', SETTINGS)).toBe('menstrual')
    expect(phaseOn(logs, '2026-03-07', SETTINGS)).toBe('luteal')
  })
}

describe('month / year / DST boundaries (local timezone)', boundaryTests)

// `process` is not in the app tsconfig's types, so reach it through globalThis.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

for (const tz of ['America/New_York', 'Europe/London', 'Australia/Sydney', 'Pacific/Chatham']) {
  describe(`month / year / DST boundaries (TZ=${tz})`, () => {
    const original = env.TZ
    beforeAll(() => {
      env.TZ = tz
    })
    afterAll(() => {
      if (original === undefined) delete env.TZ
      else env.TZ = original
    })
    it('the timezone override is active', () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(tz)
    })
    boundaryTests()
  })
}
