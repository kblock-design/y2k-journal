import { describe, it, expect } from 'vitest'
import type { ISODate, Pet } from '../types'
import { addDays } from './dates'
import {
  ADULT_AT_DAYS,
  BABY_AT_DAYS,
  CRITICAL_AT_MISSED,
  DEAD_AT_MISSED,
  PET_MESSAGES,
  SAD_AT_MISSED,
  SICK_AT_MISSED,
  STREAK_CELEBRATE_AT,
  TEEN_AT_DAYS,
  healthForMissed,
  petMessage,
  petMessageKey,
  petStatus,
  pickDaily,
  stageForAge,
} from './pet'

const TODAY: ISODate = '2026-10-03'

const mkPet = (bornOn: ISODate, diedOn: ISODate | null = null): Pet => ({ id: 1, name: 'Bitsy', bornOn, diedOn })

/** All days from `from` to `to` inclusive. */
function range(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
const set = (...groups: ISODate[][]) => new Set(groups.flat())

/** Pet born `age` days ago, logged every day from birth up to and including `lastLogged`. */
function scenario(age: number, lastLogged: ISODate, today = TODAY) {
  const bornOn = addDays(today, -age)
  return { pet: mkPet(bornOn), logs: set(range(bornOn, lastLogged)) }
}

describe('threshold constants', () => {
  it('match the spec', () => {
    expect([SAD_AT_MISSED, SICK_AT_MISSED, CRITICAL_AT_MISSED, DEAD_AT_MISSED]).toEqual([1, 2, 3, 5])
    expect([BABY_AT_DAYS, TEEN_AT_DAYS, ADULT_AT_DAYS]).toEqual([1, 7, 28])
  })

  it('healthForMissed maps each level', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 100].map(healthForMissed)).toEqual([
      'happy', 'sad', 'sick', 'critical', 'critical', 'dead', 'dead', 'dead',
    ])
  })

  it('stageForAge maps each stage boundary', () => {
    expect([0, 1, 6, 7, 27, 28, 500].map(stageForAge)).toEqual([
      'egg', 'baby', 'baby', 'teen', 'teen', 'adult', 'adult',
    ])
  })
})

describe('petStatus: newly hatched', () => {
  it('is a happy egg with nothing missed on day 0', () => {
    const s = petStatus(mkPet(TODAY), new Set(), TODAY)
    expect(s).toMatchObject({ health: 'happy', stage: 'egg', missedDays: 0, streak: 0, ageDays: 0, diedOn: null })
    expect(PET_MESSAGES.egg).toContain(s.message)
  })

  it('ignores missed days before bornOn (e.g. after the previous pet died)', () => {
    const s = petStatus(mkPet(TODAY), set(range('2026-09-01', '2026-09-10')), TODAY)
    expect(s.health).toBe('happy')
    expect(s.missedDays).toBe(0)
    expect(s.diedOn).toBeNull()
  })

  it('counts only days since bornOn as missed', () => {
    expect(petStatus(mkPet(addDays(TODAY, -1)), new Set(), TODAY)).toMatchObject({ missedDays: 1, health: 'sad', stage: 'baby' })
    expect(petStatus(mkPet(addDays(TODAY, -2)), new Set(), TODAY)).toMatchObject({ missedDays: 2, health: 'sick' })
    expect(petStatus(mkPet(addDays(TODAY, -4)), new Set(), TODAY)).toMatchObject({ missedDays: 4, health: 'critical' })
    expect(petStatus(mkPet(addDays(TODAY, -5)), new Set(), TODAY)).toMatchObject({ missedDays: 5, health: 'dead', diedOn: TODAY })
  })

  it('treats a bornOn in the future as a fresh egg', () => {
    expect(petStatus(mkPet(addDays(TODAY, 2)), new Set(), TODAY)).toMatchObject({ health: 'happy', stage: 'egg', ageDays: 0, missedDays: 0 })
  })
})

