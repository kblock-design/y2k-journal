// Mood tracking levels (Settings.moodTracking). Pure helpers shared by the check-in form,
// the skins and the tests.

import { BASIC_MOOD_KEYS, MOOD_ITEMS, MOOD_TRACKING_LEVELS } from '../types'
import type { BasicRating, MoodKey, MoodTracking, Rating } from '../types'

const ALL_MOOD_KEYS: readonly MoodKey[] = MOOD_ITEMS.map((m) => m.key)

/** The moods asked about at `level`, in MOOD_ITEMS order (none when 'off'). */
export function moodKeysFor(level: MoodTracking): readonly MoodKey[] {
  if (level === 'off') return []
  if (level === 'basic') return BASIC_MOOD_KEYS
  return ALL_MOOD_KEYS
}

export function isMoodTracking(v: unknown): v is MoodTracking {
  return typeof v === 'string' && (MOOD_TRACKING_LEVELS as readonly string[]).includes(v)
}

/**
 * The basic answer nearest a stored 1–6 rating: 1–2 → 1 (not at all), 3–4 → 3 (somewhat),
 * 5–6 → 5 (a lot). For display only: the stored value is never rewritten by this.
 */
export function nearestBasic(r: Rating): BasicRating {
  return r <= 2 ? 1 : r <= 4 ? 3 : 5
}

/** Only the ratings for `keys` that `moods` actually has. */
export function pickMoods(
  moods: Partial<Record<MoodKey, Rating>>,
  keys: readonly MoodKey[],
): Partial<Record<MoodKey, Rating>> {
  const out: Partial<Record<MoodKey, Rating>> = {}
  for (const k of keys) {
    const r = moods[k]
    if (r !== undefined) out[k] = r
  }
  return out
}

/** True when at least one mood was rated. */
export function hasMoodRatings(moods: Partial<Record<MoodKey, Rating>> | undefined): boolean {
  return !!moods && ALL_MOOD_KEYS.some((k) => moods[k] !== undefined)
}
