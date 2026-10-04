import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, getLog, saveLog } from '../db'
import { BASIC_MOOD_KEYS, MOOD_ITEMS } from '../types'
import type { DayLog, MoodKey, MoodTracking, Rating } from '../types'
import { emptyLog } from './format'
import { describeLog, logHighlights } from './useCalendar'
import { BASIC_SCALE, copyPreviousInto, FULL_SCALE, moodItemsFor } from './useCheckinForm'
import { MOOD_TRACKING_OPTIONS } from './useSettingsModel'

// The check-in form's mood rules, tested through the pure functions the hook uses
// (moodItemsFor / copyPreviousInto / emptyLog) and a real save to IndexedDB.

const ALL = MOOD_ITEMS.map((m) => m.key)
const allMoods = (r: Rating) => Object.fromEntries(ALL.map((k) => [k, r])) as Record<MoodKey, Rating>

function log(date: string, moods: DayLog['moods'], extra: Partial<DayLog> = {}): DayLog {
  return {
    date,
    flow: 'none',
    moods,
    physical: [],
    sleep: 'ok',
    energy: 'ok',
    cravings: 'none',
    loggedAt: 1,
    backfilled: false,
    ...extra,
  }
}

/** A tiny stand-in for the hook's state: items wired to update `current`. */
function form(start: DayLog, level: MoodTracking) {
  let current = start
  const setMood = (key: MoodKey, rating: Rating) => {
    current = { ...current, moods: { ...current.moods, [key]: rating } }
  }
  return {
    items: () => moodItemsFor(current, level, setMood),
    get log() {
      return current
    },
  }
}

describe('new entries per level', () => {
  it('advanced: every mood, each "not at all"', () => {
    expect(emptyLog('2026-10-03').moods).toEqual(allMoods(1))
    expect(emptyLog('2026-10-03', 'advanced').moods).toEqual(allMoods(1))
    expect(Object.keys(emptyLog('2026-10-03', 'advanced').moods)).toHaveLength(MOOD_ITEMS.length)
  })

  it('advanced: the ninth mood (selfCriticism) is defaulted like the others', () => {
    const l = emptyLog('2026-10-03', 'advanced')
    expect(l.moods.selfCriticism).toBe(1)
    expect(Object.keys(l.moods)).toEqual(ALL) // MOOD_ITEMS order
  })

  it('basic: only the four basic keys', () => {
    const l = emptyLog('2026-10-03', 'basic')
    expect(Object.keys(l.moods).sort()).toEqual([...BASIC_MOOD_KEYS].sort())
    for (const k of BASIC_MOOD_KEYS) expect(l.moods[k]).toBe(1)
    expect('selfCriticism' in l.moods).toBe(false)
  })

  it('off: no mood keys at all', () => {
    expect(emptyLog('2026-10-03', 'off').moods).toEqual({})
  })
})