describe('petStatus: health by missed days', () => {
  const cases: Array<[number, string]> = [
    [0, 'happy'],
    [1, 'sad'],
    [2, 'sick'],
    [3, 'critical'],
    [4, 'critical'],
    [5, 'dead'],
    [6, 'dead'],
  ]
  for (const [missed, health] of cases) {
    it(`${missed} missed -> ${health}`, () => {
      const { pet, logs } = scenario(20, addDays(TODAY, -1 - missed))
      const s = petStatus(pet, logs, TODAY)
      expect(s.missedDays).toBe(missed)
      expect(s.health).toBe(health)
      expect(s.diedOn === null).toBe(health !== 'dead')
    })
  }

  it('today being unlogged never counts as missed', () => {
    const { pet, logs } = scenario(10, addDays(TODAY, -1))
    expect(logs.has(TODAY)).toBe(false)
    expect(petStatus(pet, logs, TODAY)).toMatchObject({ missedDays: 0, health: 'happy' })
  })

  it('yesterday still counts as missed even if today is logged', () => {
    const { pet, logs } = scenario(10, addDays(TODAY, -2))
    logs.add(TODAY)
    expect(petStatus(pet, logs, TODAY)).toMatchObject({ missedDays: 1, health: 'sad' })
  })

  it('backfilling yesterday recovers health', () => {
    const { pet, logs } = scenario(10, addDays(TODAY, -3))
    expect(petStatus(pet, logs, TODAY).health).toBe('sick')
    logs.add(addDays(TODAY, -1))
    expect(petStatus(pet, logs, TODAY)).toMatchObject({ missedDays: 0, health: 'happy', streak: 1 })
  })

  it('backfilling yesterday rescues a critical pet', () => {
    const { pet, logs } = scenario(10, addDays(TODAY, -5))
    expect(petStatus(pet, logs, TODAY)).toMatchObject({ missedDays: 4, health: 'critical' })
    logs.add(addDays(TODAY, -1))
    expect(petStatus(pet, logs, TODAY).health).toBe('happy')
  })
})

