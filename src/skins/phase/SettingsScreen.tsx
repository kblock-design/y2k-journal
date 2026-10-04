import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { activeSkin, setSkin, SKINS } from '../../core/skin'
import { useDialog } from '../../core/useDialog'
import { MAX_CYCLE, MIN_CYCLE, MOOD_TRACKING_OPTIONS, useSettingsModel } from '../../core/useSettingsModel'
import type { ISODate, Pet, Settings } from '../../types'
import { Icon } from './icons'
import { COLOURWAYS, colourwayPref, useColourway } from './prefs'
import { IconChip, StatusLine } from './ui'

interface Props {
  settings: Settings
  pets: Pet[]
  today: ISODate
  onChanged: () => Promise<void>
}

/**
 * The core's IMPORT_WARNING mentions "your pet", which this skin never shows; same facts in
 * this skin's words (the backup's pet, if any, still comes along for the Y2K theme).
 */
const IMPORT_TEXT =
  'Importing adds the backup’s days to this phone. Your settings, and any pet from the Y2K theme, are replaced with the ones in the backup.'

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
    <div className="ph-screen ph-settings">
      <header className="ph-head">
        <h1 className="ph-title">Settings</h1>
      </header>

      <Group title="Check-in">
        <div className="ph-row">
          <IconChip icon="bell" tone="yellow" />
          <label className="ph-row__main" htmlFor={reminderId}>
            <span className="ph-row__title">Evening reminder</span>
            <span className="ph-row__sub">When tonight’s check-in is due</span>
          </label>
          <input
            id={reminderId}
            className="ph-input ph-input--time"
            type="time"
            value={m.reminder}
            onChange={(e) => m.setReminder(e.target.value)}
          />
        </div>
        <div className="ph-row">
          <IconChip icon="loop" tone="blue" />
          <label className="ph-row__main" htmlFor={cycleId}>
            <span className="ph-row__title">Usual cycle length</span>
            <span className="ph-row__sub" id={cycleHintId}>
              {MIN_CYCLE}–{MAX_CYCLE} days; used until you’ve logged a few cycles
            </span>
          </label>
          <span className="ph-input-wrap">
            <input
              id={cycleId}
              className="ph-input ph-input--num"
              type="number"
              inputMode="numeric"
              min={MIN_CYCLE}
              max={MAX_CYCLE}
              aria-describedby={cycleHintId}
              value={m.cycleLength}
              onChange={(e) => m.setCycleLength(e.target.value)}
              onBlur={m.commitCycleLength}
            />
            <span className="ph-input-wrap__unit" aria-hidden="true">
              days
            </span>
          </span>
        </div>
        <div className="ph-row ph-row--wrap">
          <IconChip icon="heart" tone="pink" />
          <span className="ph-row__main">
            <span className="ph-row__title" id={moodId}>
              Mood tracking
            </span>
            <span className="ph-row__sub" id={moodHintId}>
              {MOOD_TRACKING_OPTIONS.find((o) => o.value === m.moodTracking)?.description}
            </span>
          </span>
          <div className="ph-seg" role="group" aria-labelledby={moodId} aria-describedby={moodHintId}>
            {MOOD_TRACKING_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`ph-seg__opt${m.moodTracking === o.value ? ' is-on' : ''}`}
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

      <Group title="Appearance">
        <ColourPicker />
      </Group>

      <Group title="Theme" note="Switching reloads the app. Your entries stay put.">
        <div className="ph-skins">
          {SKINS.map((s) => {
            const on = s.key === current
            return (
              <button
                key={s.key}
                type="button"
                className={`ph-row ph-row--button ph-skin${on ? ' is-on' : ''}`}
                aria-pressed={on}
                aria-describedby={`ph-skin-${s.key}`}
                onClick={() => setSkin(s.key)}
              >
                <span className={`ph-skin__badge ph-skin__badge--${s.key}`} aria-hidden="true">
                  {s.key === 'phase' ? <PhaseSwatch /> : s.label.charAt(0)}
                </span>
                <span className="ph-row__main">
                  <span className="ph-row__title">{s.label}</span>
                  <span className="ph-row__sub" id={`ph-skin-${s.key}`}>
                    {s.description}
                  </span>
                </span>
                <span className="ph-skin__mark" aria-hidden="true">
                  {on ? <Icon name="check" size={18} /> : null}
                </span>
                {on && <span className="visually-hidden">(in use)</span>}
              </button>
            )
          })}
        </div>
      </Group>

      <Group title="Your data">
        <div className="ph-row ph-row--note">
          <IconChip icon="lock" tone="green" />
          <p className="ph-row__main ph-privacy">
            Everything stays on this phone and is never sent anywhere. Export a backup now and then so nothing gets lost.
          </p>
        </div>
        <button type="button" className="ph-row ph-row--button" disabled={m.busy} onClick={() => void m.exportBackup()}>
          <IconChip icon="download" tone="pink" />
          <span className="ph-row__main">
            <span className="ph-row__title">Export backup</span>
            <span className="ph-row__sub">JSON file, for moving phones</span>
          </span>
          <Icon name="chevron-right" size={20} className="ph-row__chev" />
        </button>
        <button type="button" className="ph-row ph-row--button" disabled={m.busy} onClick={() => void m.exportSpreadsheet()}>
          <IconChip icon="sheet" tone="blue" />
          <span className="ph-row__main">
            <span className="ph-row__title">Export spreadsheet</span>
            <span className="ph-row__sub">CSV, to read or share with a doctor</span>
          </span>
          <Icon name="chevron-right" size={20} className="ph-row__chev" />
        </button>
        <button type="button" className="ph-row ph-row--button" disabled={m.busy} onClick={() => fileInput.current?.click()}>
          <IconChip icon="upload" tone="yellow" />
          <span className="ph-row__main">
            <span className="ph-row__title">Import backup…</span>
            <span className="ph-row__sub">Adds the days from a backup file</span>
          </span>
          <Icon name="chevron-right" size={20} className="ph-row__chev" />
        </button>
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

      <Group title="About">
        <div className="ph-row ph-row--note">
          <IconChip icon="info" tone="grey" />
          <p className="ph-row__main ph-privacy">
            Phases, predictions and stats are rough estimates from your own check-ins. They describe patterns; they’re not
            medical advice and not for contraception.
          </p>
        </div>
      </Group>

      {m.pendingImport && (
        <ConfirmImport fileName={m.pendingImport.name} onYes={() => void m.confirmImport()} onNo={m.cancelImport} />
      )}
    </div>
  )
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="ph-group" aria-labelledby={id}>
      <h2 id={id} className="ph-group__title">
        {title}
      </h2>
      <div className="ph-group__list">{children}</div>
      {note && <p className="ph-group__note">{note}</p>}
    </section>
  )
}

