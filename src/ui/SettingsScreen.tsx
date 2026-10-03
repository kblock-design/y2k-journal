import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { exportCSV, exportJSON, importJSON, saveFile, updateSettings } from '../db'
import { diffDays } from '../logic/dates'
import type { ISODate, Pet, Settings } from '../types'
import { errorMessage, formatLongDate, plural } from './format'

const MIN_CYCLE = 15
const MAX_CYCLE = 60

interface Props {
  settings: Settings
  pets: Pet[]
  today: ISODate
  /** Reload app data after a write. */
  onChanged: () => Promise<void>
}

type Status = { kind: 'ok' | 'error'; text: string } | null

export function SettingsScreen({ settings, pets, today, onChanged }: Props) {
  const [reminder, setReminder] = useState(settings.reminderTime)
  const [cycleLength, setCycleLength] = useState(String(settings.defaultCycleLength))
  const [prefsStatus, setPrefsStatus] = useState<Status>(null)
  const [dataStatus, setDataStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Pick up settings changed elsewhere (e.g. by an import).
  const [syncedSettings, setSyncedSettings] = useState(settings)
  if (syncedSettings !== settings) {
    setSyncedSettings(settings)
    setReminder(settings.reminderTime)
    setCycleLength(String(settings.defaultCycleLength))
  }

  const savePatch = async (patch: Partial<Settings>) => {
    try {
      await updateSettings(patch)
      await onChanged()
      setPrefsStatus({ kind: 'ok', text: 'Saved' })
    } catch (err) {
      setPrefsStatus({ kind: 'error', text: `Couldn't save: ${errorMessage(err)}` })
    }
  }

  const onReminderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setReminder(value)
    if (/^\d{2}:\d{2}$/.test(value) && value !== settings.reminderTime) void savePatch({ reminderTime: value })
  }

  const commitCycleLength = () => {
    const n = Number(cycleLength)
    if (!Number.isInteger(n) || n < MIN_CYCLE || n > MAX_CYCLE) {
      setPrefsStatus({ kind: 'error', text: `Cycle length must be ${MIN_CYCLE}–${MAX_CYCLE} days` })
      setCycleLength(String(settings.defaultCycleLength))
      return
    }
    if (n !== settings.defaultCycleLength) void savePatch({ defaultCycleLength: n })
  }

  const runExport = async (kind: 'json' | 'csv') => {
    setBusy(true)
    setDataStatus(null)
    try {
      if (kind === 'json') {
        await saveFile(`burn-book-backup-${today}.json`, await exportJSON(), 'application/json')
      } else {
        await saveFile(`burn-book-${today}.csv`, await exportCSV(), 'text/csv')
      }
      setDataStatus({ kind: 'ok', text: kind === 'json' ? 'Backup exported.' : 'Spreadsheet exported.' })
    } catch (err) {
      // Dismissing the iOS share sheet rejects with AbortError; that's not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return
      setDataStatus({ kind: 'error', text: `Export failed: ${errorMessage(err)}` })
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!window.confirm('Importing adds the backup’s days to this phone and replaces your pet and settings with the backup’s. Continue?')) return
    setBusy(true)
    setDataStatus(null)
    try {
      const count = await importJSON(await file.text())
      await onChanged()
      setDataStatus({ kind: 'ok', text: `Imported ${plural(count, 'day')}.` })
    } catch (err) {
      setDataStatus({ kind: 'error', text: `Import failed: ${errorMessage(err)}` })
    } finally {
      setBusy(false)
    }
  }

  const graveyard = pets.filter((p) => p.diedOn)

  return (
    <div className="screen screen--settings">
      <section className="card settings-group">
        <h2 className="settings-group__title">Check-in</h2>
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
            onChange={(e) => setCycleLength(e.target.value)}
            onBlur={commitCycleLength}
          />
        </label>
        <p className="hint">Used for predictions until you’ve logged a few real cycles.</p>
        {prefsStatus && (
          <p className={`status status--${prefsStatus.kind}`} role="status">
            {prefsStatus.text}
          </p>
        )}
      </section>

      <section className="card settings-group">
        <h2 className="settings-group__title">Your data</h2>
        <p className="privacy-note">
          Everything stays on this device. Nothing is ever sent anywhere, so export a backup now and
          then.
        </p>
        <div className="button-stack">
          <button type="button" className="btn btn--secondary btn--block" disabled={busy} onClick={() => runExport('json')}>
            Export backup (JSON)
          </button>
          <button type="button" className="btn btn--secondary btn--block" disabled={busy} onClick={() => runExport('csv')}>
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
      </section>

      <section className="card settings-group graveyard">
        <h2 className="settings-group__title">Pet graveyard</h2>
        {graveyard.length === 0 ? (
          <p className="graveyard__empty">No pets lost. Keep it that way!</p>
        ) : (
          <ul className="graveyard__list">
            {graveyard.map((p) => (
              <li key={p.id} className="graveyard__item">
                <span className="graveyard__icon" aria-hidden="true">
                  🪦
                </span>
                <span className="graveyard__name">{p.name}</span>
                <span className="graveyard__dates">
                  {formatLongDate(p.bornOn)} – {formatLongDate(p.diedOn!)} ·{' '}
                  {plural(diffDays(p.bornOn, p.diedOn!), 'day')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
