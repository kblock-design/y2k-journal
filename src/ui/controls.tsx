import { useId } from 'react'
import type { Rating } from '../types'
import { RATING_LABELS } from '../types'
import { capitalize } from './format'

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

/** One mood item: six tappable segments, 1 = not at all … 6 = extreme. */
export function RatingRow(props: {
  id: string
  label: string
  value: Rating
  onChange: (value: Rating) => void
}) {
  const { id, label, value, onChange } = props
  return (
    <div className={`rating rating--${value}`}>
      <div className="rating__head">
        <span className="rating__label" id={`rating-${id}`}>
          {label}
        </span>
        <span className="rating__value" aria-live="polite">
          {RATING_LABELS[value]}
        </span>
      </div>
      <div className="rating__scale" role="group" aria-labelledby={`rating-${id}`}>
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className={`rating__dot${r === value ? ' is-selected' : ''}${r <= value ? ' is-filled' : ''}`}
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