/** Five colourway swatches (page, ink and the four pastels of each); applies instantly. */
function ColourPicker() {
  const current = useColourway()
  const titleId = useId()
  return (
    <div className="ph-cw">
      <p className="ph-cw__title" id={titleId}>
        Colour
      </p>
      <div className="ph-cw__grid" role="group" aria-labelledby={titleId}>
        {COLOURWAYS.map((c) => {
          const on = c.key === current
          return (
            <button
              key={c.key}
              type="button"
              className={`ph-cw__opt${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => colourwayPref.set(c.key)}
            >
              <span className="ph-cw__frame" aria-hidden="true">
                {/* The attribute scopes that colourway's tokens to this preview. */}
                <span className="ph-cw__preview" data-ph-colour={c.key}>
                  <span className="ph-cw__dots">
                    <span className="ph-tone--pink" />
                    <span className="ph-tone--blue" />
                    <span className="ph-tone--yellow" />
                    <span className="ph-tone--green" />
                  </span>
                  <span className="ph-cw__ink" />
                </span>
                {on && (
                  <span className="ph-cw__check">
                    <Icon name="check" size={12} />
                  </span>
                )}
              </span>
              <span className="ph-cw__label">{c.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PhaseSwatch() {
  return (
    <span className="ph-swatch4">
      <span className="ph-tone--pink" />
      <span className="ph-tone--blue" />
      <span className="ph-tone--yellow" />
      <span className="ph-tone--green" />
    </span>
  )
}

function ConfirmImport({ fileName, onYes, onNo }: { fileName: string; onYes: () => void; onNo: () => void }) {
  const { titleId, panelRef } = useDialog(onNo)
  const textId = useId()
  return (
    <div
      className="ph-confirm-layer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onNo()
      }}
    >
      <div
        ref={panelRef}
        className="ph-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        tabIndex={-1}
      >
        <IconChip icon="upload" tone="yellow" />
        <h2 id={titleId} className="ph-confirm__title">
          Import this backup?
        </h2>
        <p className="ph-confirm__file">{fileName}</p>
        <p id={textId} className="ph-confirm__text">
          {IMPORT_TEXT}
        </p>
        <div className="ph-confirm__actions">
          <button type="button" className="ph-btn ph-btn--primary ph-btn--block" onClick={onYes}>
            Import
          </button>
          <button type="button" className="ph-btn ph-btn--outline ph-btn--block" onClick={onNo}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