describe('petStatus: death', () => {
  it('diedOn is the day after the 5th consecutive missed day', () => {
    // last log 6 days ago -> missed days are -5..-1; 5th missed day is yesterday.
    const { pet, logs } = scenario(20, addDays(TODAY, -6))
    expect(petStatus(pet, logs, TODAY).diedOn).toBe(TODAY)
    // last log 8 days ago -> 5th missed day was 3 days ago.
    const b = scenario(20, addDays(TODAY, -8))
    expect(petStatus(b.pet, b.logs, TODAY).diedOn).toBe(addDays(TODAY, -2))
  })

  it('stays dead after backfilling following a fatal gap', () => {
    const { pet, logs } = scenario(20, addDays(TODAY, -7))
    logs.add(addDays(TODAY, -1))
    logs.add(TODAY)
    const s = petStatus(pet, logs, TODAY)
    expect(s.health).toBe('dead')
    expect(s.diedOn).toBe(addDays(TODAY, -1))
    expect(s.missedDays).toBe(0)
  })

  it('finds an earlier 5-day gap in the middle of the pet life', () => {
    const bornOn = addDays(TODAY, -30)
    const logs = set(range(bornOn, addDays(TODAY, -21)), range(addDays(TODAY, -15), TODAY))
    const s = petStatus(mkPet(bornOn), logs, TODAY)
    expect(s.health).toBe('dead')
    expect(s.diedOn).toBe(addDays(TODAY, -15))
    expect(s.missedDays).toBe(0)
    expect(s.ageDays).toBe(15)
  })

  it('an earlier 4-day gap is survivable', () => {
    const bornOn = addDays(TODAY, -30)
    const logs = set(range(bornOn, addDays(TODAY, -21)), range(addDays(TODAY, -16), TODAY))
    expect(petStatus(mkPet(bornOn), logs, TODAY)).toMatchObject({ health: 'happy', diedOn: null })
  })

  it('reports the first fatal gap when there are several', () => {
    const bornOn = '2026-08-01'
    const logs = set(range('2026-08-07', '2026-08-31'), range('2026-09-10', TODAY))
    // missed 08-01..08-06: 5th missed day is 08-05, so died 08-06.
    expect(petStatus(mkPet(bornOn), logs, TODAY).diedOn).toBe('2026-08-06')
  })

  it('a gap of 5 starting on bornOn kills the pet', () => {
    const bornOn = addDays(TODAY, -10)
    const logs = set(range(addDays(bornOn, 5), TODAY))
    expect(petStatus(mkPet(bornOn), logs, TODAY).diedOn).toBe(addDays(bornOn, 5))
  })

  it('an already-dead pet stays dead with its stored date', () => {
    const bornOn = addDays(TODAY, -40)
    const pet = mkPet(bornOn, addDays(TODAY, -10))
    const s = petStatus(pet, set(range(bornOn, TODAY)), TODAY)
    expect(s.health).toBe('dead')
    expect(s.diedOn).toBe(addDays(TODAY, -10))
    expect(s.ageDays).toBe(30)
    expect(s.stage).toBe('adult')
    expect(PET_MESSAGES.dead).toContain(s.message)
  })

  it('a dead pet keeps the stage it died at', () => {
    const bornOn = addDays(TODAY, -40)
    const s = petStatus(mkPet(bornOn, addDays(bornOn, 3)), new Set(), TODAY)
    expect(s).toMatchObject({ ageDays: 3, stage: 'baby', health: 'dead' })
  })

  it('handles a gap across month and year boundaries', () => {
    const today = '2027-01-02'
    const bornOn = '2026-12-01'
    const logs = set(range(bornOn, '2026-12-27'))
    // missed 12-28, 12-29, 12-30, 12-31, 01-01 -> died 01-02
    const s = petStatus(mkPet(bornOn), logs, today)
    expect(s.missedDays).toBe(5)
    expect(s.diedOn).toBe('2027-01-02')
    const t = petStatus(mkPet(bornOn), set(range(bornOn, '2026-12-29')), today)
    expect(t).toMatchObject({ missedDays: 3, health: 'critical', diedOn: null })
  })
})

describe('petStatus: streak', () => {
  it('counts consecutive days ending today when today is logged', () => {
    const logs = set(range(addDays(TODAY, -3), TODAY))
    expect(petStatus(mkPet('2026-01-01'), logs, TODAY).streak).toBe(4)
  })

  it('counts consecutive days ending yesterday when today is not logged', () => {
    const logs = set(range(addDays(TODAY, -3), addDays(TODAY, -1)))
    expect(petStatus(mkPet('2026-01-01'), logs, TODAY).streak).toBe(3)
  })

  it('is 1 when only today is logged', () => {
    expect(petStatus(mkPet(addDays(TODAY, -3)), set([TODAY]), TODAY).streak).toBe(1)
  })

  it('is 0 when neither today nor yesterday is logged', () => {
    const logs = set(range(addDays(TODAY, -10), addDays(TODAY, -2)))
    expect(petStatus(mkPet('2026-01-01'), logs, TODAY).streak).toBe(0)
  })

  it('stops at a gap', () => {
    const logs = set(range(addDays(TODAY, -10), addDays(TODAY, -5)), range(addDays(TODAY, -2), TODAY))
    expect(petStatus(mkPet('2026-01-01'), logs, TODAY).streak).toBe(3)
  })

  it('runs across a year boundary', () => {
    expect(petStatus(mkPet('2026-12-01'), set(range('2026-12-29', '2027-01-02')), '2027-01-02').streak).toBe(5)
  })
})

