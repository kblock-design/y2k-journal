// Pure helpers for the Home screen (kept out of the component file so they can be tested).

import { formatDay, plural } from '../../core/format'
import { addDays, fromISODate } from '../../logic/dates'
import type { DayLog, ISODate } from '../../types'

/** "Next period in 23 days · Mon 26 Oct", "… tomorrow", "Period expected today", "Period 4 days late". */
export function nextPeriodLine(days: number | null, nextPeriod: ISODate | null): string | null {
  if (days === null || !Number.isFinite(days)) return null
  if (days > 1) return `Next period in ${days} days${nextPeriod ? ` · ${formatDay(nextPeriod)}` : ''}`
  if (days === 1) return 'Next period expected tomorrow'
  if (days === 0) return 'Period expected today'
  return `Period ${plural(-days, 'day')} late`
}

/** The streak's one-line note. */
export function streakLine(current: number, loggedToday: boolean, isBest: boolean): string {
  if (current <= 0) return 'Check in tonight to start a fresh run.'
  if (!loggedToday) return `Check in tonight to make it ${current + 1} in a row.`
  if (isBest && current > 1) return `${current} days in a row, your best run yet.`
  return `${plural(current, 'day')} in a row, today included.`
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

export interface WeekDay {
  date: ISODate
  /** Single weekday letter, Sunday = S. */
  letter: string
  logged: boolean
  isToday: boolean
}

/** The last seven days, oldest first, with whether each was checked in. */
export function lastSevenDays(logs: DayLog[], today: ISODate): WeekDay[] {
  const logged = new Set(logs.map((l) => l.date))
  const out: WeekDay[] = []
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i)
    out.push({ date, letter: WEEKDAY_LETTERS[fromISODate(date).getDay()], logged: logged.has(date), isToday: i === 0 })
  }
  return out
}
