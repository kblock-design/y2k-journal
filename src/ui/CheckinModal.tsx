import { useEffect, useState } from 'react'
import { getLog, saveLog } from '../db'
import { addDays, toISODate } from '../logic/dates'
import type { Cravings, DayLog, Energy, Flow, ISODate, PhysicalKey, Sleep } from '../types'
import { MOOD_ITEMS, PHYSICAL_SYMPTOMS } from '../types'
import { ChoiceGroup, RatingRow, ToggleChip } from './controls'
import { emptyLog, errorMessage, formatDay } from './format'
import { Modal } from './Modal'

const FLOWS: readonly Flow[] = ['none', 'spotting', 'light', 'medium', 'heavy']
const SLEEPS: readonly Sleep[] = ['poor', 'ok', 'good']
const ENERGIES: readonly Energy[] = ['low', 'ok', 'high']
const CRAVINGS: readonly Cravings[] = ['none', 'some', 'strong']

interface Props {
  date: ISODate
  today: ISODate
  /** Blocking check-ins cannot be closed until saved. */
  blocking: boolean
  onClose: () => void
  /** Called after a successful save; the modal stays in "saving" until it resolves. */
  onSaved: () => Promise<void>
}

function checkinTitle(date: ISODate, today: ISODate): string {
  if (date === today) return `Today — ${formatDay(date)}`
  if (date === addDays(today, -1)) return `Yesterday — ${formatDay(date)}`
  return formatDay(date)
}

export function CheckinModal({ date, today, blocking, onClose, onSaved }: Props) {
  const [log, setLog] = useState<DayLog | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLog(date).then(
      (existing) => {
        if (cancelled) return
        setIsEdit(!!existing)
        setLog(existing ? { ...existing, moods: { ...existing.moods } } : emptyLog(date))
        setLoadError(null)
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [date, attempt])

  const update = (patch: Partial<DayLog>) => setLog((l) => (l ? { ...l, ...patch } : l))

  const togglePhysical = (key: PhysicalKey) =>
    setLog((l) => {
      if (!l) return l
      const has = l.physical.includes(key)
      return {
        ...l,
        physical: has
          ? l.physical.filter((k) => k !== key)
          : PHYSICAL_SYMPTOMS.map((p) => p.key).filter((k) => k === key || l.physical.includes(k)),
      }
    })

  const save = async () => {
    if (!log || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const now = new Date()
      await saveLog({
        ...log,
        date,
        loggedAt: now.getTime(),
        backfilled: date !== toISODate(now),
      })
      await onSaved()
    } catch (err) {
      setSaveError(errorMessage(err))
      setSaving(false)
    }
  }

  const footer = (
    <>
      {saveError && (
        <p className="checkin__error" role="alert">
          Couldn't save: {saveError}
        </p>
      )}
      <button
        type="button"
        className="btn btn--primary btn--block checkin__save"
        disabled={!log || saving}
        onClick={save}
      >
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
      </button>
    </>
  )

  return (
    <Modal
      variant="full"
      className="checkin"
      title={checkinTitle(date, today)}
      onClose={blocking ? undefined : onClose}
      footer={footer}
    >
      {blocking && (
        <p className="checkin__intro">
          {date === today ? 'Time for tonight’s check-in.' : 'You missed this day — fill it in to continue.'}{' '}
          Nothing to report? Just tap Save.
        </p>
      )}

      {loadError && (
        <div className="error-state" role="alert">
          <p className="error-state__message">{loadError}</p>
          <button type="button" className="btn btn--secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {!log && !loadError && <p className="loading">Loading…</p>}

      {log && (
        <div className="checkin__form">
          <section className="checkin__section checkin__section--flow">
            <ChoiceGroup
              label="Bleeding"
              variant="chips"
              options={FLOWS}
              value={log.flow}
              onChange={(flow) => update({ flow })}
            />
          </section>

          <section className="checkin__section checkin__section--moods">
            <h3 className="checkin__heading">Mood</h3>
            {MOOD_ITEMS.map((item) => (
              <RatingRow
                key={item.key}
                id={item.key}
                label={item.label}
                value={log.moods[item.key]}
                onChange={(r) => setLog((l) => (l ? { ...l, moods: { ...l.moods, [item.key]: r } } : l))}
              />
            ))}
          </section>

          <section className="checkin__section checkin__section--physical">
            <h3 className="checkin__heading">Body</h3>
            <div className="chips chips--wrap">
              {PHYSICAL_SYMPTOMS.map((s) => (
                <ToggleChip
                  key={s.key}
                  label={s.label}
                  on={log.physical.includes(s.key)}
                  onToggle={() => togglePhysical(s.key)}
                />
              ))}
            </div>
          </section>

          <section className="checkin__section checkin__section--general">
            <ChoiceGroup
              label="Sleep"
              variant="segmented"
              options={SLEEPS}
              value={log.sleep}
              onChange={(sleep) => update({ sleep })}
            />
            <ChoiceGroup
              label="Energy"
              variant="segmented"
              options={ENERGIES}
              value={log.energy}
              onChange={(energy) => update({ energy })}
            />
            <ChoiceGroup
              label="Cravings"
              variant="segmented"
              options={CRAVINGS}
              value={log.cravings}
              onChange={(cravings) => update({ cravings })}
            />
          </section>
        </div>
      )}
    </Modal>
  )
}
