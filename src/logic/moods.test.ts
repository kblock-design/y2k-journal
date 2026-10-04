import { describe, expect, it } from 'vitest'
import { BASIC_CHOICES, BASIC_MOOD_KEYS, DEFAULT_SETTINGS, MOOD_ITEMS, MOOD_TRACKING_LEVELS } from '../types'
import type { Rating } from '../types'
import { hasMoodRatings, isMoodTracking, moodKeysFor, nearestBasic, pickMoods } from './moods'

describe('mood tracking levels', () => {
  it('default is advanced (today’s behaviour)', () => {
    expect(DEFAULT_SETTINGS.moodTracking).toBe('advanced')
    expect(MOOD_TRACKING_LEVELS).toEqual(['off', 'basic', 'advanced'])
  })

  it('the basic level asks four moods, each Not at all / Somewhat / A lot stored as 1, 3, 5', () => {
    expect(BASIC_MOOD_KEYS).toEqual(['moodSwings', 'irritability', 'sadness', 'anxiety'])
    expect(BASIC_CHOICES).toEqual([
      { value: 1, label: 'Not at all' },
      { value: 3, label: 'Somewhat' },
      { value: 5, label: 'A lot' },
    ])
  })

  it('moodKeysFor: none, the basic four, every mood (MOOD_ITEMS order)', () => {
    expect(moodKeysFor('off')).toEqual([])
    expect(moodKeysFor('basic')).toEqual(BASIC_MOOD_KEYS)
    expect(moodKeysFor('advanced')).toEqual(MOOD_ITEMS.map((m) => m.key))
    const order = MOOD_ITEMS.map((m) => m.key)
    expect([...moodKeysFor('basic')].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(BASIC_MOOD_KEYS)
  })

  it('nearestBasic: 1–2 → 1, 3–4 → 3, 5–6 → 5', () => {
    const got = ([1, 2, 3, 4, 5, 6] as Rating[]).map(nearestBasic)
    expect(got).toEqual([1, 1, 3, 3, 5, 5])
  })

  it('isMoodTracking accepts exactly the three levels', () => {
    for (const l of MOOD_TRACKING_LEVELS) expect(isMoodTracking(l)).toBe(true)
    for (const v of ['Advanced', '', null, undefined, 1, 'none']) expect(isMoodTracking(v)).toBe(false)
  })

  it('pickMoods keeps only rated keys that were asked for; hasMoodRatings', () => {
    expect(pickMoods({ sadness: 4, overwhelmed: 2 }, BASIC_MOOD_KEYS)).toEqual({ sadness: 4 })
    expect(pickMoods({}, BASIC_MOOD_KEYS)).toEqual({})
    expect(hasMoodRatings({})).toBe(false)
    expect(hasMoodRatings(undefined)).toBe(false)
    expect(hasMoodRatings({ anxiety: 1 })).toBe(true)
  })
})
