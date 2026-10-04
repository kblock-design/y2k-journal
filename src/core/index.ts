// The skin-agnostic core: everything a skin needs that isn't presentation.
// Skins import from here (or the individual files). See src/skins/README.md.

export { useAppData } from './useAppData'
export type { AppData, LoadState } from './useAppData'
export { TAB_LABELS, TABS, useAppController } from './useAppController'
export type { AppController, AppControllerOptions, OpenCheckin, Tab } from './useAppController'
export {
  BASIC_SCALE,
  checkinTitle,
  CRAVINGS,
  ENERGIES,
  FLOWS,
  FULL_SCALE,
  RATINGS,
  SLEEPS,
  useCheckinForm,
} from './useCheckinForm'
export type { CheckinForm, CheckinMoodItem, MoodOption } from './useCheckinForm'
export { PET_NAME_MAX, useHatchForm } from './useHatchForm'
export { describeLog, logHighlights, PHASES, useCalendar, WEEKDAYS } from './useCalendar'
export type { CalendarCell, CalendarModel, LogSummary } from './useCalendar'
export { IMPORT_WARNING, MAX_CYCLE, MIN_CYCLE, MOOD_TRACKING_OPTIONS, useSettingsModel } from './useSettingsModel'
export type { GraveyardEntry, SettingsModel, SettingsStatus } from './useSettingsModel'
export {
  DASH,
  dayRange,
  daysText,
  isNum,
  LEVEL_LABELS,
  monthYear,
  MOODS_OFF_ACTION,
  MOODS_OFF_COPY,
  moodsOff,
  moodTracked,
  NOT_TRACKED,
  num,
  one,
  pct,
  PHASE_ABBR,
  reasonCopy,
  REGULARITY_WORDS,
  scalePos,
  shortDate,
  signed,
  useCycleStats,
  useCycleStatus,
  useStreaks,
} from './stats'
export type { Streaks } from './stats'
export { useDialog } from './useDialog'
export { ErrorBoundary } from './ErrorBoundary'
export { capitalize, emptyLog, errorMessage, formatDay, formatLongDate, formatMonth, PHASE_LABELS, plural } from './format'
export { dailyFact, dailyQuote } from './daily'
export type { Quote } from './daily'
export { openedOutsideHomeScreen } from './reminders'
export { createPref, usePref } from './prefs'
export type { Pref } from './prefs'
export { activeSkin, resetSkin, setSkin, SKINS } from './skin'
export type { SkinInfo } from './skin'
