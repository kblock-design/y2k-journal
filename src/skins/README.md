# Skins

The Burn Book is one data/logic core with interchangeable **skins**. A skin owns *all*
presentation: shell, navigation, screens, copy tone, CSS, fonts. It owns no rules: what is
due, what is saved, how numbers are computed all come from `src/core` (hooks) and
`src/logic` / `src/db` (never modify those two folders).

```
src/
  main.tsx          renders <App/>, no CSS
  App.tsx           skin host: lazy-loads the active skin, neutral loading/failure states
  core/             skin-agnostic hooks and helpers (import from 'src/core' or the files)
  skins/
    index.ts        registry: SKINS, DEFAULT_SKIN
    types.ts        SkinInfo / SkinModule contract
    y2k/            reference skin (index.tsx entry, App.tsx root, y2k.css, …)
```

Only the active skin's chunk (JS + CSS + fonts) is loaded. Switching skins stores the choice
(`localStorage['burn-book:skin']`) and reloads the page, so two skins never share a document.

## Adding a skin

1. Create `src/skins/<key>/index.tsx`. It imports the skin's fonts, then its stylesheet(s),
   then default-exports the root component (takes **no props**):
   ```tsx
   import '@fontsource/playfair-display/latin-400.css'
   import './editorial.css'
   import { EditorialApp } from './App'
   export default EditorialApp
   ```
2. Add one entry to `SKINS` in `src/skins/index.ts`:
   ```ts
   { key: 'editorial', label: 'Editorial', description: 'Red and cream, set in serif.', usesPet: false,
     load: () => import('./editorial') },
   ```
   `key` = folder name = stored value; never rename it. Nothing else to wire up.

Don't import from another skin's folder (it would pull that skin's CSS into yours). Only
import `src/core`, `src/logic`, `src/db` types, `src/types.ts` and your own folder.

## The pet is per skin (`usesPet`)

Only Y2K has the virtual pet. A skin with `usesPet: false` renders **no** hatch flow, pet,
memorial or graveyard, and uses streaks (`useStreaks`) as its motivation element instead.

What the core does regardless of skin:
- Pet rows stay in the database (and in backups/imports). A living pet keeps ageing and can
  still die of neglect while a no-pet skin is active: `useAppController` computes the pet's
  status in every skin and persists a detected death. Switching back to Y2K shows the true
  state (alive, sick, or a memorial).
- First run differs: pet skins don't block on a check-in before the first pet is hatched
  (`needsFirstPet`). No-pet skins block from first launch: on day one `settings.startedOn` is
  today, so there's no backfill, and today's check-in blocks only after the reminder time.
  Days before `startedOn` are never asked about. Use `app.noLogsYet` to show a short welcome
  on Home (good place for "Moving from another phone? Import a backup in Settings").

## Root component pattern

```tsx
import { errorMessage, useAppData, useAppController, ErrorBoundary, TAB_LABELS } from '../../core'
import type { AppData } from '../../core'

export function EditorialApp() {
  const { state, reload } = useAppData()
  if (state.status === 'loading') return <Loading />
  if (state.status === 'error')
    return <LoadFailed message={errorMessage(state.error)} onRetry={() => void reload()} />
  return <Ready data={state.data} reload={reload} />
}

function Ready({ data, reload }: { data: AppData; reload: () => Promise<void> }) {
  const app = useAppController(data, reload)
  return (
    <>
      <div inert={app.checkin !== null}>
        {app.outsideHomeScreen && <SafariBanner />}
        <ErrorBoundary key={app.tab} label={TAB_LABELS[app.tab]} fallback={(e, retry) => <Oops e={e} retry={retry} />}>
          {app.tab === 'home' && <Home app={app} />}
          {/* calendar, stats, settings */}
        </ErrorBoundary>
        <Nav tab={app.tab} onChange={app.setTab} />
        {app.alarmPrompt && (
          <AlarmPrompt key={app.alarmPrompt.date} date={app.alarmPrompt.date} onDismiss={app.dismissAlarmPrompt} />
        )}
      </div>
      {app.checkin && (
        <Checkin key={app.checkin.date} {...app.checkin} today={app.today}
          onClose={app.closeCheckin} onSaved={app.onCheckinSaved} />
      )}
    </>
  )
}
```
Wrap the whole root in an `ErrorBoundary` too (a skin-styled page error). `src/App.tsx` has a
last-resort unstyled one.

## Checklist: every state a skin must render

- [ ] **Loading** (`useAppData` → `loading`) and **load error** with retry.
- [ ] **Safari banner** when `app.outsideHomeScreen` (data in Safari is separate from the
      Home Screen app; tell them to open it from the icon). `role="alert"`.
- [ ] **Navigation** between `home | calendar | stats | settings` (`TABS`, `app.tab`, `app.setTab`).
- [ ] **Home**: cycle card (`useCycleStatus`: `cycleDay === null` → "no period logged yet";
      else day N, phase, "estimate" when `usingDefault`, next-period line incl. late/today/
      tomorrow), today's check-in state (`app.todayLogged` → done + "Edit today", else a big
      "Check in" → `app.openCheckin(app.today)`), daily quote/fact (`dailyQuote(today)`,
      `dailyFact(today)`, optional).
      Pet skins: hatch flow when `app.needsFirstPet` (with a link to import in Settings),
      pet when `app.petStatus`, memorial for `app.memorialPet` + "Hatch a new one".
      No-pet skins: streaks (`useStreaks`), welcome when `app.noLogsYet`.
