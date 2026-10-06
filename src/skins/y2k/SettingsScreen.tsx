import { useId, useRef } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { ALARM_COPY, alarmShortcutPref, REMINDER_SETUP_STEPS, runDoneShortcut, useAlarmShortcut } from '../../core/reminders'
import { activeSkin, setSkin, SKINS } from '../../core/skin'
import { IMPORT_WARNING, MAX_CYCLE, MIN_CYCLE, MOOD_TRACKING_OPTIONS, useSettingsModel } from '../../core/useSettingsModel'
import type { ISODate, Pet, Settings } from '../../types'
import { formatLongDate, plural } from '../../core/format'
import { PetSprite } from './pet'
import { BrandWord } from './BrandWord'
import {
  BACKGROUNDS,
  setBackground,
  setStickerTheme,
  setTitleStyle,
  STICKER_THEMES,
  TITLE_STYLES,
  useBackground,
  useStickerTheme,
  useTitleStyle,
} from './prefs'
import { Sticker } from './stickers'
import { Window } from './Window'

/** Tilts for the sticker-theme preview trio. */
const PREVIEW_TILT = [-10, 6, -4] as const

interface Props {
  settings: Settings
  pets: Pet[]
  today: ISODate
  /** Reload app data after a write. */
  onChanged: () => Promise<void>
}

