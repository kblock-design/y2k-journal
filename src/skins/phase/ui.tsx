import { useId } from 'react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../core/format'
import { Icon } from './icons'
import type { IconName } from './icons'

/** The in-app wordmark: a tiny four-colour ring and "Phase". */
export function Wordmark({ as: Tag = 'p' }: { as?: 'p' | 'h1' }) {
  return (
    <Tag className="ph-wordmark">
      <svg className="ph-wordmark__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M18.98 4.89A11.5 11.5 0 0 1 27.11 13.02" className="ph-wm ph-wm--pink" />
        <path d="M27.11 18.98A11.5 11.5 0 0 1 18.98 27.11" className="ph-wm ph-wm--blue" />
        <path d="M13.02 27.11A11.5 11.5 0 0 1 4.89 18.98" className="ph-wm ph-wm--yellow" />
        <path d="M4.89 13.02A11.5 11.5 0 0 1 13.02 4.89" className="ph-wm ph-wm--green" />
      </svg>
      <span>Phase</span>
    </Tag>
  )
}

/** Small round pastel chip holding an icon (list rows, bars, headings). */
export function IconChip({ icon, tone = 'grey', size = 'md' }: { icon: IconName; tone?: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`ph-chipicon ph-chipicon--${tone} ph-chipicon--${size}`} aria-hidden="true">
      <Icon name={icon} size={size === 'sm' ? 16 : 20} />
    </span>
  )
}

/** A card's fallback after a render error: what broke and a retry. */
export function SectionError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <div className="ph-card ph-error" role="alert">
      <IconChip icon="alert" tone="pink" />
      <div className="ph-error__body">
        <p className="ph-error__title">{title}</p>
        <p className="ph-error__msg">{errorMessage(error)}</p>
        <button type="button" className="ph-btn ph-btn--outline ph-btn--sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  )
}

/** Whole-page message (load failure, crash) with actions. */
export function PageMessage({
  title,
  message,
  children,
}: {
  title: string
  message?: string
  children?: ReactNode
}) {
  const id = useId()
  return (
    <div className="ph-page-msg" role="alert" aria-labelledby={id}>
      <Wordmark />
      <div className="ph-card ph-page-msg__card">
        <h1 id={id} className="ph-page-msg__title">
          {title}
        </h1>
        {message && <p className="ph-page-msg__text">{message}</p>}
        <p className="ph-page-msg__text">Your entries are safe on this phone.</p>
        <div className="ph-page-msg__actions">{children}</div>
      </div>
    </div>
  )
}

/** Status line shown under a group of controls. Always mounted so screen readers catch updates. */
export function StatusLine({ status }: { status: { kind: 'ok' | 'error'; text: string } | null }) {
  return (
    <p className={`ph-status${status ? ` ph-status--${status.kind}` : ''}`} role="status">
      {status && (
        <>
          <Icon name={status.kind === 'ok' ? 'check' : 'alert'} size={16} />
          <span>{status.text}</span>
        </>
      )}
    </p>
  )
}
