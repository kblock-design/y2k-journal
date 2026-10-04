import { useId } from 'react'
import type { ReactNode } from 'react'
import { capitalize } from '../../core/format'
import { checkinTitle, CRAVINGS, ENERGIES, FLOWS, RATINGS, SLEEPS, useCheckinForm } from '../../core/useCheckinForm'
import { useDialog } from '../../core/useDialog'
import type { CheckinMoodItem } from '../../core/useCheckinForm'
import type { ISODate, MoodTracking, Rating } from '../../types'
import { PHYSICAL_SYMPTOMS, RATING_LABELS } from '../../types'
import { Icon } from './icons'
import { Kicker } from './ui'

interface Props {
  date: ISODate
  today: ISODate
  /** Required check-in: no close control, no Escape, no backdrop dismiss. */
  blocking: boolean
  /** settings.moodTracking: which moods the form asks, and on which scale. */
  moodTracking: MoodTracking
  onClose: () => void
  onSaved: () => Promise<void>
}

/** The nightly check-in: a tall sheet of dense sections and a sticky glossy Save. */
export function CheckinSheet({ date, today, blocking, moodTracking, onClose, onSaved }: Props) {
  const f = useCheckinForm(date, onSaved, moodTracking)
  return (
    <SheetFrame
      title={checkinTitle(date, today)}
      kicker={f.isEdit ? 'Edit check-in' : 'Check-in'}
      onClose={blocking ? undefined : onClose}
      footer={
        <>
          {f.saveError && (
            <p className="gl-sheet__error" role="alert">
              Couldn’t save: {f.saveError}
            </p>
          )}
          <button type="button" className="gl-gel gl-gel--block" disabled={!f.canSave} onClick={() => void f.save()}>
            {f.saving ? 'Saving…' : f.isEdit ? 'Save changes' : 'Save'}
          </button>
        </>
      }
    >
      {blocking && (
        <p className="gl-note">
          <Icon name="clock" size={20} />
          <span>
            {date === today ? 'Time for tonight’s check-in.' : 'You missed this day. Fill it in to carry on.'} Nothing to
            report? Just tap Save.
          </span>
        </p>
      )}

      {f.loadError && (
        <div className="gl-inline-error" role="alert">
          <p>Couldn’t open this day: {f.loadError}</p>
          <button type="button" className="gl-btn gl-btn--chrome gl-btn--sm" onClick={f.retryLoad}>
            Try again
          </button>
        </div>
      )}

      {!f.log && !f.loadError && (
        <p className="gl-loading-line" role="status">
          Loading…
        </p>
      )}

      {f.log && (
        <div className="gl-form">
          {f.previous && (
            <button type="button" className="gl-btn gl-btn--chrome gl-btn--block" onClick={f.copyPrevious}>
              <Icon name="copy" size={20} />
              Same as the day before
            </button>
          )}

          <Section title="Bleeding">
            {(labelId) => (
              <div className="gl-chips gl-chips--fill" role="group" aria-labelledby={labelId}>
                {FLOWS.map((o) => (
                  <ChoiceChip key={o} on={o === f.log!.flow} onClick={() => f.update({ flow: o })}>
                    {capitalize(o)}
                  </ChoiceChip>
                ))}
              </div>
            )}
          </Section>

          {f.moodItems.length > 0 && (
            <Section title="Mood" hint={f.moodTracking === 'basic' ? undefined : '1 not at all · 6 extreme'}>
              {() => (
                <div className="gl-rates">
                  {f.moodItems.map((m) =>
                    m.scale === 'basic' ? (
                      <BasicRow key={m.key} item={m} />
                    ) : (
                      <RatingRow key={m.key} label={m.label} value={m.value} onChange={m.set} />
                    ),
                  )}
                </div>
              )}
            </Section>
          )}

          <Section title="Body">
            {(labelId) => (
              <div className="gl-chips" role="group" aria-labelledby={labelId}>
                {PHYSICAL_SYMPTOMS.map((s) => {
                  const on = f.log!.physical.includes(s.key)
                  return (
                    <ChoiceChip key={s.key} on={on} onClick={() => f.togglePhysical(s.key)}>
                      {on && <Icon name="check" size={16} />}
                      {s.label}
                    </ChoiceChip>
                  )
                })}
              </div>
            )}
          </Section>

          <Section title="Sleep, energy and cravings">
            {() => (
              <div className="gl-segrows">
                <Segmented label="Sleep" options={SLEEPS} value={f.log!.sleep} onChange={(sleep) => f.update({ sleep })} />
                <Segmented label="Energy" options={ENERGIES} value={f.log!.energy} onChange={(energy) => f.update({ energy })} />
                <Segmented label="Cravings" options={CRAVINGS} value={f.log!.cravings} onChange={(cravings) => f.update({ cravings })} />
              </div>
            )}
          </Section>
        </div>
      )}
    </SheetFrame>
  )
}