export function SettingsScreen({ settings, pets, today, onChanged }: Props) {
  const model = useSettingsModel({ settings, pets, today, onChanged })
  const { reminder, cycleLength, prefsStatus, dataStatus, busy, graveyard } = model
  const fileInput = useRef<HTMLInputElement>(null)

  const onReminderChange = (e: ChangeEvent<HTMLInputElement>) => model.setReminder(e.target.value)

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!window.confirm(IMPORT_WARNING)) return
    void model.importBackup(file)
  }

  // Each window is a disclosure; the page opens on the two you actually use.
  return (
    <div className="screen screen--settings">
      <Window
        tone="hot"
        icon="clock"
        title="Check-in"
        titleAs="h2"
        className="settings-group"
        collapsible={{
          defaultOpen: true,
          summary: `${settings.reminderTime} · ${plural(settings.defaultCycleLength, 'day')}`,
        }}
        stickers={[{ name: 'heart', corner: 'tl', size: 40, rotate: -14 }]}
      >
        <label className="field field--row">
          <span className="field__label">Nightly reminder</span>
          <input className="input input--time" type="time" value={reminder} onChange={onReminderChange} />
        </label>
        <label className="field field--row">
          <span className="field__label">Usual cycle length (days)</span>
          <input
            className="input input--number"
            type="number"
            inputMode="numeric"
            min={MIN_CYCLE}
            max={MAX_CYCLE}
            value={cycleLength}
            onChange={(e) => model.setCycleLength(e.target.value)}
            onBlur={model.commitCycleLength}
          />
        </label>
        <p className="hint">Used for predictions until you’ve logged a few real cycles.</p>
        <div className="field field--segmented mood-tracking">
          <span className="field__label" id="mood-tracking-label">
            Mood tracking
          </span>
          <div className="segmented" role="group" aria-labelledby="mood-tracking-label" aria-describedby="mood-tracking-hint">
            {MOOD_TRACKING_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`segment${model.moodTracking === o.value ? ' is-selected' : ''}`}
                aria-pressed={model.moodTracking === o.value}
                onClick={() => model.setMoodTracking(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="hint" id="mood-tracking-hint">
            {MOOD_TRACKING_OPTIONS.find((o) => o.value === model.moodTracking)?.description}
          </p>
        </div>
        {prefsStatus && (
          <p className={`status status--${prefsStatus.kind}`} role="status">
            {prefsStatus.text}
          </p>
        )}
      </Window>

      <Reminders today={today} />

      <Window
        tone="black"
        icon="floppy"
        title="Your data"
        titleAs="h2"
        className="settings-group"
        collapsible={{ defaultOpen: true, summary: 'On this device only' }}
      >
        <p className="privacy-note">
          Everything stays on this device and is never sent anywhere, so export a backup now and then.
        </p>
        <div className="button-stack">
          <button type="button" className="btn btn--secondary btn--block" disabled={busy} onClick={model.exportBackup}>
            Export backup (JSON)
          </button>
          <button type="button" className="btn btn--secondary btn--block" disabled={busy} onClick={model.exportSpreadsheet}>
            Export spreadsheet (CSV)
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--block"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Import backup…
          </button>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onImportFile}
          />
        </div>
        {dataStatus && (
          <p className={`status status--${dataStatus.kind}`} role="status">
            {dataStatus.text}
          </p>
        )}
      </Window>

      <Appearance />

      <Window
        tone="chrome"
        icon="tomb"
        title="Pet graveyard"
        titleAs="h2"
        className="settings-group graveyard"
        collapsible={{ defaultOpen: false, summary: graveyard.length === 0 ? 'Empty' : plural(graveyard.length, 'pet') }}
        stickers={[{ name: 'flower', corner: 'tl', size: 38, rotate: -10 }]}
      >
        {graveyard.length === 0 ? (
          <p className="graveyard__empty">No pets lost. Keep it that way!</p>
        ) : (
          <ul className="graveyard__list">
            {graveyard.map(({ pet: p, days, stage }) => (
              <li key={p.id} className="graveyard__item">
                <span className="graveyard__icon" aria-hidden="true">
                  <PetSprite stage={stage} health="dead" size={56} />
                </span>
                <span className="graveyard__name">{p.name}</span>
                <span className="graveyard__dates">
                  {formatLongDate(p.bornOn)} – {formatLongDate(p.diedOn!)} ·{' '}
                  {plural(days, 'day')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Window>
    </div>
  )
}

/**
 * Reminders: the phone does the nudging (Shortcuts automations); the switch makes the app offer
 * to run "Phase Done" after each save. The window starts collapsed (its title bar is the
 * disclosure), so the setup steps don't lengthen Settings.
 */
function Reminders({ today }: { today: ISODate }) {
  const on = useAlarmShortcut() === 'on'
  const labelId = useId()
  const hintId = useId()
  const stepsId = useId()
  return (
    <Window
      tone="chrome"
      icon="note"
      title={ALARM_COPY.title}
      titleAs="h2"
      className="settings-group reminders"
      collapsible={{ defaultOpen: false, summary: on ? 'Phase Done on' : 'Off' }}
    >
      <p className="privacy-note">{ALARM_COPY.intro}</p>
      <h3 id={stepsId} className="pick-group__label">
        {ALARM_COPY.setup}
      </h3>
      <ol className="setup-steps" aria-labelledby={stepsId}>
        {REMINDER_SETUP_STEPS.map((step, i) => (
          <li key={i} className="setup-steps__step">
            <span className="setup-steps__num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="setup-steps__text">{step}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="switch-row"
        onClick={() => alarmShortcutPref.set(on ? 'off' : 'on')}
      >
        <span className="switch-row__text">
          <span className="switch-row__label" id={labelId}>
            {ALARM_COPY.switchLabel}
          </span>
          <span className="hint" id={hintId}>
            {ALARM_COPY.switchHint}
          </span>
        </span>
        <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true">
          <span className="switch__key" />
        </span>
      </button>
      <button type="button" className="btn btn--secondary btn--block" onClick={() => runDoneShortcut(today)}>
        {ALARM_COPY.test}
      </button>
    </Window>
  )
}

/** Title style, sticker theme and background: per-device looks that apply instantly. */
function Appearance() {
  const titleStyle = useTitleStyle()
  const stickerTheme = useStickerTheme()
  const background = useBackground()
  const summary = [
    TITLE_STYLES.find((s) => s.key === titleStyle)?.short,
    STICKER_THEMES.find((t) => t.key === stickerTheme)?.label,
    BACKGROUNDS.find((b) => b.key === background)?.label,
  ].join(' · ')
  return (
    <Window
      tone="holo"
      icon="star"
      title="Appearance"
      titleAs="h2"
      className="settings-group appearance"
      collapsible={{ defaultOpen: false, summary }}
    >
      {/* Whole-app skin. Picking another one saves the choice and reloads into it. */}
      <PickGroup id="pick-skin" label="Theme" columns={2}>
        {SKINS.map((s) => (
          <button
            key={s.key}
            type="button"
            className="pick pick--skin"
            aria-pressed={activeSkin().key === s.key}
            aria-describedby={`pick-skin-${s.key}`}
            onClick={() => setSkin(s.key)}
          >
            <span className="pick__label">{s.label}</span>
            <span id={`pick-skin-${s.key}`} className="pick__desc">
              {s.description}
            </span>
          </button>
        ))}
      </PickGroup>

      <PickGroup id="pick-title" label="Title" columns={2}>
        {TITLE_STYLES.map((s) => (
          <button
            key={s.key}
            type="button"
            className="pick pick--title"
            aria-pressed={titleStyle === s.key}
            aria-label={s.label}
            onClick={() => setTitleStyle(s.key)}
          >
            <span className="pick__preview">
              <BrandWord variant={s.key} />
            </span>
            <span className="pick__label">{s.label}</span>
          </button>
        ))}
      </PickGroup>

      <PickGroup id="pick-stickers" label="Stickers" columns={3}>
        {STICKER_THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            className="pick"
            aria-pressed={stickerTheme === t.key}
            onClick={() => setStickerTheme(t.key)}
          >
            <span className="pick__preview pick__stickers" aria-hidden="true">
              {t.preview.length === 0 ? (
                <span className="pick__none" />
              ) : (
                t.preview.map((name, i) => <Sticker key={name} name={name} size={24} rotate={PREVIEW_TILT[i]} />)
              )}
            </span>
            <span className="pick__label">{t.label}</span>
          </button>
        ))}
      </PickGroup>

      <PickGroup id="pick-background" label="Background" columns={4}>
        {BACKGROUNDS.map((b) => (
          <button
            key={b.key}
            type="button"
            className="pick"
            aria-pressed={background === b.key}
            onClick={() => setBackground(b.key)}
          >
            <span className="bg-swatch" data-bg={b.key} aria-hidden="true" />
            <span className="pick__label">{b.label}</span>
          </button>
        ))}
      </PickGroup>
    </Window>
  )
}

function PickGroup({ id, label, columns, children }: { id: string; label: string; columns: 2 | 3 | 4; children: ReactNode }) {
  return (
    <div className="pick-group">
      <h3 id={id} className="pick-group__label">
        {label}
      </h3>
      <div role="group" aria-labelledby={id} className={`picks picks--${columns}`}>
        {children}
      </div>
    </div>
  )
}
