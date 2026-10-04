import { useId } from 'react'
import type { Rating } from '../../types'
import { RATING_LABELS } from '../../types'
import { capitalize } from '../../core/format'

const RATINGS: Rating[] = [1, 2, 3, 4, 5, 6]

/** Single-choice row of buttons (chips or a segmented control). */
export function ChoiceGroup<T extends string>(props: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  variant: 'chips' | 'segmented'
}) {
  const { label, options, value, onChange, variant } = props
  const labelId = useId()
  return (
    <div className={`field field--${variant}`}>
      <span className="field__label" id={labelId}>
        {label}
      </span>
      <div className={variant} role="group" aria-labelledby={labelId}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`${variant === 'chips' ? 'chip' : 'segment'}${opt === value ? ' is-selected' : ''}`}
            aria-pressed={opt === value}
            onClick={() => onChange(opt)}
          >
            {capitalize(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** On/off chip for multi-select lists. */
export function ToggleChip(props: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`chip chip--toggle${props.on ? ' is-selected' : ''}`}
      aria-pressed={props.on}
      onClick={props.onToggle}
    >
      {props.label}
    </button>
  )
}

/** Badge text for a mood that this entry didn't rate. */
const NOT_RATED = 'Not rated'

/** One mood item: six tappable segments, 1 = not at all … 6 = extreme. `null` = not rated yet. */
export function RatingRow(props: {
  id: string
  label: string
  value: Rating | null
  onChange: (value: Rating) => void
}) {
  const { id, label, value, onChange } = props
  return (
    <div className={`rating rating--${value ?? 'none'}`}>
      <div className="rating__head">
        <span className="rating__label" id={`rating-${id}`}>
          {label}
        </span>
        <span className="rating__value" aria-live="polite">
          {value === null ? NOT_RATED : RATING_LABELS[value]}
        </span>
      </div>
      <div className="rating__scale" role="group" aria-labelledby={`rating-${id}`}>
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className={`rating__dot${r === value ? ' is-selected' : ''}${value !== null && r <= value ? ' is-filled' : ''}`}
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

/** One mood item at the basic level: Not at all / Somewhat / A lot as a segmented control. */
export function BasicRatingRow(props: {
  id: string
  label: string
  options: readonly { value: Rating; label: string }[]
  value: Rating | null
  onChange: (value: Rating) => void
}) {
  const { id, label, options, value, onChange } = props
  return (
    <div className={`rating rating--basic rating--${value ?? 'none'}`}>
      <span className="rating__label" id={`rating-${id}`}>
        {label}
      </span>
      <div className="segmented" role="group" aria-labelledby={`rating-${id}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`segment${o.value === value ? ' is-selected' : ''}`}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
