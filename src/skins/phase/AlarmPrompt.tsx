import { useEffect, useId, useRef } from 'react'
import { ALARM_COPY, runDoneShortcut } from '../../core/reminders'
import type { ISODate } from '../../types'
import { IconChip } from './ui'

/**
 * After a check-in is saved (`app.alarmPrompt`): a small frosted card floating just above the
 * nav, offering to tell the phone. Not modal: the page stays usable, nothing is inert, and
 * focus moves here once (so VoiceOver reads it) without being trapped. Escape dismisses.
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
      className="ph-alarm"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDismiss()
      }}
    >
      <div className="ph-alarm__panel">
        <IconChip icon="check" tone="green" />
        <p id={titleId} className="ph-alarm__text">
          {ALARM_COPY.prompt}
        </p>
        <div className="ph-alarm__actions">
          <button
            type="button"
            className="ph-btn ph-btn--primary ph-btn--sm"
            onClick={() => {
              runDoneShortcut(date)
              onDismiss()
            }}
          >
            {ALARM_COPY.confirm}
          </button>
          <button type="button" className="ph-btn ph-btn--outline ph-btn--sm" onClick={onDismiss}>
            {ALARM_COPY.notNow}
          </button>
        </div>
      </div>
    </div>
  )
}
