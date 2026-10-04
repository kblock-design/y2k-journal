import { checkinTitle, CRAVINGS, ENERGIES, FLOWS, SLEEPS, useCheckinForm } from '../../core/useCheckinForm'
import type { ISODate, MoodTracking } from '../../types'
import { PHYSICAL_SYMPTOMS } from '../../types'
import { BasicRatingRow, ChoiceGroup, RatingRow, ToggleChip } from './controls'
import { Modal } from './Modal'
import { PixelIcon } from './PixelIcon'
import './checkin.css'

interface Props {
  date: ISODate
  today: ISODate
  /** Blocking check-ins cannot be closed until saved. */
  blocking: boolean
  /** settings.moodTracking: which moods the form asks, and on which scale. */
  moodTracking: MoodTracking
  onClose: () => void
  /** Called after a successful save; the modal stays in "saving" until it resolves. */
  onSaved: () => Promise<void>
}

export function CheckinModal({ date, today, blocking, moodTracking, onClose, onSaved }: Props) {
  const { log, previous, isEdit, loadError, retryLoad, update, moodItems, togglePhysical, copyPrevious, saving, saveError, save } =
    useCheckinForm(date, onSaved, moodTracking)

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
          <button type="button" className="btn btn--secondary" onClick={retryLoad}>
            Try again
          </button>
        </div>
      )}

      {!log && !loadError && <p className="loading">Loading…</p>}

      {log && (
        <div className="checkin__form">
          {previous && (
            <button type="button" className="btn btn--secondary checkin__copy" onClick={copyPrevious}>
              Same as the day before
            </button>
          )}
          <section className="checkin__section checkin__section--flow">
            <ChoiceGroup
              label="Bleeding"
              variant="chips"
              options={FLOWS}
              value={log.flow}
              onChange={(flow) => update({ flow })}
            />
          </section>

          {moodItems.length > 0 && (
            <section className="checkin__section checkin__section--moods">
              <h3 className="checkin__heading">
                <PixelIcon name="heart" className="checkin__heading-icon" />
                Mood
              </h3>
              {moodItems.map((item) =>
                item.scale === 'basic' ? (
                  <BasicRatingRow
                    key={item.key}
                    id={item.key}
                    label={item.label}
                    options={item.options}
                    value={item.value}
                    onChange={item.set}
                  />
                ) : (
                  <RatingRow key={item.key} id={item.key} label={item.label} value={item.value} onChange={item.set} />
                ),
              )}
            </section>
          )}

          <section className="checkin__section checkin__section--physical">
            <h3 className="checkin__heading">
              <PixelIcon name="star" className="checkin__heading-icon" />
              Body
            </h3>
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
