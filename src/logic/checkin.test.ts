import { describe, it, expect } from 'vitest'
import type { ISODate, Settings } from '../types'
import { canLog, checkinDue, parseReminderMinutes } from './checkin'

const settings = (over: Partial<Settings> = {}): Settings => ({
  reminderTime: '20:00',
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  startedOn: '2026-09-01',
  moodTracking: 'advanced',
  ...over,
})

/** Local time; month is 1-based here for readability. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min)
const logged = (...dates: ISODate[]) => new Set(dates)

describe('parseReminderMinutes', () => {
  it('parses HH:MM', () => {
    expect(parseReminderMinutes('20:00')).toBe(1200)
    expect(parseReminderMinutes('09:05')).toBe(545)
    expect(parseReminderMinutes('9:05')).toBe(545)
    expect(parseReminderMinutes('00:00')).toBe(0)
    expect(parseReminderMinutes('23:59')).toBe(1439)
  })

  it('falls back to the default (20:00) when malformed', () => {
    expect(parseReminderMinutes('')).toBe(1200)
    expect(parseReminderMinutes('25:00')).toBe(1200)
    expect(parseReminderMinutes('8pm')).toBe(1200)
  })
})

describe('checkinDue: today', () => {
  it('is not due before the reminder time', () => {
    expect(checkinDue(logged(), at(2026, 10, 3, 19, 59), settings())).toMatchObject({ todayLogged: false, todayDue: false })
  })

  it('is due exactly at the reminder time', () => {
    expect(checkinDue(logged(), at(2026, 10, 3, 20, 0), settings()).todayDue).toBe(true)
  })

  it('is due after the reminder time, up to the end of the day', () => {
    expect(checkinDue(logged(), at(2026, 10, 3, 20, 1), settings()).todayDue).toBe(true)
    expect(checkinDue(logged(), at(2026, 10, 3, 23, 59), settings()).todayDue).toBe(true)
  })

  it('is not due once today is logged', () => {
    expect(checkinDue(logged('2026-10-03'), at(2026, 10, 3, 21, 0), settings())).toMatchObject({ todayLogged: true, todayDue: false })
  })

  it('respects a custom reminder time', () => {
    const s = settings({ reminderTime: '07:30' })
    expect(checkinDue(logged(), at(2026, 10, 3, 7, 29), s).todayDue).toBe(false)
    expect(checkinDue(logged(), at(2026, 10, 3, 7, 30), s).todayDue).toBe(true)
  })

  it('a midnight reminder is due as soon as the day starts', () => {
    expect(checkinDue(logged(), at(2026, 10, 3, 0, 0), settings({ reminderTime: '00:00' })).todayDue).toBe(true)
  })

  it('just after midnight the new day is not due yet and yesterday becomes backfill', () => {
    const r = checkinDue(logged(), at(2026, 10, 4, 0, 1), settings())
    expect(r).toEqual({ todayLogged: false, todayDue: false, backfill: '2026-10-03' })
  })

  it('a check-in logged just before midnight satisfies that day, not the next', () => {
    const r = checkinDue(logged('2026-10-03'), at(2026, 10, 4, 0, 1), settings())
    expect(r).toEqual({ todayLogged: false, todayDue: false, backfill: null })
  })
})

describe('checkinDue: backfill', () => {
  it('offers yesterday when it is missing', () => {
    expect(checkinDue(logged(), at(2026, 10, 3), settings()).backfill).toBe('2026-10-02')
  })

  it('is null when yesterday is logged', () => {
    expect(checkinDue(logged('2026-10-02'), at(2026, 10, 3), settings()).backfill).toBeNull()
  })

  it('only ever offers one day back', () => {
    const r = checkinDue(logged(), at(2026, 10, 3), settings())
    expect(r.backfill).toBe('2026-10-02')
  })

  it('is null on the first day of use', () => {
    expect(checkinDue(logged(), at(2026, 10, 3, 21, 0), settings({ startedOn: '2026-10-03' }))).toEqual({
      todayLogged: false,
      todayDue: true,
      backfill: null,
    })
  })

  it('is offered on the second day of use when the first was missed', () => {
    expect(checkinDue(logged(), at(2026, 10, 4), settings({ startedOn: '2026-10-03' })).backfill).toBe('2026-10-03')
  })

  it('crosses month and year boundaries', () => {
    expect(checkinDue(logged(), at(2026, 11, 1, 0, 5), settings()).backfill).toBe('2026-10-31')
    expect(checkinDue(logged(), at(2027, 1, 1, 0, 0), settings()).backfill).toBe('2026-12-31')
    expect(checkinDue(logged(), at(2028, 3, 1, 9, 0), settings()).backfill).toBe('2028-02-29')
  })

  it('uses local dates around DST changes', () => {
    // US/EU DST transition days in 2026; local getters keep these correct in any timezone.
    const s = settings({ startedOn: '2026-01-01' })
    expect(checkinDue(logged(), at(2026, 3, 8, 0, 30), s).backfill).toBe('2026-03-07')
    expect(checkinDue(logged(), at(2026, 3, 8, 23, 30), s).backfill).toBe('2026-03-07')
    expect(checkinDue(logged(), at(2026, 3, 29, 3, 30), s).backfill).toBe('2026-03-28')
    expect(checkinDue(logged(), at(2026, 3, 29, 20, 0), s).todayDue).toBe(true)
    const fallBack = checkinDue(logged(), at(2026, 11, 1, 23, 30), s)
    expect(fallBack).toEqual({ todayLogged: false, todayDue: true, backfill: '2026-10-31' })
    expect(checkinDue(logged(), at(2026, 11, 2, 0, 15), s).backfill).toBe('2026-11-01')
    expect(canLog('2026-03-07', at(2026, 3, 8, 23, 30), s)).toBe(true)
    expect(canLog('2026-03-09', at(2026, 3, 8, 0, 30), s)).toBe(false)
  })
})

describe('canLog', () => {
  const now = at(2026, 10, 3, 21, 0)

  it('allows today', () => {
    expect(canLog('2026-10-03', now, settings())).toBe(true)
  })

  it('allows any past day, including before the app was first used', () => {
    expect(canLog('2026-10-02', now, settings())).toBe(true)
    expect(canLog('2026-09-15', now, settings())).toBe(true)
    expect(canLog('2025-01-01', now, settings({ startedOn: '2026-10-03' }))).toBe(true)
  })

  it('locks future days', () => {
    expect(canLog('2026-10-04', now, settings())).toBe(false)
    expect(canLog('2027-10-03', now, settings())).toBe(false)
  })

  it('just after midnight the new day unlocks', () => {
    const justAfter = at(2026, 10, 4, 0, 1)
    expect(canLog('2026-10-04', justAfter, settings())).toBe(true)
    expect(canLog('2026-10-05', justAfter, settings())).toBe(false)
  })
})
