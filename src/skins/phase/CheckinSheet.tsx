import { useId } from 'react'
import type { ReactNode } from 'react'
import { capitalize } from '../../core/format'
import { checkinTitle, CRAVINGS, ENERGIES, FLOWS, RATINGS, SLEEPS, useCheckinForm } from '../../core/useCheckinForm'
import { useDialog } from '../../core/useDialog'
import type { CheckinMoodItem } from '../../core/useCheckinForm'
import type { ISODate, MoodTracking, Rating } from '../../types'
import { PHYSICAL_SYMPTOMS, RATING_LABELS } from '../../types'
import { Icon } from './icons'
import type { IconName } from './icons'
import { IconChip } from './ui'

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

/** The nightly check-in as a tall sheet: dense rounded sections and a frosted, sticky Save bar. */
export function CheckinSheet({ date, today, blocking, moodTracking, onClose, onSaved }: Props) {
  const f = useCheckinForm(date, onSaved, moodTracking)
  const close = blocking ? undefined : onClose
  return (
    <SheetFrame
      title={checkinTitle(date, today)}
      kicker={f.isEdit ? 'Edit check-in' : 'Check-in'}
      onClose={close}
      footer={
        <>
          {f.saveError && (
            <p className="ph-sheet__error" role="alert">
              Couldn’t save: {f.saveError}
            </p>
          )}
          <button
            type="button"
            className="ph-btn ph-btn--primary ph-btn--block"
            disabled={!f.canSave}
            onClick={() => void f.save()}
          >
            {f.saving ? 'Saving…' : f.isEdit ? 'Save changes' : 'Save'}
          </button>
        </>
      }
    >
      {blocking && (
        <p className="ph-note">
          <Icon name="clock" size={20} />
          <span>
            {date === today
              ? 'Time for tonight’s check-in.'
              : 'You missed this day. Fill it in to carry on.'}{' '}
            Nothing to report? Just tap Save.
          </span>
        </p>
      )}

      {f.loadError && (
        <div className="ph-inline-error" role="alert">
          <p>Couldn’t open this day: {f.loadError}</p>
          <button type="button" className="ph-btn ph-btn--outline ph-btn--sm" onClick={f.retryLoad}>
            Try again
          </button>
        </div>
      )}

      {!f.log && !f.loadError && (
        <p className="ph-loading-line" role="status">
          Loading…
        </p>
      )}

      {f.log && (
        <div className="ph-form">
          {f.previous && (
            <button type="button" className="ph-btn ph-btn--soft ph-btn--block ph-form__copy" onClick={f.copyPrevious}>
              <Icon name="copy" size={20} />
              Same as the day before
            </button>
          )}

          <FormCard icon="drop" tone="pink" title="Bleeding">
            {(labelId) => (
              <Choices labelId={labelId} options={FLOWS} value={f.log!.flow} onChange={(flow) => f.update({ flow })} wrap />
            )}
          </FormCard>

          {f.moodItems.length > 0 && (
            <FormCard
              icon="heart"
              tone="blue"
              title="Mood"
              hint={f.moodTracking === 'basic' ? undefined : '1 not at all · 6 extreme'}
            >
              {() =>
                f.moodItems.map((m) =>
                  m.scale === 'basic' ? (
                    <BasicRow key={m.key} item={m} />
                  ) : (
                    <RatingRow key={m.key} label={m.label} value={m.value} onChange={m.set} />
                  ),
                )
              }
            </FormCard>
          )}

          <FormCard icon="pulse" tone="yellow" title="Body">
            {(labelId) => (
              <div className="ph-chips" role="group" aria-labelledby={labelId}>
                {PHYSICAL_SYMPTOMS.map((s) => {
                  const on = f.log!.physical.includes(s.key)
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`ph-chip-btn${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => f.togglePhysical(s.key)}
                    >
                      {on && <Icon name="check" size={16} />}
                      {s.label}
                    </button>
                  )
                })}
              </div>
            )}
          </FormCard>

          <FormCard icon="moon" tone="green" title="Sleep, energy and cravings">
            {() => (
              <>
                <Segmented label="Sleep" options={SLEEPS} value={f.log!.sleep} onChange={(sleep) => f.update({ sleep })} />
                <Segmented label="Energy" options={ENERGIES} value={f.log!.energy} onChange={(energy) => f.update({ energy })} />
                <Segmented
                  label="Cravings"
                  options={CRAVINGS}
                  value={f.log!.cravings}
                  onChange={(cravings) => f.update({ cravings })}
                />
              </>
            )}
          </FormCard>
        </div>
      )}
    </SheetFrame>
  )
}

/**
 * Sheet chrome shared by the check-in and its error fallback: dimmed frosted backdrop,
 * rounded sheet, header with the title and (when closable) a round close button.
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
      className={`ph-sheet-layer${onClose ? '' : ' is-blocking'}`}
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={panelRef} className="ph-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="ph-sheet__head">
          <div className="ph-sheet__titles">
            {kicker && <p className="ph-kicker">{kicker}</p>}
            <h2 id={titleId} className="ph-sheet__title">
              {title}
            </h2>
          </div>
          {onClose && (
            <button type="button" className="ph-iconbtn" aria-label="Close" onClick={onClose}>
              <Icon name="close" size={22} />
            </button>
          )}
        </header>
        <div className="ph-sheet__body">{children}</div>
        {footer && <footer className="ph-sheet__foot">{footer}</footer>}
      </div>
    </div>
  )
}

function FormCard({
  icon,
  tone,
  title,
  hint,
  children,
}: {
  icon: IconName
  tone: string
  title: string
  hint?: string
  children: (labelId: string) => ReactNode
}) {
  const id = useId()
  return (
    <section className="ph-formcard" aria-labelledby={id}>
      <div className="ph-formcard__head">
        <IconChip icon={icon} tone={tone} size="sm" />
        <h3 id={id} className="ph-formcard__title">
          {title}
        </h3>
        {hint && <span className="ph-formcard__hint">{hint}</span>}
      </div>
      {children(id)}
    </section>
  )
}

function Choices<T extends string>(props: {
  labelId: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  wrap?: boolean
}) {
  return (
    <div className={`ph-chips${props.wrap ? ' ph-chips--fill' : ''}`} role="group" aria-labelledby={props.labelId}>
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          className={`ph-chip-btn${o === props.value ? ' is-on' : ''}`}
          aria-pressed={o === props.value}
          onClick={() => props.onChange(o)}
        >
          {capitalize(o)}
        </button>
      ))}
    </div>
  )
}

function Segmented<T extends string>(props: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div className="ph-seg-row">
      <span id={id} className="ph-seg-row__label">
        {props.label}
      </span>
      <div className="ph-seg" role="group" aria-labelledby={id}>
        {props.options.map((o) => (
          <button
            key={o}
            type="button"
            className={`ph-seg__opt${o === props.value ? ' is-on' : ''}`}
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

/** One mood item at the basic level: the label, then Not at all / Somewhat / A lot as a segmented control. */
function BasicRow({ item }: { item: CheckinMoodItem }) {
  const id = useId()
  return (
    <div className="ph-rate ph-rate--basic">
      <div className="ph-rate__head">
        <span id={id} className="ph-rate__label">
          {item.label}
        </span>
      </div>
      <div className="ph-seg" role="group" aria-labelledby={id}>
        {item.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`ph-seg__opt${o.value === item.value ? ' is-on' : ''}`}
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
 * One mood item: six rounded segments, filled up to the chosen rating, the chosen one in black.
 * `null` = not rated in this entry (nothing filled).
 */
function RatingRow({ label, value, onChange }: { label: string; value: Rating | null; onChange: (r: Rating) => void }) {
  const id = useId()
  return (
    <div className="ph-rate">
      <div className="ph-rate__head">
        <span id={id} className="ph-rate__label">
          {label}
        </span>
        <span className="ph-rate__value">{value === null ? 'Not rated' : RATING_LABELS[value]}</span>
      </div>
      <div className="ph-rate__scale" role="group" aria-labelledby={id}>
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className={`ph-rate__seg${value !== null && r < value ? ' is-filled' : ''}${r === value ? ' is-on' : ''}`}
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