- [ ] **Check-in, voluntary**: closable (button, Escape, backdrop) via `app.closeCheckin`.
- [ ] **Check-in, blocking** (`app.checkin.blocking`): no close affordance at all; explain
      why ("You missed this day — fill it in to continue." / "Time for tonight's check-in.")
      and that an empty Save is fine. Rest of the app `inert`.
- [ ] **Backfill then today**: after saving yesterday, the same slot immediately shows
      today's (if due). Key the form by date so it resets; the form stays "Saving…" meanwhile.
- [ ] **Edit vs new**: "Save changes" when `form.isEdit`; title from `checkinTitle(date, today)`.
- [ ] **Mood tracking level** (`settings.moodTracking`, pass it to `useCheckinForm`): render the
      mood section from `form.moodItems` only. Empty (level `'off'`) → no mood section at all,
      not even a heading. `item.scale === 'basic'` → a three-way choice (`item.options`: Not at
      all / Somewhat / A lot) in the skin's segmented/chip style; `'full'` → the usual 1–6 row.
      `item.value === null` = not rated in this entry: nothing selected (e.g. "Not rated").
      Always `item.set(option.value)`; never write a rating the user didn't tap.
- [ ] **"Same as the day before"** button when `form.previous` → `form.copyPrevious()`.
- [ ] Form load error + retry (`form.loadError`, `form.retryLoad`); save error (`form.saveError`).
- [ ] **Calendar**: month nav, weekday header, phase per day (predicted after today), logged
      dot, bleeding/spotting marks, today, selection, disabled future days (`cell.canLog`),
      `cell.label` as the accessible name, legend (collapsed behind a small "key" control so
      the grid stays short). **Pinned day bar** for `selected`: a slim bar fixed just above
      the navigation, always visible without scrolling, showing the date, the day at a glance
      (`logHighlights(selectedLog)`: only what was logged as non-default, and only rated
      moods (an unrated mood is "not recorded", never "not at all"); "Nothing to report"
      when empty; "Nothing logged" when there is no entry) and the "Add entry"/"Edit" button →
      `app.openCheckin(selected)`. Tapping the bar expands it upward (not a modal: no
      backdrop, the calendar stays usable) to the full list from `describeLog(selectedLog)`.
      Leave bottom padding on the page so the bar never covers the last calendar row.
- [ ] **Stats** (`useCycleStats`): zero-logs empty state; highlights or the unlock list;
      cycle numbers; before-vs-after; mood by phase; body & lifestyle; logging habits. Every
      unavailable section says why and what unlocks it (`reasonCopy(reason, stats)`), never
      placeholder zeros. Not-a-diagnosis footer. The Y2K `StatsScreen.tsx` is the reference
      for which fields drive each section. **Moods**: a mood never rated (`moodTracked(stats,
      key)` false, i.e. `stats.moodTotals.items[i].days === 0`) shows `NOT_TRACKED` in its row
      or cells instead of a number. When `moodsOff(settings, stats)` (tracking off AND no mood
      ever rated), the Overview's mood copy (unlock steps about moods, "Mood patterns unlock…")
      and the Moods view are replaced by one line, `MOODS_OFF_COPY` + a `MOODS_OFF_ACTION`
      button to Settings. With any mood history the mood stats work whatever the setting.