describe('mood items shown per level', () => {
  const stored = log('2026-10-01', { moodSwings: 2, irritability: 4, sadness: 6, anxiety: 3, overwhelmed: 5 })

  it('off: none', () => {
    expect(moodItemsFor(stored, 'off', () => {})).toEqual([])
  })

  it('advanced: every mood on the full scale; unrated ones show nothing selected', () => {
    const items = moodItemsFor(stored, 'advanced', () => {})
    expect(items.map((i) => i.key)).toEqual(ALL)
    expect(items.every((i) => i.scale === 'full' && i.options === FULL_SCALE)).toBe(true)
    expect(items.find((i) => i.key === 'irritability')).toMatchObject({ value: 4, valueLabel: 'Moderate' })
    expect(items.find((i) => i.key === 'sensitivity')).toMatchObject({ value: null, valueLabel: null })
  })

  it('basic: the four moods with the nearest answer for in-between ratings', () => {
    const items = moodItemsFor(stored, 'basic', () => {})
    expect(items.map((i) => i.key)).toEqual(BASIC_MOOD_KEYS)
    expect(items.every((i) => i.scale === 'basic' && i.options === BASIC_SCALE)).toBe(true)
    expect(items.map((i) => [i.value, i.valueLabel])).toEqual([
      [1, 'Not at all'], // 2
      [3, 'Somewhat'], // 4
      [5, 'A lot'], // 6
      [3, 'Somewhat'], // 3
    ])
    expect(BASIC_SCALE.map((o) => o.value)).toEqual([1, 3, 5])
  })

  it('basic display never rewrites the stored value; tapping an answer does', () => {
    const f = form(stored, 'basic')
    f.items() // render
    expect(f.log.moods).toEqual(stored.moods)
    f.items().find((i) => i.key === 'irritability')!.set(5)
    expect(f.log.moods.irritability).toBe(5)
    expect(f.log.moods.moodSwings).toBe(2) // untouched until tapped
  })

  it('basic and off never show the ninth mood (selfCriticism); advanced shows it after sensitivity', () => {
    expect(moodItemsFor(stored, 'basic', () => {}).map((i) => i.key)).not.toContain('selfCriticism')
    expect(moodItemsFor(stored, 'off', () => {})).toEqual([])
    const keys = moodItemsFor(stored, 'advanced', () => {}).map((i) => i.key)
    expect(keys).toHaveLength(MOOD_ITEMS.length)
    expect(keys.indexOf('selfCriticism')).toBe(keys.indexOf('sensitivity') + 1)
  })

  it('a shown mood with no rating stays unrecorded unless tapped', () => {
    const f = form(log('2026-10-01', {}), 'advanced')
    expect(f.items().every((i) => i.value === null)).toBe(true)
    f.items().find((i) => i.key === 'sadness')!.set(3)
    expect(f.log.moods).toEqual({ sadness: 3 })
  })
})

describe('editing keeps ratings the current level does not show', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('an Advanced entry edited at Basic keeps the other four ratings on save', async () => {
    const before = log('2026-10-01', { ...allMoods(4), overwhelmed: 6 })
    await saveLog(before)
    const existing = (await getLog('2026-10-01'))!
    const f = form({ ...existing, moods: { ...existing.moods } }, 'basic')
    f.items().find((i) => i.key === 'sadness')!.set(1)
    await saveLog(f.log)
    expect((await getLog('2026-10-01'))!.moods).toEqual({ ...allMoods(4), overwhelmed: 6, sadness: 1 })
  })

  it('an entry edited at Off keeps every mood rating', async () => {
    const before = log('2026-10-01', { irritability: 5, anxiety: 3 })
    await saveLog(before)
    const f = form((await getLog('2026-10-01'))!, 'off')
    expect(f.items()).toEqual([])
    await saveLog({ ...f.log, flow: 'light' })
    expect((await getLog('2026-10-01'))!.moods).toEqual({ irritability: 5, anxiety: 3 })
  })

  it('an entry saved before the ninth mood, edited at Advanced: it shows unrated and stays absent unless rated', async () => {
    const ORIGINAL_EIGHT = ALL.filter((k) => k !== 'selfCriticism')
    const old = Object.fromEntries(ORIGINAL_EIGHT.map((k) => [k, 3])) as DayLog['moods']
    await saveLog(log('2026-10-01', old))
    const f = form((await getLog('2026-10-01'))!, 'advanced')
    expect(f.items().find((i) => i.key === 'selfCriticism')).toMatchObject({ value: null, valueLabel: null })
    expect(f.items().filter((i) => i.value === 3)).toHaveLength(ORIGINAL_EIGHT.length)
    await saveLog(f.log)
    expect('selfCriticism' in (await getLog('2026-10-01'))!.moods).toBe(false)
    f.items().find((i) => i.key === 'selfCriticism')!.set(2)
    await saveLog(f.log)
    expect((await getLog('2026-10-01'))!.moods).toEqual({ ...old, selfCriticism: 2 })
  })

  it('a Basic entry edited at Advanced: the other moods stay unrecorded unless rated', async () => {
    await saveLog(log('2026-10-01', { moodSwings: 3, irritability: 5, sadness: 1, anxiety: 1 }))
    const f = form((await getLog('2026-10-01'))!, 'advanced')
    expect(f.items().find((i) => i.key === 'overwhelmed')!.value).toBeNull()
    await saveLog(f.log)
    const saved = (await getLog('2026-10-01'))!
    expect(Object.keys(saved.moods).sort()).toEqual([...BASIC_MOOD_KEYS].sort())
  })
})

