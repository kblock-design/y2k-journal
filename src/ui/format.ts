import type { Phase } from '../logic/cycle'
import { fromISODate } from '../logic/dates'
import type { DayLog, ISODate, MoodKey, Rating } from '../types'
import { MOOD_ITEMS } from '../types'

export const PHASE_LABELS: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
}

/** "Fri 2 Oct" */
export function formatDay(date: ISODate): string {
  return fromISODate(date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "2 Oct 2026" */
export function formatLongDate(date: ISODate): string {
  return fromISODate(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** "October 2026" */
export function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1, 12).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** A symptom-free day: what the check-in form starts with. */
export function emptyLog(date: ISODate): DayLog {
  const moods = Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, 1])) as Record<MoodKey, Rating>
  return {
    date,
    flow: 'none',
    moods,
    physical: [],
    sleep: 'ok',
    energy: 'ok',
    cravings: 'none',
    loggedAt: 0,
    backfilled: false,
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