- [ ] **Settings** (`useSettingsModel`): reminder time, cycle length (validation message),
      **mood tracking** in the Check-in group (`MOOD_TRACKING_OPTIONS`, real buttons with
      `aria-pressed` or a radiogroup, ≥ 44px; the current option's `description` as one line;
      `model.moodTracking` / `model.setMoodTracking(level)`),
      export JSON + CSV, import with confirmation, status lines (`role="status"`), privacy
      note (data never leaves the device), **skin switcher** (`SKINS`, `activeSkin()`,
      `setSkin(key)`). Pet skins: graveyard (`model.graveyard`).
- [ ] **Settings › Reminders** (after Check-in; title `ALARM_COPY.title`): `ALARM_COPY.intro`
      as one line; the setup steps (`REMINDER_SETUP_STEPS`, a numbered `<ol>`, numbers drawn
      by you) behind a disclosure (`ALARM_COPY.setup` expander with `aria-expanded`, or a
      collapsed window) and *above* the switch (step 4 says "the switch below"); the switch
      `ALARM_COPY.switchLabel` (`role="switch"` + `aria-checked`, ≥ 44px, whole row the target;
      `useAlarmShortcut()` / `alarmShortcutPref.set('on' | 'off')`); a ≥ 44px
      `ALARM_COPY.test` button → `runDoneShortcut(today)`. Never say "alarm" in copy.