describe('"Same as the day before"', () => {
  const previous = log('2026-09-30', { ...allMoods(4), sadness: 6 }, { flow: 'heavy', physical: ['cramps'], sleep: 'poor' })

  it('advanced: copies every mood and the non-mood fields', () => {
    const next = copyPreviousInto(emptyLog('2026-10-01', 'advanced'), previous, 'advanced')
    expect(next.moods).toEqual({ ...allMoods(4), sadness: 6 })
    expect(next).toMatchObject({ date: '2026-10-01', flow: 'heavy', physical: ['cramps'], sleep: 'poor' })
    expect(next.physical).not.toBe(previous.physical)
  })

  it('basic: copies only the four basic moods', () => {
    const next = copyPreviousInto(emptyLog('2026-10-01', 'basic'), previous, 'basic')
    expect(next.moods).toEqual({ moodSwings: 4, irritability: 4, sadness: 6, anxiety: 4 })
    expect(next.flow).toBe('heavy')
  })

  it('off: copies no moods', () => {
    const next = copyPreviousInto(emptyLog('2026-10-01', 'off'), previous, 'off')
    expect(next.moods).toEqual({})
    expect(next).toMatchObject({ flow: 'heavy', sleep: 'poor' })
  })

  it('a mood the day before did not rate keeps the form’s value', () => {
    const offDay = log('2026-09-30', {}, { flow: 'light' })
    const next = copyPreviousInto(emptyLog('2026-10-01', 'basic'), offDay, 'basic')
    expect(next.moods).toEqual({ moodSwings: 1, irritability: 1, sadness: 1, anxiety: 1 })
    expect(next.flow).toBe('light')
  })
})

describe('day summaries list only rated moods', () => {
  it('describeLog: a row per rated mood, none for unrated ones', () => {
    const rows = describeLog(log('2026-10-01', { irritability: 5, anxiety: 1 })).rows
    expect(rows.map((r) => r.key)).toEqual(['flow', 'irritability', 'anxiety', 'physical', 'sleep', 'energy', 'cravings'])
    expect(rows.find((r) => r.key === 'irritability')).toMatchObject({ value: 'Severe', rating: 5 })
  })

  it('describeLog / logHighlights: nothing mood-related when no mood was rated', () => {
    const l = log('2026-10-01', {}, { flow: 'light' })
    const keys = describeLog(l).rows.map((r) => r.key)
    expect(keys).toEqual(['flow', 'physical', 'sleep', 'energy', 'cravings'])
    expect(logHighlights(l)).toEqual([{ key: 'flow', text: 'Light flow' }])
    const noMoodsObject = { ...l } as Partial<DayLog>
    delete noMoodsObject.moods
    expect(logHighlights(noMoodsObject as DayLog)).toEqual([{ key: 'flow', text: 'Light flow' }])
  })

  it('logHighlights: rated moods above "not at all", highest first', () => {
    const hs = logHighlights(log('2026-10-01', { moodSwings: 1, sadness: 3, anxiety: 5 }))
    expect(hs).toEqual([
      { key: 'anxiety', text: 'Anxious / on edge: severe' },
      { key: 'sadness', text: 'Sad / hopeless: mild' },
    ])
  })
})

describe('settings copy', () => {
  it('three options in order with a one-line explanation each', () => {
    expect(MOOD_TRACKING_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['off', 'Off'],
      ['basic', 'Basic'],
      ['advanced', 'Advanced'],
    ])
    for (const o of MOOD_TRACKING_OPTIONS) expect(o.description.length).toBeGreaterThan(10)
  })

  it('the Advanced explanation counts the moods from the list', () => {
    const advanced = MOOD_TRACKING_OPTIONS.find((o) => o.value === 'advanced')!
    expect(advanced.description).toBe(`All ${MOOD_ITEMS.length} moods, rated 1 to 6.`)
    expect(advanced.description).not.toMatch(/eight/i)
  })
})