/**
 * Sheet chrome shared by the check-in and its error fallback: dimmed backdrop, rounded sheet,
 * header with a Silkscreen kicker, the title and (only when closable) a round close button.
 */
export function SheetFrame({
  title,
  kicker,
  onClose,
  footer,
  children,
}: {
  title: string
  kicker?: string
  onClose?: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  const { titleId, panelRef } = useDialog(onClose)
  return (
    <div
      className={`gl-sheet-layer${onClose ? '' : ' is-blocking'}`}
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={panelRef} className="gl-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="gl-sheet__head">
          <div className="gl-sheet__titles">
            {kicker && <Kicker>{kicker}</Kicker>}
            <h2 id={titleId} className="gl-sheet__title">
              {title}
            </h2>
          </div>
          {onClose && (
            <button type="button" className="gl-iconbtn" aria-label="Close" onClick={onClose}>
              <Icon name="close" size={22} />
            </button>
          )}
        </header>
        <div className="gl-sheet__body">{children}</div>
        {footer && <footer className="gl-sheet__foot">{footer}</footer>}
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: (labelId: string) => ReactNode }) {
  const id = useId()
  return (
    <section className="gl-formcard" aria-labelledby={id}>
      <div className="gl-formcard__head">
        <h3 id={id} className="gl-formcard__title">
          {title}
        </h3>
        {hint && <span className="gl-formcard__hint">{hint}</span>}
      </div>
      {children(id)}
    </section>
  )
}

function ChoiceChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`gl-chip-btn${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

function Segmented<T extends string>(props: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div className="gl-segrow">
      <span id={id} className="gl-segrow__label">
        {props.label}
      </span>
      <div className="gl-seg" role="group" aria-labelledby={id}>
        {props.options.map((o) => (
          <button
            key={o}
            type="button"
            className={`gl-seg__opt${o === props.value ? ' is-on' : ''}`}
            aria-pressed={o === props.value}
            onClick={() => props.onChange(o)}
          >
            {o === 'ok' ? 'OK' : capitalize(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** One mood item at the basic level: the label over a recessed Not at all / Somewhat / A lot switch. */
function BasicRow({ item }: { item: CheckinMoodItem }) {
  const id = useId()
  return (
    <div className="gl-rate gl-rate--basic">
      <div className="gl-rate__head">
        <span id={id} className="gl-rate__label">
          {item.label}
        </span>
      </div>
      <div className="gl-seg" role="group" aria-labelledby={id}>
        {item.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`gl-seg__opt${o.value === item.value ? ' is-on' : ''}`}
            aria-pressed={o.value === item.value}
            onClick={() => item.set(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * One mood item: six keys, lit pink up to the rating; the chosen key is a hot-pink gel.
 * `null` = not rated in this entry (nothing lit).
 */
function RatingRow({ label, value, onChange }: { label: string; value: Rating | null; onChange: (r: Rating) => void }) {
  const id = useId()
  return (
    <div className="gl-rate">
      <div className="gl-rate__head">
        <span id={id} className="gl-rate__label">
          {label}
        </span>
        <span className="gl-rate__value">{value === null ? 'Not rated' : RATING_LABELS[value]}</span>
      </div>
      <div className="gl-rate__scale" role="group" aria-labelledby={id}>
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className={`gl-rate__key${value !== null && r < value ? ' is-lit' : ''}${r === value ? ' is-on' : ''}`}
            aria-pressed={r === value}
            aria-label={`${r} – ${RATING_LABELS[r]}`}
            onClick={() => onChange(r)}
          >
            <span aria-hidden="true">{r}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