- [ ] **After-save prompt** while `app.alarmPrompt` is set: a small **non-modal** card
      (`role="dialog"`, `aria-modal="false"`, labelled by `ALARM_COPY.prompt`) above the
      navigation and clear of the bottom safe area; render it inside the app container (so it
      goes inert with a check-in) and never put a backdrop behind it. Primary
      `ALARM_COPY.confirm` → `runDoneShortcut(app.alarmPrompt.date)` then
      `app.dismissAlarmPrompt()`; secondary `ALARM_COPY.notNow` → `app.dismissAlarmPrompt()`.
      Moving focus to it once is fine; trapping it is not. Escape dismisses. It goes away by
      itself on `setTab` / `openCheckin`. Wrap it in an `ErrorBoundary` whose fallback is
      `null` (it's optional; a crash must not block the app).
- [ ] Per-section **error boundaries** (each screen keyed by tab, the check-in, big cards).

## Core API

Hooks that compute from data (`useCycleStatus`, `useCycleStats`, `useStreaks`) belong *inside*
the error boundary of the section that shows them.

**`useAppData()`** → `{ state: {status:'loading'} | {status:'error', error} | {status:'ready', data}, reload }`.
`data = { settings, logs, pets, currentPet }` (logs and pets oldest first).

**`useAppController(data, reload, { usesPet? })`** → `AppController` (see doc comments):
`settings logs pets currentPet reload now today loggedDates due todayLogged noLogsYet
outsideHomeScreen usesPet needsFirstPet petStatus memorialPet hatchPet tab setTab checkin
openCheckin closeCheckin onCheckinSaved alarmPrompt dismissAlarmPrompt`. `usesPet` defaults to
the registry flag. Handles the minute tick, foreground refresh, `?checkin=1` deep link and
pet-death persistence. `alarmPrompt: { date } | null` is set after a check-in for today or
yesterday is saved while the Phase Done switch is on, only once no check-in is open (a backfill
followed by today's blocking check-in prompts once, after the last save, for today); `setTab`,
`openCheckin` and `dismissAlarmPrompt()` clear it, and it lapses once the date is older than
yesterday.

**Phone reminders** (`src/core/reminders.ts`): iOS Home Screen apps can't notify, so the phone
nudges (a Shortcuts automation, "Phase Nudge", when evening apps are opened) and the app tells
it the check-in is done by running the **"Phase Done"** shortcut with the date as text input.
`DONE_SHORTCUT_NAME`, `doneShortcutUrl(date)` (`shortcuts://run-shortcut?name=Phase%20Done&input=text&text=<date>`),
`runDoneShortcut(date)` (sets `window.location.href`; call it **only from a tap handler**, never
from an effect or before a save has finished), `alarmShortcutPref` (`'on' | 'off'`, default off,
`localStorage['burn-book:alarm-shortcut']`, per device) + `useAlarmShortcut()`,
`REMINDER_SETUP_STEPS` (string[], render as a numbered list), `ALARM_COPY` (`title intro
switchLabel switchHint test testHint setup prompt confirm notNow`; use these strings verbatim
so every skin says the same thing). The pure pieces behind `alarmPrompt` are exported for tests:
`alarmDateEligible`, `alarmPromptReducer`, `visibleAlarmPrompt`.

**`useCheckinForm(date, app.onCheckinSaved, app.settings.moodTracking)`** → `{ log, previous,
isEdit, loadError, retryLoad, update(patch), moodTracking, moodItems, setMood(key, rating),
togglePhysical(key), copyPrevious(), saving, saveError, canSave, save() }`. Options:
`FLOWS SLEEPS ENERGIES CRAVINGS RATINGS`, `FULL_SCALE` / `BASIC_SCALE` (`{value,label}[]`),
plus `MOOD_ITEMS`, `RATING_LABELS`, `PHYSICAL_SYMPTOMS`, `BASIC_MOOD_KEYS`, `BASIC_CHOICES`,
`MOOD_TRACKING_LEVELS` from `src/types.ts`.
`moodItems: CheckinMoodItem[]` = `{ key, label, scale: 'full'|'basic', options, value: Rating|null,
valueLabel, set(rating) }`, in MOOD_ITEMS order, only the moods asked at the current level.
Data rules (in the core, nothing for a skin to do): `log.moods` holds only rated moods; a
new entry gets "not at all" for the moods of the current level only; basic answers are stored
as 1 / 3 / 5 and a stored 2/4/6 shows as the nearest answer without being rewritten; ratings
for moods the current level doesn't show are kept on save; "Same as the day before" copies
only the moods shown at the current level.
```tsx
const f = useCheckinForm(date, onSaved, moodTracking)
f.log && FLOWS.map((fl) => <button aria-pressed={f.log!.flow === fl} onClick={() => f.update({ flow: fl })}>{capitalize(fl)}</button>)
f.moodItems.length > 0 && f.moodItems.map((m) => m.options.map((o) =>
  <button aria-pressed={m.value === o.value} onClick={() => m.set(o.value)}>{m.scale === 'basic' ? o.label : o.value}</button>))
```

**`useDialog(onClose?)`** → `{ titleId, panelRef }`: scroll lock, focus on open, Escape.

**`useCalendar({ logs, settings, today, now })`** → `{ year, month, monthTitle, leading, cells,
prevMonth, nextMonth, selected, select, selectedLog }`; `CalendarCell` = `{ date, day, phase,
log, predicted, isToday, isSelected, flow, bleeding, spotting, canLog, label }`. Also
`WEEKDAYS` (Sunday first), `PHASES`, `logHighlights(log)` → `{key,text}[]` (non-default items, most notable first), `describeLog(log)` → `{ rows[{key,label,value,rating?}],
savedAt, backfilled }`. Both list only rated moods (nothing mood-related when none were).

**`useSettingsModel({ settings, pets, today, onChanged: app.reload })`** → `{ reminder,
setReminder, cycleLength, setCycleLength, commitCycleLength, moodTracking, setMoodTracking(level),
prefsStatus, busy, dataStatus, exportBackup, exportSpreadsheet, importBackup(file), pendingImport,
chooseImportFile(file), confirmImport, cancelImport, graveyard }`; `MIN_CYCLE`, `MAX_CYCLE`,
`IMPORT_WARNING`, `MOOD_TRACKING_OPTIONS` (`{ value, label, description }[]`, Off · Basic · Advanced).
In-app confirmation:
```tsx
<input type="file" accept="application/json,.json" onChange={(e) => { m.chooseImportFile(e.target.files?.[0]); e.target.value = '' }} />
{m.pendingImport && <Confirm text={IMPORT_WARNING} onYes={m.confirmImport} onNo={m.cancelImport} />}
```

**Stats**: `useCycleStats(logs, today, settings)` → `CycleStats` (`src/logic/stats.ts`);
`useCycleStatus(...)` → `CycleStatus` (`src/logic/cycle.ts`); `useStreaks(...)` →
`{ current, longest: { days, start, end, isCurrent }, loggedToday, daysLogged }`.
Formatting: `num one signed pct daysText dayRange shortDate monthYear scalePos DASH isNum
PHASE_ABBR REGULARITY_WORDS LEVEL_LABELS reasonCopy`. Mood tracking: `moodsOff(settings, stats)`,
`moodTracked(stats, key)`, `NOT_TRACKED`, `MOODS_OFF_COPY`, `MOODS_OFF_ACTION`; in `CycleStats`,
`moodTotals` (`daysRated`, per-item `days`/`mean`; 0 / null = never rated) and
`sufficiency.hasMoodRatings`; mood means and day counts only ever use rated days.

**Hatching** (pet skins): `useHatchForm(app.hatchPet)` → `{ name, setName, busy, error,
canSubmit, submit }`, `PET_NAME_MAX`.

**Misc**: `formatDay` ("Fri 2 Oct"), `formatLongDate` ("2 Oct 2026"), `formatMonth`,
`capitalize`, `plural(n, word)`, `PHASE_LABELS`, `errorMessage(err)`, `dailyQuote`,
`dailyFact`, `TABS`, `TAB_LABELS`, `ErrorBoundary` (`label`, `fallback(error, retry)`).

**Skins & prefs**: `SKINS`, `activeSkin()`, `setSkin(key)` (saves + reloads), `resetSkin()`.
`createPref(storageKey, options, fallback, onChange?)` + `usePref(pref)` for a skin's own
per-device options (`usePref` has a server snapshot, so static-render tests see the current
value). Prefix keys `burn-book:<skin>-…`. Never put prefs in the database. Pin every new key in
`src/db/stability.test.ts`.

## CSS, fonts and the document

- Global CSS is fine (only one skin is ever loaded), but import it from your entry module,
  fonts first. Set your own `html`/`body` background, font, colour, `box-sizing` reset and
  `-webkit-text-size-adjust`; there is no shared reset.
- Fonts: `@fontsource/*` packages only, Latin subset files (`latin-400.css` etc.), imported
  in your entry. Already installed and unused so far: `playfair-display` (400–900, italics),
  `outfit` (100–900), `dm-mono` (300–500, italics), `pinyon-script` (400). Don't run
  `npm install`; ask if you need another.
- Document-level state is yours to set when the skin loads (module scope of your entry or a
  layout effect in the root): `<meta name="theme-color">` content (default in index.html is
  `#f2f3f6`), any `data-*` attributes on `<html>`. Y2K sets `data-bg` and theme-color.
- The service worker precaches `**/*.{js,css,html,svg,png,woff2}`, so every skin chunk and
  its woff2 fonts work offline. Images: inline SVG/CSS or files under your folder imported
  from code (png/svg). No other formats.

## Rules

- **No network.** CSP is `default-src 'self'`: no CDN fonts, remote images, analytics or
  fetches. Inline `style` is allowed; inline `<script>` is not.
- Touch targets ≥ 44×44 px. Text ≥ 12 px. WCAG AA contrast for text.
- Motion only inside `@media (prefers-reduced-motion: no-preference)`.
- No horizontal scroll at 390 px wide (also check 320 px). Respect safe areas:
  `env(safe-area-inset-top/bottom/left/right)` for the header, bottom nav and full-screen
  sheets (`viewport-fit=cover` is on).
- Blocking check-ins must be impossible to dismiss; while any check-in is open the rest of
  the app is `inert`.
- Copy describes patterns, never diagnoses; data never leaves the device.
- Don't touch `src/logic`, `src/db` or another skin's folder. Skins are built in parallel,
  so don't change `src/core` either: if something is missing, write a helper in your skin
  folder and report it. `npx tsc -b`, `npx vitest run`, `npx oxlint`, `npx vite build` must
  stay clean.
