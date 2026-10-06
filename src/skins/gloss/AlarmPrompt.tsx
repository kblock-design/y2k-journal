import { useEffect, useId, useRef } from 'react'
import { ALARM_COPY, runDoneShortcut } from '../../core/reminders'
import type { ISODate } from '../../types'
import { Icon } from './icons'

/**
 * After a check-in is saved (`app.alarmPrompt`): a frosted bar floating just above the dock,
 * offering to tell the phone. Not modal: the page stays usable, nothing is inert, and focus
 * moves here once (so VoiceOver reads it) without being trapped. Escape dismisses.
 */
export function AlarmPrompt({ date, onDismiss }: { date: ISODate; onDismiss: () => void }) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={ref}
      className="gl-alarm"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDismiss()
      }}
    >
      <div className="gl-alarm__inner">
        <span className="gl-alarm__icon" aria-hidden="true">
          <Icon name="check" size={20} />
        </span>
        <p id={titleId} className="gl-alarm__text">
          {ALARM_COPY.prompt}
        </p>
        <div className="gl-alarm__actions">
          <button
            type="button"
            className="gl-gel gl-gel--sm"
            onClick={() => {
              runDoneShortcut(date)
              onDismiss()
            }}
          >
            {ALARM_COPY.confirm}
          </button>
          <button type="button" className="gl-btn gl-btn--chrome gl-btn--sm" onClick={onDismiss}>
            {ALARM_COPY.notNow}
          </button>
        </div>
      </div>
    </div>
  )
}
