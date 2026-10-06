import { useEffect, useId, useRef } from 'react'
import { ALARM_COPY, runDoneShortcut } from '../../core/reminders'
import type { ISODate } from '../../types'
import { Window } from './Window'

/**
 * After a check-in is saved (`app.alarmPrompt`): a little hot-pink pop-up window docked just
 * above the taskbar, offering to tell the phone. Not modal: no backdrop, nothing is inert, and
 * focus moves here once (so VoiceOver reads it) without being trapped. Escape dismisses.
 */
export function AlarmPrompt({ date, onDismiss }: { date: ISODate; onDismiss: () => void }) {
  const textId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={ref}
      className="alarm-prompt"
      role="dialog"
      aria-modal="false"
      aria-labelledby={textId}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDismiss()
      }}
    >
      <Window as="div" tone="hot" icon="check" title="phase_done.exe" className="alarm-prompt__win" bodyClassName="alarm-prompt__body">
        <p id={textId} className="alarm-prompt__text">
          {ALARM_COPY.prompt}
        </p>
        <div className="alarm-prompt__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              runDoneShortcut(date)
              onDismiss()
            }}
          >
            {ALARM_COPY.confirm}
          </button>
          <button type="button" className="btn btn--secondary" onClick={onDismiss}>
            {ALARM_COPY.notNow}
          </button>
        </div>
      </Window>
    </div>
  )
}
