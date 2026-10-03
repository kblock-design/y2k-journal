// Shared data contract. Every module (db, logic, ui) codes against these types.

/** Local calendar day, 'YYYY-MM-DD'. Never a UTC timestamp. */
export type ISODate = string

export type Flow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy'

/** 1 = not at all, 2 = minimal, 3 = mild, 4 = moderate, 5 = severe, 6 = extreme. */
export type Rating = 1 | 2 | 3 | 4 | 5 | 6

export const RATING_LABELS: Record<Rating, string> = {
  1: 'Not at all',
  2: 'Minimal',
  3: 'Mild',
  4: 'Moderate',
  5: 'Severe',
  6: 'Extreme',
}

/** Emotional items rated every night. */
export const MOOD_ITEMS = [
  { key: 'moodSwings', label: 'Mood swings' },
  { key: 'irritability', label: 'Irritable / angry' },
  { key: 'sadness', label: 'Sad / hopeless' },
  { key: 'anxiety', label: 'Anxious / on edge' },
  { key: 'overwhelmed', label: 'Overwhelmed' },
  { key: 'sensitivity', label: 'Sensitive to rejection' },
  { key: 'lowInterest', label: 'Lost interest in things' },
  { key: 'concentration', label: 'Trouble concentrating' },
] as const
export type MoodKey = (typeof MOOD_ITEMS)[number]['key']

export const PHYSICAL_SYMPTOMS = [
  { key: 'cramps', label: 'Cramps' },
  { key: 'bloating', label: 'Bloating' },
  { key: 'headache', label: 'Headache' },
  { key: 'breastTenderness', label: 'Breast tenderness' },
  { key: 'backache', label: 'Backache' },
  { key: 'jointPain', label: 'Joint / muscle pain' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'acne', label: 'Acne' },
] as const
export type PhysicalKey = (typeof PHYSICAL_SYMPTOMS)[number]['key']

export type Sleep = 'poor' | 'ok' | 'good'
export type Energy = 'low' | 'ok' | 'high'
export type Cravings = 'none' | 'some' | 'strong'

/** One nightly check-in. `date` is the primary key. */
export interface DayLog {
  date: ISODate
  flow: Flow
  moods: Record<MoodKey, Rating>
  physical: PhysicalKey[]
  sleep: Sleep
  energy: Energy
  cravings: Cravings
  /** ms since epoch when the entry was saved. */
  loggedAt: number
  /** True when the entry was filled in the day after. */
  backfilled: boolean
}

export interface Settings {
  /** 'HH:MM' 24h local time the nightly check-in becomes due. */
  reminderTime: string
  /** Used until enough real cycles are logged. */
  defaultCycleLength: number
  defaultPeriodLength: number
  /** Day the app was first opened; nothing before it counts as missed. */
  startedOn: ISODate
}

export const DEFAULT_SETTINGS: Omit<Settings, 'startedOn'> = {
  reminderTime: '20:00',
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
}

export interface Pet {
  id: number
  name: string
  bornOn: ISODate
  diedOn: ISODate | null
}
