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
  { key: 'selfCriticism', label: 'Negative self-talk' },
  { key: 'lowInterest', label: 'Lost interest in things' },
  { key: 'concentration', label: 'Trouble concentrating' },
] as const
export type MoodKey = (typeof MOOD_ITEMS)[number]['key']

/**
 * How much mood detail the check-in asks for (Settings.moodTracking):
 * - 'off': no mood questions at all;
 * - 'basic': the four BASIC_MOOD_KEYS, each one of BASIC_CHOICES;
 * - 'advanced': every MOOD_ITEMS entry on the full 1–6 scale.
 * Older entries keep whatever was recorded when the level changes.
 */
export type MoodTracking = 'off' | 'basic' | 'advanced'

/** Levels in display order (least to most detail). */
export const MOOD_TRACKING_LEVELS: readonly MoodTracking[] = ['off', 'basic', 'advanced']

/** The moods asked about at the 'basic' level, in MOOD_ITEMS order. */
export const BASIC_MOOD_KEYS: readonly MoodKey[] = ['moodSwings', 'irritability', 'sadness', 'anxiety']

/**
 * The three 'basic' answers. They are stored on the same 1–6 scale as 'advanced' ratings
 * (1, 3 and 5) so statistics treat both levels alike.
 */
export const BASIC_CHOICES = [
  { value: 1, label: 'Not at all' },
  { value: 3, label: 'Somewhat' },
  { value: 5, label: 'A lot' },
] as const satisfies readonly { value: Rating; label: string }[]
export type BasicRating = (typeof BASIC_CHOICES)[number]['value']

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
  /**
   * Only the moods that were rated that day. A missing key means "not recorded" (mood
   * tracking was off or at a level that didn't ask), never "not at all" (that is 1).
   * Entries saved before mood levels existed have the original eight keys; entries saved
   * before a mood was added (e.g. selfCriticism) lack that key, which is "not recorded" too.
   */
  moods: Partial<Record<MoodKey, Rating>>
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
  /** Mood detail asked in the check-in. Rows saved before this existed read as 'advanced'. */
  moodTracking: MoodTracking
}

export const DEFAULT_SETTINGS: Omit<Settings, 'startedOn'> = {
  reminderTime: '20:00',
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  moodTracking: 'advanced',
}

export interface Pet {
  id: number
  name: string
  bornOn: ISODate
  diedOn: ISODate | null
}
