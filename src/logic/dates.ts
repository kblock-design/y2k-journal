import type { ISODate } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day of a Date. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local-noon Date for a calendar day (noon avoids DST edge cases). */
export function fromISODate(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = fromISODate(date)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000)
}
