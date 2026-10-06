import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ALARM_COPY, alarmShortcutPref, REMINDER_SETUP_STEPS, runDoneShortcut } from '../../core/reminders'
import { activeSkin, setSkin, SKINS } from '../../core/skin'
import { useDialog } from '../../core/useDialog'
import { MAX_CYCLE, MIN_CYCLE, MOOD_TRACKING_OPTIONS, useSettingsModel } from '../../core/useSettingsModel'
import type { ISODate, Pet, Settings } from '../../types'
import { Icon } from './icons'
import type { IconName } from './icons'
import type { Pref } from '../../core/prefs'
import { colourwayPref, COLOURWAYS, pixelLabelsPref, useColourway, useOnOff } from './prefs'
import type { OnOff } from './prefs'
import { StatusLine } from './ui'

interface Props {
  settings: Settings
  pets: Pet[]
  today: ISODate
  onChanged: () => Promise<void>
}

/**
 * The core's IMPORT_WARNING mentions "your pet", which this skin never shows; same facts in
 * this skin's words (a backup's pet still comes along for the Y2K theme).
 */
const IMPORT_TEXT =
  'This adds the backup’s days to this phone. Your settings, and any pet from the Y2K theme, are replaced with the backup’s.'

export function SettingsScreen({ settings, pets, today, onChanged }: Props) {
  const m = useSettingsModel({ settings, pets, today, onChanged })
  const fileInput = useRef<HTMLInputElement>(null)
  const reminderId = useId()
  const cycleId = useId()
  const cycleHintId = useId()
  const moodId = useId()
  const moodHintId = useId()
  const current = activeSkin().key

  return (
    <div className="gl-screen gl-settings">
      <header className="gl-head">
        <h1 className="gl-title">Settings</h1>
      </header>

      <Group title="Check-in">
        <div className="gl-row">
          <RowIcon icon="bell" />
          <label className="gl-row__main" htmlFor={reminderId}>
            <span className="gl-row__title">Evening reminder</span>
            <span className="gl-row__sub">When tonight’s check-in is due</span>
          </label>
          <input
            id={reminderId}
            className="gl-input gl-input--time"
            type="time"
            value={m.reminder}
            onChange={(e) => m.setReminder(e.target.value)}
          />
        </div>
        <div className="gl-row">
          <RowIcon icon="loop" />
          <label className="gl-row__main" htmlFor={cycleId}>
            <span className="gl-row__title">Usual cycle length</span>
            <span className="gl-row__sub" id={cycleHintId}>
              {MIN_CYCLE}–{MAX_CYCLE} days, until you’ve logged a few
            </span>
          </label>
          <span className="gl-input-wrap">
            <input
              id={cycleId}
              className="gl-input gl-input--num"
              type="number"
              inputMode="numeric"
              min={MIN_CYCLE}
              max={MAX_CYCLE}
              aria-describedby={cycleHintId}
              value={m.cycleLength}
              onChange={(e) => m.setCycleLength(e.target.value)}
              onBlur={m.commitCycleLength}
            />
            <span className="gl-input-wrap__unit" aria-hidden="true">
              days
            </span>
          </span>
        </div>
        <div className="gl-row gl-row--wrap">
          <RowIcon icon="heart" />
          <span className="gl-row__main">
            <span className="gl-row__title" id={moodId}>
              Mood tracking
            </span>
            <span className="gl-row__sub" id={moodHintId}>
              {MOOD_TRACKING_OPTIONS.find((o) => o.value === m.moodTracking)?.description}
            </span>
          </span>
          <div className="gl-seg" role="group" aria-labelledby={moodId} aria-describedby={moodHintId}>
            {MOOD_TRACKING_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`gl-seg__opt${m.moodTracking === o.value ? ' is-on' : ''}`}
                aria-pressed={m.moodTracking === o.value}
                onClick={() => m.setMoodTracking(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <StatusLine status={m.prefsStatus} />
      </Group>

      <Reminders today={today} />

      <Group title="Theme" note="Switching reloads the app. Your entries stay put.">
        {SKINS.map((s) => {
          const on = s.key === current
          return (
            <button
              key={s.key}
              type="button"
              className={`gl-row gl-row--button gl-skin${on ? ' is-on' : ''}`}
              aria-pressed={on}
              aria-describedby={`gl-skin-${s.key}`}
              onClick={() => setSkin(s.key)}
            >
              <span className={`gl-skin__badge gl-skin__badge--${s.key}`} aria-hidden="true">
                {s.label.charAt(0)}
              </span>
              <span className="gl-row__main">
                <span className="gl-row__title">{s.label}</span>
                <span className="gl-row__sub" id={`gl-skin-${s.key}`}>
                  {s.description}
                </span>
              </span>
              <span className="gl-skin__mark" aria-hidden="true">
                {on ? <Icon name="check" size={18} /> : null}
              </span>
              {on && <span className="visually-hidden">(in use)</span>}
            </button>
          )
        })}
      </Group>

      <Group title="Appearance" note="Only on this phone.">
        <ColourPicker />
        <PrefSwitch pref={pixelLabelsPref} icon="type" title="Pixel labels" sub="Small labels in a pixel font" />
      </Group>

      <Group title="Your data">
        <div className="gl-row gl-row--note">
          <RowIcon icon="lock" />
          <p className="gl-row__main gl-privacy">Everything stays on this phone and is never sent anywhere. Export a backup now and then.</p>
        </div>
        <ActionRow icon="download" title="Export backup" sub="JSON file, for moving phones" disabled={m.busy} onClick={() => void m.exportBackup()} />
        <ActionRow icon="sheet" title="Export spreadsheet" sub="CSV, to read or share with a doctor" disabled={m.busy} onClick={() => void m.exportSpreadsheet()} />
        <ActionRow icon="upload" title="Import backup…" sub="Adds the days from a backup file" disabled={m.busy} onClick={() => fileInput.current?.click()} />
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            m.chooseImportFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <StatusLine status={m.dataStatus} />
      </Group>

      <p className="gl-about">
        Phases, predictions and stats are estimates from your own check-ins: patterns, not medical advice, and not for
        contraception.
      </p>

      {m.pendingImport && <ConfirmImport fileName={m.pendingImport.name} onYes={() => void m.confirmImport()} onNo={m.cancelImport} />}
    </div>
  )
}

/** Settings › Appearance › Colour: five swatches, each a mini preview of its colourway. */
function ColourPicker() {
  const current = useColourway()
  const titleId = useId()
  const label = COLOURWAYS.find((c) => c.key === current)?.label ?? ''
  return (
    <div className="gl-row gl-colour" role="group" aria-labelledby={titleId}>
      <RowIcon icon="palette" />
      <span className="gl-row__main">
        <span className="gl-row__title" id={titleId}>
          Colour
        </span>
        <span className="gl-row__sub">{label}</span>
      </span>
      <div className="gl-colour__grid">
        {COLOURWAYS.map((c) => {
          const on = c.key === current
          return (
            <button
              key={c.key}
              type="button"
              className={`gl-swatch gl-swatch--${c.key}${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => colourwayPref.set(c.key)}
            >
              <span className="gl-swatch__chip" aria-hidden="true">
                <span className="gl-swatch__card">
                  <span className="gl-swatch__ink" />
                  <span className="gl-swatch__dot" />
                </span>
                <span className="gl-swatch__gel" />
              </span>
              <span className="gl-swatch__label">{c.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** An on/off display preference as a real switch; the whole row is the target. */
function PrefSwitch({ pref, icon, title, sub }: { pref: Pref<OnOff>; icon: IconName; title: string; sub: string }) {
  const on = useOnOff(pref)
  const titleId = useId()
  const subId = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={titleId}
      aria-describedby={subId}
      className="gl-row gl-row--button"
      onClick={() => pref.set(on ? 'off' : 'on')}
    >
      <RowIcon icon={icon} />
      <span className="gl-row__main">
        <span className="gl-row__title" id={titleId}>
          {title}
        </span>
        <span className="gl-row__sub" id={subId}>
          {sub}
        </span>
      </span>
      <span className={`gl-switch-ctl${on ? ' is-on' : ''}`} aria-hidden="true">
        <span className="gl-switch-ctl__thumb" />
      </span>
    </button>
  )
}

/**
 * Reminders: the phone does the nudging (Shortcuts automations); the switch makes the app offer
 * to run "Phase Done" after each save. Setup steps sit behind a "How to set up" expander.
 */
function Reminders({ today }: { today: ISODate }) {
  const [open, setOpen] = useState(false)
  const stepsId = useId()
  return (
    <Group title={ALARM_COPY.title}>
      <div className="gl-row gl-row--note">
        <RowIcon icon="bell" />
        <p className="gl-row__main gl-privacy">{ALARM_COPY.intro}</p>
      </div>
      <button
        type="button"
        className="gl-row gl-row--button gl-expander"
        aria-expanded={open}
        aria-controls={stepsId}
        onClick={() => setOpen((o) => !o)}
      >
        <RowIcon icon="info" />
        <span className="gl-row__main">
          <span className="gl-row__title">{ALARM_COPY.setup}</span>
          <span className="gl-row__sub">{REMINDER_SETUP_STEPS.length} steps in the Shortcuts app</span>
        </span>
        <Icon name="chevron-down" size={20} className="gl-row__chev gl-expander__chev" />
      </button>
      <ol id={stepsId} className="gl-setup" hidden={!open}>
        {REMINDER_SETUP_STEPS.map((step, i) => (
          <li key={i} className="gl-setup__step">
            <span className="gl-setup__num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="gl-setup__text">{step}</span>
          </li>
        ))}
      </ol>
      <PrefSwitch pref={alarmShortcutPref} icon="check" title={ALARM_COPY.switchLabel} sub={ALARM_COPY.switchHint} />
      <ActionRow icon="clock" title={ALARM_COPY.test} sub={ALARM_COPY.testHint} disabled={false} onClick={() => runDoneShortcut(today)} />
    </Group>
  )
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="gl-group" aria-labelledby={id}>
      <h2 id={id} className="gl-kicker gl-group__title">
        {title}
      </h2>
      <div className="gl-group__list">{children}</div>
      {note && <p className="gl-group__note">{note}</p>}
    </section>
  )
}

function RowIcon({ icon }: { icon: IconName }) {
  return (
    <span className="gl-rowicon" aria-hidden="true">
      <Icon name={icon} size={20} />
    </span>
  )
}

function ActionRow(props: { icon: IconName; title: string; sub: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="gl-row gl-row--button" disabled={props.disabled} onClick={props.onClick}>
      <RowIcon icon={props.icon} />
      <span className="gl-row__main">
        <span className="gl-row__title">{props.title}</span>
        <span className="gl-row__sub">{props.sub}</span>
      </span>
      <Icon name="chevron-right" size={20} className="gl-row__chev" />
    </button>
  )
}

function ConfirmImport({ fileName, onYes, onNo }: { fileName: string; onYes: () => void; onNo: () => void }) {
  const { titleId, panelRef } = useDialog(onNo)
  const textId = useId()
  return (
    <div
      className="gl-confirm-layer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onNo()
      }}
    >
      <div
        ref={panelRef}
        className="gl-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        tabIndex={-1}
      >
        <h2 id={titleId} className="gl-confirm__title">
          Import this backup?
        </h2>
        <p className="gl-confirm__file">{fileName}</p>
        <p id={textId} className="gl-confirm__text">
          {IMPORT_TEXT}
        </p>
        <div className="gl-confirm__actions">
          <button type="button" className="gl-gel gl-gel--block" onClick={onYes}>
            Import
          </button>
          <button type="button" className="gl-btn gl-btn--chrome gl-btn--block" onClick={onNo}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
