import type { ISODate, Pet } from '../types'
import { addDays, diffDays } from './dates'

export type PetHealth = 'happy' | 'sad' | 'sick' | 'critical' | 'dead'
export type PetStage = 'egg' | 'baby' | 'teen' | 'adult'

export interface PetStatus {
  health: PetHealth
  stage: PetStage
  /** Consecutive fully-missed days immediately before today. */
  missedDays: number
  /** Consecutive logged days ending today or yesterday. */
  streak: number
  ageDays: number
  /** Set when neglect has killed the pet; the caller persists it. */
  diedOn: ISODate | null
  /** Short line the pet says on the home screen. */
  message: string
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Consecutive missed days at which each health level starts. 0 missed = happy. */
export const SAD_AT_MISSED = 1
export const SICK_AT_MISSED = 2
export const CRITICAL_AT_MISSED = 3
/** True 90s rules: this many missed days in a row and the pet is gone. */
export const DEAD_AT_MISSED = 5

/** Age in days at which each stage starts. Day 0 is the egg. */
export const BABY_AT_DAYS = 1
export const TEEN_AT_DAYS = 7
export const ADULT_AT_DAYS = 28

/** A happy pet with at least this streak (and today logged) celebrates it. */
export const STREAK_CELEBRATE_AT = 3

export function healthForMissed(missedDays: number): PetHealth {
  if (missedDays >= DEAD_AT_MISSED) return 'dead'
  if (missedDays >= CRITICAL_AT_MISSED) return 'critical'
  if (missedDays >= SICK_AT_MISSED) return 'sick'
  if (missedDays >= SAD_AT_MISSED) return 'sad'
  return 'happy'
}

export function stageForAge(ageDays: number): PetStage {
  if (ageDays >= ADULT_AT_DAYS) return 'adult'
  if (ageDays >= TEEN_AT_DAYS) return 'teen'
  if (ageDays >= BABY_AT_DAYS) return 'baby'
  return 'egg'
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type PetMessageKey =
  | 'egg'
  | 'happyBaby'
  | 'happyTeen'
  | 'happyAdult'
  | 'streak'
  | 'hungry'
  | 'hungryStreak'
  | 'sad'
  | 'sick'
  | 'critical'
  | 'dead'

/**
 * Message pools. `{n}` is replaced with the current streak.
 * Rules: first person, playful, kind; never mention periods, moods or any
 * health topic of the user (these may be shown in discreet contexts).
 */
export const PET_MESSAGES: Record<PetMessageKey, readonly string[]> = {
  egg: [
    '*wiggle wiggle* ...is somebody out there?',
    'tap tap! I think I hear you!',
    'zzz... so cozy in here... almost ready!',
    '*crack* ...not yet! five more minutes!',
  ],
  happyBaby: [
    'goo goo! you came back! <3',
    'I learned a new beep today! beep!',
    'tummy full, heart full. nap time? :3',
    "you're my favorite human. the only one, but still!",
  ],
  happyTeen: [
    "ugh, fine, I'm happy. don't make it weird. <3",
    "I'm basically a pro at being a pet now.",
    'thanks for hanging out. that was totally rad.',
    'just updated my away message: "fed & fabulous"',
  ],
  happyAdult: [
    "all fed up — in the good way! you're the best.",
    "look at us, a whole grown-up team. I'm so proud!",
    "life's sweet with you around. *happy blips*",
    'another day, another snack. thanks, bestie!',
  ],
  streak: [
    "{n} days in a row?! I'm doing a happy dance!",
    "{n}-day streak! we're unstoppable!!",
    "{n} days strong! somebody give us a trophy!",
    "streak: {n}! my pixels are sparkling for you!",
  ],
  hungry: [
    "my tummy's rumbling... check in with me tonight?",
    "*nom nom?* I'm saving room for tonight's check-in!",
    "I'll be waiting right here for our check-in! :)",
    "snack o'clock is coming... don't forget me!",
  ],
  hungryStreak: [
    "{n} days in a row! let's make it one more tonight!",
    "our {n}-day streak is so shiny... keep it going tonight?",
    "{n} days strong! don't leave me hanging tonight!",
  ],
  sad: [
    "I missed you yesterday... can we hang out?",
    "psst! there's still time to fill in yesterday for me!",
    'my screen feels a little gray today... :(',
    "I saved you a seat yesterday. it's okay, you're here now!",
  ],
  sick: [
    "*achoo!* I'm feeling kinda pixelated...",
    'a check-in would fix me right up! pretty please?',
    "I've got the glitchies... a snack would help so much.",
    "*cough* I'm okay! ...mostly. come feed me? :(",
  ],
  critical: [
    'my pixels are flickering... please check in soon!',
    "I'm fading... but I believe in you! just one check-in!",
    'low battery... need a check-in... *blip*',
    "I'm hanging on for you! please come back to me!",
  ],
  dead: [
    "x_x ...I've gone to the big arcade in the sky. hatch a new egg?",
    "boo! I'm a little ghost now. a new egg is waiting for you!",
    'GAME OVER... but every game has a new round! <3',
    "I had a great time with you. go hatch a new buddy!",
  ],
}

const MESSAGE_EPOCH: ISODate = '2000-01-01'

/** Deterministic daily pick: adjacent days always differ when the pool has 2+ entries. */
export function pickDaily<T>(pool: readonly T[], today: ISODate): T {
  const n = pool.length
  const i = ((diffDays(MESSAGE_EPOCH, today) % n) + n) % n
  return pool[i]
}

export function petMessageKey(
  health: PetHealth,
  stage: PetStage,
  streak: number,
  todayLogged: boolean,
): PetMessageKey {
  if (health === 'dead') return 'dead'
  if (stage === 'egg') return 'egg'
  if (health !== 'happy') return health
  if (!todayLogged) return streak >= STREAK_CELEBRATE_AT ? 'hungryStreak' : 'hungry'
  if (streak >= STREAK_CELEBRATE_AT) return 'streak'
  if (stage === 'baby') return 'happyBaby'
  if (stage === 'teen') return 'happyTeen'
  return 'happyAdult'
}

export function petMessage(
  health: PetHealth,
  stage: PetStage,
  streak: number,
  todayLogged: boolean,
  today: ISODate,
): string {
  const key = petMessageKey(health, stage, streak, todayLogged)
  return pickDaily(PET_MESSAGES[key], today).replace('{n}', String(streak))
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * First day the pet died of neglect, scanning its whole life (bornOn .. yesterday):
 * the day after the DEAD_AT_MISSED-th consecutive unlogged day. Null if it never happened.
 */
export function findDeathDate(pet: Pet, loggedDates: Set<ISODate>, today: ISODate): ISODate | null {
  const lastCompleteDay = addDays(today, -1)
  let run = 0
  for (let d = pet.bornOn; d <= lastCompleteDay; d = addDays(d, 1)) {
    if (loggedDates.has(d)) {
      run = 0
    } else if (++run >= DEAD_AT_MISSED) {
      return addDays(d, 1)
    }
  }
  return null
}

export function petStatus(pet: Pet, loggedDates: Set<ISODate>, today: ISODate): PetStatus {
  // Missed days: walk back from yesterday, never before bornOn. Today never counts.
  let missedDays = 0
  for (let d = addDays(today, -1); d >= pet.bornOn && !loggedDates.has(d); d = addDays(d, -1)) {
    missedDays++
  }

  // Streak: consecutive logged days ending today (if logged) or yesterday.
  const todayLogged = loggedDates.has(today)
  let streak = 0
  for (let d = todayLogged ? today : addDays(today, -1); loggedDates.has(d); d = addDays(d, -1)) {
    streak++
  }

  const diedOn = pet.diedOn ?? findDeathDate(pet, loggedDates, today)
  const health: PetHealth = diedOn ? 'dead' : healthForMissed(missedDays)

  // A dead pet stays the age (and stage) it was when it died.
  const ageDays = Math.max(0, diffDays(pet.bornOn, diedOn ?? today))
  const stage = stageForAge(ageDays)

  return {
    health,
    stage,
    missedDays,
    streak,
    ageDays,
    diedOn,
    message: petMessage(health, stage, streak, todayLogged, today),
  }
}