describe('petStatus: stage by age', () => {
  const cases: Array<[number, string]> = [
    [0, 'egg'],
    [1, 'baby'],
    [6, 'baby'],
    [7, 'teen'],
    [27, 'teen'],
    [28, 'adult'],
    [365, 'adult'],
  ]
  for (const [age, stage] of cases) {
    it(`age ${age} -> ${stage}`, () => {
      const { pet, logs } = scenario(age, TODAY)
      const s = petStatus(pet, logs, TODAY)
      expect(s.ageDays).toBe(age)
      expect(s.stage).toBe(stage)
      expect(s.health).toBe('happy')
    })
  }
})

describe('messages', () => {
  const allMessages = Object.values(PET_MESSAGES).flat()

  it('every pool has several non-empty variants', () => {
    for (const [key, pool] of Object.entries(PET_MESSAGES)) {
      expect(pool.length, key).toBeGreaterThanOrEqual(3)
      for (const m of pool) expect(m.trim().length, key).toBeGreaterThan(0)
    }
  })

  it('never mentions periods, moods or health topics', () => {
    const banned = /period|menstr|cycle|mood|symptom|cramp|pain|bleed|flow|pms|health|hormone|anxi|depress|ovulat|fertil|pregnan|medic|doctor/i
    for (const m of allMessages) expect(m).not.toMatch(banned)
  })

  it('is deterministic for the same inputs', () => {
    const { pet, logs } = scenario(10, addDays(TODAY, -3))
    expect(petStatus(pet, logs, TODAY).message).toBe(petStatus(pet, logs, TODAY).message)
  })

  it('varies from one day to the next', () => {
    const pool = PET_MESSAGES.sad
    expect(pickDaily(pool, '2026-10-03')).not.toBe(pickDaily(pool, '2026-10-04'))
    const seen = new Set(range('2026-10-01', '2026-10-31').map((d) => pickDaily(pool, d)))
    expect(seen.size).toBe(pool.length)
  })

  it('is always non-empty and has no leftover placeholder across many states and days', () => {
    for (const d of range('2026-01-01', '2026-03-01')) {
      for (const health of ['happy', 'sad', 'sick', 'critical', 'dead'] as const) {
        for (const stage of ['egg', 'baby', 'teen', 'adult'] as const) {
          for (const streak of [0, 1, 3, 12]) {
            for (const logged of [true, false]) {
              const m = petMessage(health, stage, streak, logged, d)
              expect(m.length).toBeGreaterThan(0)
              expect(m).not.toContain('{n}')
            }
          }
        }
      }
    }
  })

  it('picks the right pool for each state', () => {
    expect(petMessageKey('dead', 'adult', 10, true)).toBe('dead')
    expect(petMessageKey('happy', 'egg', 0, false)).toBe('egg')
    expect(petMessageKey('sad', 'teen', 0, true)).toBe('sad')
    expect(petMessageKey('sick', 'teen', 0, false)).toBe('sick')
    expect(petMessageKey('critical', 'baby', 0, false)).toBe('critical')
    expect(petMessageKey('happy', 'baby', 1, false)).toBe('hungry')
    expect(petMessageKey('happy', 'baby', STREAK_CELEBRATE_AT, false)).toBe('hungryStreak')
    expect(petMessageKey('happy', 'teen', STREAK_CELEBRATE_AT, true)).toBe('streak')
    expect(petMessageKey('happy', 'baby', 1, true)).toBe('happyBaby')
    expect(petMessageKey('happy', 'teen', 2, true)).toBe('happyTeen')
    expect(petMessageKey('happy', 'adult', 2, true)).toBe('happyAdult')
  })

  it('celebrates the streak with its number', () => {
    const { pet, logs } = scenario(10, TODAY)
    const s = petStatus(pet, logs, TODAY)
    expect(s.streak).toBe(11)
    expect(s.message).toContain('11')
  })

  it('a sick pet says a sick line', () => {
    const { pet, logs } = scenario(10, addDays(TODAY, -3))
    expect(PET_MESSAGES.sick).toContain(petStatus(pet, logs, TODAY).message)
  })
})
